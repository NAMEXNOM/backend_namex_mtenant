// src/modules/admin/nominas/nominas.service.ts
// src/modules/admin/nominas/nominas.service.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { S3Service } from '../../../shared/aws/s3.service'; // 🟢 Importamos el servicio global de S3
import { UploadNominaDto } from './dto/upload-nomina.dto';
import * as unzipper from 'unzipper';
import * as crypto from 'crypto';

@Injectable()
export class NominasService {
  private readonly logger = new Logger(NominasService.name);

  // 🟢 Inyectamos el S3Service global de infraestructura
  constructor(
    private readonly dataSource: DataSource,
    private readonly s3Service: S3Service,
  ) {}

  async procesarZipEnMemoria(
    zipBuffer: Buffer, 
    tenantIdHeader: string,
    metadata: UploadNominaDto // 🟢 Recibimos los metadatos del periodo enviados por el Admin
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    let esquemaDestino = tenantIdHeader;
    let uuidRealTenant = null;

    try {
      // 1. Validar la empresa en el esquema público y obtener su UUID real
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

      const directory = await unzipper.Open.buffer(zipBuffer);
      const resultados: any[] = [];
      const anioActual = new Date().getFullYear();

      // Estructura en memoria para agrupar archivos por RFC: { "RFC123": { pdf?: Buffer, xml?: Buffer, pdfPath?: string, xmlPath?: string } }
      const rfcGroupedFiles: Record<string, { pdf?: Buffer; xml?: Buffer; pdfPath?: string; xmlPath?: string }> = {};

      // 3. Primer pase: Leer el ZIP completo y agrupar los archivos por RFC en memoria (PDF y XML)
      for (const file of directory.files) {
        if (file.type === 'Directory' || file.path.includes('__MACOSX')) {
          continue;
        }

        const isPdf = file.path.toLowerCase().endsWith('.pdf');
        const isXml = file.path.toLowerCase().endsWith('.xml');

        if (!isPdf && !isXml) {
          continue; // Ignora cualquier archivo que no sea PDF o XML
        }

        const fileName = file.path.split('/').pop() || '';
        const rfcMatch = fileName.match(/^([A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3})/i);

        if (!rfcMatch) {
          resultados.push({
            archivo: file.path,
            rfc: 'No detectado',
            procesado: false,
            motivo: 'Ignorado',
            error: 'El nombre del archivo no inicia con un formato de RFC válido.',
          });
          continue;
        }

        const rfc = rfcMatch[0].toUpperCase();
        const buffer = await file.buffer();

        if (!rfcGroupedFiles[rfc]) {
          rfcGroupedFiles[rfc] = {};
        }

        if (isPdf) {
          rfcGroupedFiles[rfc].pdf = buffer;
          rfcGroupedFiles[rfc].pdfPath = file.path;
        } else {
          rfcGroupedFiles[rfc].xml = buffer;
          rfcGroupedFiles[rfc].xmlPath = file.path;
        }
      }

      // 4. Segundo pase: Procesar, verificar en BD, subir a S3 y guardar registros
      for (const [rfc, archivos] of Object.entries(rfcGroupedFiles)) {
        
        // 🟢 Regla de Negocio: Validar que existan ambos archivos para el empleado
        if (!archivos.pdf || !archivos.xml) {
          resultados.push({
            archivo: archivos.pdfPath || archivos.xmlPath,
            rfc,
            procesado: false,
            motivo: 'Omitido',
            error: `Falta el par complementario del archivo de nómina (se requiere PDF y XML de forma conjunta).`,
          });
          continue;
        }

        try {
          // 5. Buscar estrictamente si el empleado existe bajo el esquema del Tenant
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

          // 6. Subir archivos reales a AWS S3 utilizando la estructura limpia de carpetas
          const folderPath = `tenants/${uuidRealTenant}/nominas/${anioActual}/${metadata.periodo_tipo}/Periodo_${metadata.numero_periodo}/${rfc}`;
          const uniqueId = crypto.randomUUID();
          
          const [urlPdf, urlXml] = await Promise.all([
            this.s3Service.uploadFile(archivos.pdf, folderPath, `${rfc}_${uniqueId}.pdf`, 'application/pdf'),
            this.s3Service.uploadFile(archivos.xml, folderPath, `${rfc}_${uniqueId}.xml`, 'text/xml'),
          ]);

          // Monto neto simulado (Posteriormente se puede extraer del CFDI XML parseado)
          const montoNetoSimulado = 0.00;

          // 7. 🟢 Insertar el recibo en la tabla homologada de empresademo incluyendo los nuevos campos
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

      // 8. Generar el reporte ejecutivo final para el administrador
      return {
        status: 'success',
        resumen: {
          totalArchivosEnZip: directory.files.length,
          aceptados: resultados.filter(r => r.motivo === 'Aceptado').length,
          omitidos: resultados.filter(r => r.motivo === 'Omitido' || r.motivo === 'Ignorado').length,
          errores: resultados.filter(r => r.motivo === 'Error').length,
        },
        detalles: resultados,
      };

    } finally {
      // Liberar la conexión al pool
      await queryRunner.release();
    }
  }
}


/*
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as unzipper from 'unzipper';
import * as crypto from 'crypto';

@Injectable()
export class NominasService {
  private readonly logger = new Logger(NominasService.name);

  constructor(private readonly dataSource: DataSource) {}

  async procesarZipEnMemoria(zipBuffer: Buffer, tenantIdHeader: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    let esquemaDestino = tenantIdHeader;
    let uuidRealTenant = null;

    try {
      // 1. Validar la empresa en el esquema público y obtener su UUID real
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

      const directory = await unzipper.Open.buffer(zipBuffer);
      const resultados: any[] = [];
      const anioActual = new Date().getFullYear();
      const mesActual = new Date().getMonth() + 1;

      for (const file of directory.files) {
        // Filtrar archivos ocultos o carpetas del ZIP
        if (file.type === 'Directory' || file.path.includes('__MACOSX') || !file.path.endsWith('.pdf')) {
          continue;
        }

        const fileName = file.path.split('/').pop() || '';
        const rfcMatch = fileName.match(/^([A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3})/i);

        if (!rfcMatch) {
          resultados.push({
            archivo: file.path,
            rfc: 'No detectado',
            procesado: false,
            motivo: 'Ignorado',
            error: 'El nombre del archivo PDF no inicia con un formato de RFC válido.',
          });
          continue;
        }

        const rfc = rfcMatch[0].toUpperCase();

        try {
          // 3. Buscar estrictamente si el empleado ya existe en la empresa
          const [empleado] = await queryRunner.manager.query(
            `SELECT "userId" FROM users WHERE "userRFC" = $1 LIMIT 1`,
            [rfc]
          );

          // LÓGICA DE CONTROL: Si el empleado NO existe, se omite el archivo de forma segura
          if (!empleado) {
            resultados.push({
              archivo: file.path,
              rfc,
              procesado: false,
              motivo: 'Omitido',
              error: `El empleado con RFC ${rfc} no se encuentra registrado en el sistema.`,
            });
            continue;
          }

          // 4. Ruta de simulación para el almacenamiento S3 (Listo para cuando se configure IAM)
          const s3KeySimulada = `tenants/${uuidRealTenant}/recibos/${anioActual}/${mesActual}/${rfc}_${crypto.randomUUID()}.pdf`;

          // 5. Insertar el recibo únicamente si el usuario fue localizado
          await queryRunner.manager.query(
            `INSERT INTO recibos_nomina (tenant_id, user_id, user_rfc, s3_key, periodo_anio, periodo_mes) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [uuidRealTenant, empleado.userId, rfc, s3KeySimulada, anioActual, mesActual]
          );

          resultados.push({
            archivo: file.path,
            rfc,
            procesado: true,
            motivo: 'Aceptado',
            mensaje: 'Recibo asignado exitosamente al empleado existente.',
          });

        } catch (error: any) {
          this.logger.error(`Error procesando archivo ${file.path}: ${error.message}`);
          resultados.push({ archivo: file.path, rfc, procesado: false, motivo: 'Error', error: error.message });
        }
      }

      // 6. Generar el reporte ejecutivo final para el administrador
      return {
        status: 'success',
        resumen: {
          totalArchivosEnZip: directory.files.length,
          aceptados: resultados.filter(r => r.motivo === 'Aceptado').length,
          omitidos: resultados.filter(r => r.motivo === 'Omitido' || r.motivo === 'Ignorado').length,
          errores: resultados.filter(r => r.motivo === 'Error').length,
        },
        detalles: resultados,
      };

    } finally {
      // Liberar la conexión al pool
      await queryRunner.release();
    }
  }
}
*/