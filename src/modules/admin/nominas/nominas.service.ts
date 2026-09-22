// src/modules/admin/nominas/nominas.service.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { S3Service } from '../../../shared/aws/s3.service';
import { UploadNominaDto } from './dto/upload-nomina.dto';
const AdmZip = require('adm-zip'); 
import * as crypto from 'crypto';

@Injectable()
export class NominasService {
  private readonly logger = new Logger(NominasService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly s3Service: S3Service,
  ) {}

  async procesarZipEnMemoria(zipBuffer: Buffer, tenantIdHeader: string, metadata: UploadNominaDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    let esquemaDestino = tenantIdHeader;
    let uuidRealTenant = null;

    try {
      // 1. Validar la empresa en el esquema público
      const [empresaGlobal] = await queryRunner.manager.query(
        `SELECT id, "schema_name" FROM public.companies WHERE "schema_name" = $1 LIMIT 1`,
        [tenantIdHeader]
      );

      if (!empresaGlobal) {
        throw new UnauthorizedException(`La empresa '${tenantIdHeader}' no está registrada en el sistema global.`);
      }

      uuidRealTenant = empresaGlobal.id;
      esquemaDestino = empresaGlobal.schema_name;

      this.logger.log(`[Multi-Tenant] Empresa válida: ${esquemaDestino} | UUID: ${uuidRealTenant}`);

      // 2. Conmutar al esquema físico de la empresa
      await queryRunner.query(`SET search_path TO ${esquemaDestino}`);

      // Leer el ZIP de forma síncrona en memoria RAM
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();
      
      const resultados: any[] = [];
      const anioActual = new Date().getFullYear();

      // Estructura para agrupar archivos por RFC
      const rfcGroupedFiles: Record<string, { pdf?: Buffer; xml?: Buffer; pdfPath?: string; xmlPath?: string }> = {};

      // 3. Primer pase: Recorrer las entradas del ZIP y agruparlas por RFC
      for (const entry of zipEntries) {
        if (entry.isDirectory || entry.entryName.includes('__MACOSX')) {
          continue;
        }

        const isPdf = entry.entryName.toLowerCase().endsWith('.pdf');
        const isXml = entry.entryName.toLowerCase().endsWith('.xml');

        if (!isPdf && !isXml) continue;

        const fileName = entry.entryName.split('/').pop() || '';

        // DETECTOR INTELIGENTE POR REGEX: Quitando el '^', el patrón rastrea el RFC en cualquier posición
        const rfcMatch = fileName.match(/([A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3})/i);

        if (!rfcMatch) {
          resultados.push({
            archivo: entry.entryName,
            rfc: 'No detectado',
            procesado: false,
            motivo: 'Ignorado',
            error: 'El nombre del archivo no contiene un patrón de RFC válido en ninguna posición.',
          });
          continue;
        }

        // Convertimos a mayúsculas limpias para evitar colisiones en búsquedas SQL
        const rfc = rfcMatch[0].toUpperCase();
        const buffer = entry.getData(); 

        if (!rfcGroupedFiles[rfc]) {
          rfcGroupedFiles[rfc] = {};
        }

        if (isPdf) {
          rfcGroupedFiles[rfc].pdf = buffer;
          rfcGroupedFiles[rfc].pdfPath = entry.entryName;
        } else {
          rfcGroupedFiles[rfc].xml = buffer;
          rfcGroupedFiles[rfc].xmlPath = entry.entryName;
        }
      }

      // 4. Segundo pase: Procesar, subir a S3 y guardar registros con extracción de Fecha de Pago
      for (const [rfc, archivos] of Object.entries(rfcGroupedFiles)) {
        if (!archivos.pdf || !archivos.xml) {
          resultados.push({
            archivo: archivos.pdfPath || archivos.xmlPath,
            rfc,
            procesado: false,
            motivo: 'Omitido',
            error: `Falta el par complementario del archivo de nómina (se requiere PDF y XML conjuntamente).`,
          });
          continue;
        }

        try {
          // 5. Buscar si el empleado existe bajo el esquema del Tenant
          const [empleado] = await queryRunner.manager.query(
            `SELECT "userId" FROM users WHERE "userRFC" = $1 LIMIT 1`,
            [rfc]
          );

          if (!empleado) {
            resultados.push({
              archivo: `${archivos.pdfPath} y ${archivos.xmlPath}`,
              rfc,
              procesado: false,
              motivo: 'Omitido',
              error: `El empleado con RFC ${rfc} no se encuentra registrado en este tenant.`,
            });
            continue;
          }

          // REGLA DE EXTRACCIÓN AUTOMÁTICA DE FECHA DE PAGO DESDE EL XML
          // Convertimos los bytes del buffer del XML a texto plano UTF-8
          const contenidoXmlTexto = archivos.xml.toString('utf8');
          
          // Expresión regular que busca "FechaPago=" seguida de cualquier fecha YYYY-MM-DD
          const patronFechaPago = /FechaPago\s*=\s*["'](\d{4}-\d{2}-\d{2})["']/i;
          const matchFecha = contenidoXmlTexto.match(patronFechaPago);
          
          let fechaPagoFinal: Date;

          if (matchFecha && matchFecha[1]) {
            // 🟢 SOLUCIÓN DE HUSO HORARIO DEFINITIVA: Inyectamos 'T12:00:00' para forzar mediodía local.
            // Esto le da un colchón de 12 horas a JavaScript. Al restar el huso horario de México (GMT-6)
            // el reloj baja a las 06:00 AM del mismo día, impidiendo que el calendario retroceda.
            fechaPagoFinal = new Date(matchFecha[1] + 'T12:00:00');
            this.logger.log(`[NominasService] Fecha de Pago detectada automáticamente en XML para RFC ${rfc}: ${matchFecha[1]}`);
          } else {
            // Fallback de seguridad: Si el XML viniera maltratado, usamos el día de hoy
            fechaPagoFinal = new Date();
            this.logger.warn(`[NominasService] No se encontró el atributo FechaPago en el XML del RFC ${rfc}. Se usará la fecha actual.`);
          }

          // 6. Subir archivos a AWS S3
          const folderPath = `tenants/${uuidRealTenant}/nominas/${anioActual}/${metadata.periodo_tipo}/Periodo_${metadata.numero_periodo}/${rfc}`;
          const uniqueId = crypto.randomUUID();
          
          const s3KeyPdf = `${folderPath}/${rfc}_${uniqueId}.pdf`;
          const s3KeyXml = `${folderPath}/${rfc}_${uniqueId}.xml`;

          await Promise.all([
            this.s3Service.uploadFile(archivos.pdf, folderPath, `${rfc}_${uniqueId}.pdf`, 'application/pdf'),
            this.s3Service.uploadFile(archivos.xml, folderPath, `${rfc}_${uniqueId}.xml`, 'text/xml'),
          ]);

          const montoNetoSimulado = 0.00;

          // 7. Insertar el recibo en la tabla inyectando la fecha extraída del XML
          await queryRunner.manager.query(
            `INSERT INTO recibos_nomina (
              tenant_id, user_id, user_rfc, url_pdf, url_xml, 
              periodo_tipo, numero_periodo, nomina_tipo, monto_neto, fecha_pago
             ) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              uuidRealTenant, 
              empleado.userId, 
              rfc, 
              s3KeyPdf, 
              s3KeyXml, 
              metadata.periodo_tipo, 
              parseInt(metadata.numero_periodo, 10), 
              metadata.nomina_tipo,
              montoNetoSimulado,
              fechaPagoFinal 
            ]
          );

          resultados.push({
            archivo: `${archivos.pdfPath} y ${archivos.xmlPath}`,
            rfc,
            procesado: true,
            motivo: 'Aceptado',
            mensaje: 'Recibo asignado. Fecha de pago extraída del XML exitosamente.',
          });

        } catch (error: any) {
          this.logger.error(`Error procesando nómina para RFC ${rfc}: ${error.message}`);
          resultados.push({ 
            archivo: `${archivos.pdfPath || ''} / ${archivos.xmlPath || ''}`, 
            rfc, 
            procesado: false, 
            motivo: 'Error', 
            error: error.message 
          });
        }
      }

      return {
        status: 'success',
        resumen: {
          totalArchivosEnZip: zipEntries.length,
          aceptados: resultados.filter(r => r.motivo === 'Aceptado').length,
          omitidos: resultados.filter(r => r.motivo === 'Omitido' || r.motivo === 'Ignorado').length,
          errores: resultados.filter(r => r.motivo === 'Error').length,
        },
        detalles: resultados,
      };

    } finally {
      await queryRunner.release();
    }
  }

  async obtenerRecibosPorEmpleado(rfcEmpleado: string, tenantIdHeader: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.query(`SET search_path TO ${tenantIdHeader}`);

      const rfcBusqueda = rfcEmpleado.trim().toUpperCase();

      const recibos = await queryRunner.manager.query(
        `SELECT 
          id, 
          periodo_tipo, 
          numero_periodo, 
          nomina_tipo, 
          fecha_pago, 
          url_pdf, 
          url_xml, 
          monto_neto 
         FROM recibos_nomina 
         WHERE UPPER(TRIM(user_rfc)) = $1 
         ORDER BY fecha_pago DESC`,
        [rfcBusqueda]
      );

      return recibos;
    } finally {
      await queryRunner.release();
    }
  }
}


