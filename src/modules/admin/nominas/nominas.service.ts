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

        // 🟢 DETECTOR INTELIGENTE POR REGEX: Quitando el '^', el patrón rastrea el RFC en cualquier posición
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

      // 4. Segundo pase: Procesar, subir a S3 y guardar registros
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

          // 6. Subir archivos a AWS S3 (Se mantiene guardando solo la llave s3Key limpia)
          const folderPath = `tenants/${uuidRealTenant}/nominas/${anioActual}/${metadata.periodo_tipo}/Periodo_${metadata.numero_periodo}/${rfc}`;
          const uniqueId = crypto.randomUUID();
          
          const s3KeyPdf = `${folderPath}/${rfc}_${uniqueId}.pdf`;
          const s3KeyXml = `${folderPath}/${rfc}_${uniqueId}.xml`;

          await Promise.all([
            this.s3Service.uploadFile(archivos.pdf, folderPath, `${rfc}_${uniqueId}.pdf`, 'application/pdf'),
            this.s3Service.uploadFile(archivos.xml, folderPath, `${rfc}_${uniqueId}.xml`, 'text/xml'),
          ]);

          const montoNetoSimulado = 0.00;

          // 7. Insertar el recibo guardando las llaves relativas
          await queryRunner.manager.query(
            `INSERT INTO recibos_nomina (
              tenant_id, user_id, user_rfc, url_pdf, url_xml, 
              periodo_tipo, numero_periodo, nomina_tipo, monto_neto, fecha_pago
             ) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              uuidRealTenant, 
              empleado.userId, 
              rfc, 
              s3KeyPdf, // 🟢 Guarda la llave limpia para el puente seguro
              s3KeyXml, // 🟢 Guarda la llave limpia para el puente seguro
              metadata.periodo_tipo, 
              parseInt(metadata.numero_periodo, 10), 
              metadata.nomina_tipo,
              montoNetoSimulado
            ]
          );

          resultados.push({
            archivo: `${archivos.pdfPath} y ${archivos.xmlPath}`,
            rfc,
            procesado: true,
            motivo: 'Aceptado',
            mensaje: 'Recibo (PDF y XML) asignado y almacenado exitosamente en S3.',
          });

        } catch (error: any) {
          this.logger.error(`Error procesando nómina para RFC ${rfc}: ${error.message}`);
          resultados.push({ 
            archivo: `${archivos.pdfPath || ''} / ${archivos.xmlPath || ''}`, 
            rfc, 
            processed: false, 
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

      // 🟢 Modificación de coincidencia exacta blindada por si el token viene en minúsculas
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




/*
// src/modules/admin/nominas/nominas.service.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { S3Service } from '../../../shared/aws/s3.service';
import { UploadNominaDto } from './dto/upload-nomina.dto';
const AdmZip = require('adm-zip'); // 🟢 Cambiar por esta línea
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

      // 🟢 Leer el ZIP de forma síncrona en memoria RAM sin usar streams peligrosos
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
        const rfcMatch = fileName.match(/^([A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3})/i);

        if (!rfcMatch) {
          resultados.push({
            archivo: entry.entryName,
            rfc: 'No detectado',
            procesado: false,
            motivo: 'Ignorado',
            error: 'El nombre del archivo no inicia con un formato de RFC válido.',
          });
          continue;
        }

        const rfc = rfcMatch[0].toUpperCase();
        const buffer = entry.getData(); // 🟢 adm-zip extrae los datos de inmediato en la RAM

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

      // 4. Segundo pase: Procesar, subir a S3 y guardar registros
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

          // 6. Subir archivos a AWS S3
          const folderPath = `tenants/${uuidRealTenant}/nominas/${anioActual}/${metadata.periodo_tipo}/Periodo_${metadata.numero_periodo}/${rfc}`;
          const uniqueId = crypto.randomUUID();
          
          const [urlPdf, urlXml] = await Promise.all([
            this.s3Service.uploadFile(archivos.pdf, folderPath, `${rfc}_${uniqueId}.pdf`, 'application/pdf'),
            this.s3Service.uploadFile(archivos.xml, folderPath, `${rfc}_${uniqueId}.xml`, 'text/xml'),
          ]);

          const montoNetoSimulado = 0.00;

          // 7. Insertar el recibo en la tabla homologada
          await queryRunner.manager.query(
            `INSERT INTO recibos_nomina (
              tenant_id, user_id, user_rfc, url_pdf, url_xml, 
              periodo_tipo, numero_periodo, nomina_tipo, monto_neto, fecha_pago
             ) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              uuidRealTenant, 
              empleado.userId, 
              rfc, 
              urlPdf, 
              urlXml, 
              metadata.periodo_tipo, 
              parseInt(metadata.numero_periodo, 10), 
              metadata.nomina_tipo,
              montoNetoSimulado
            ]
          );

          resultados.push({
            archivo: `${archivos.pdfPath} y ${archivos.xmlPath}`,
            rfc,
            procesado: true,
            motivo: 'Aceptado',
            mensaje: 'Recibo (PDF y XML) asignado y almacenado exitosamente en S3.',
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

// Agregar al final de tu nominas.service.ts local:
async obtenerRecibosPorEmpleado(rfcEmpleado: string, tenantIdHeader: string) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // 1. Conmutar en caliente al esquema físico de la empresa (Tenant)
    await queryRunner.query(`SET search_path TO ${tenantIdHeader}`);

    // 2. Traer todos los recibos guardados que coincidan con su RFC
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
       WHERE user_rfc = $1 
       ORDER BY fecha_pago DESC`,
      [rfcEmpleado]
    );

    return recibos;
  } finally {
    // Liberamos la conexión a la base de datos de inmediato por rendimiento
    await queryRunner.release();
  }
}
}
*/