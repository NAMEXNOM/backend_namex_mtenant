// src/modules/admin/nominas/nominas.service.ts
// src/modules/admin/nominas/nominas.service.ts
import { Injectable, Logger, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { S3Service } from '../../../shared/aws/s3.service';
import { UploadNominaDto } from './dto/upload-nomina.dto';
import { RollbackNominaDto } from './dto/rollback-nomina.dto'; // 🔄 Importación del nuevo DTO
import { DeleteObjectsCommand } from '@aws-sdk/client-s3'; // Asegura la purga nativa en AWS
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
          const contenidoXmlTexto = archivos.xml.toString('utf8');
          const patronFechaPago = /FechaPago\s*=\s*["'](\d{4}-\d{2}-\d{2})["']/i;
          const matchFecha = contenidoXmlTexto.match(patronFechaPago);
          
          let fechaPagoFinal: Date;

          if (matchFecha && matchFecha[1]) {
            fechaPagoFinal = new Date(matchFecha[1] + 'T12:00:00');
            this.logger.log(`[NominasService] Fecha de Pago detectada automáticamente en XML para RFC ${rfc}: ${matchFecha[1]}`);
          } else {
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

  // 🔄 CONSULTAR ÚNICAMENTE LA ÚLTIMA SUBIDA MASIVA REALIZADA (POSTGRES REPARADO)
  async listarPeriodosConRecibos(tenantIdHeader: string): Promise<any[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // 1. Validar la empresa en el esquema público
      const [empresaGlobal] = await queryRunner.manager.query(
        `SELECT id, "schema_name" FROM public.companies WHERE "schema_name" = $1 LIMIT 1`,
        [tenantIdHeader]
      );

      if (!empresaGlobal) {
        throw new UnauthorizedException(`La empresa '${tenantIdHeader}' no está registrada.`);
      }

      // 2. Conmutar al esquema del Tenant
      await queryRunner.query(`SET search_path TO ${empresaGlobal.schema_name}`);

      // 3. Query reparada: Seleccionamos el último periodo ordenando por la fecha de pago o inserción descendente
      const queryResult = await queryRunner.manager.query(
        `SELECT periodo_tipo, numero_periodo, nomina_tipo 
         FROM recibos_nomina 
         WHERE tenant_id = $1
         ORDER BY fecha_pago DESC, numero_periodo DESC
         LIMIT 1`, // 🚀 Solo el primer registro (El más reciente de todos)
        [empresaGlobal.id]
      );

      // Si no hay ninguna carga activa, regresamos un arreglo vacío
      if (queryResult.length === 0) return [];

      // 4. Mapear el único registro disponible para el Dropdown
      return queryResult.map((p: any) => {
        const idConcatenado = `${p.periodo_tipo}-${p.numero_periodo}-${p.nomina_tipo}`;
        const nombreVisual = `${p.periodo_tipo} - Periodo ${p.numero_periodo} (${p.nomina_tipo})`;
        return { id: idConcatenado, nombre: nombreVisual };
      });

    } finally {
      await queryRunner.release();
    }
  }



  // 🔄 NUEVO MÉTODO: REVERSIÓN ATÓMICA Y MULTI-TENANT (CORAZÓN DEL REVERSOR)
  async revertirPeriodoMultiTenant(tenantIdHeader: string, metadata: RollbackNominaDto): Promise<{ destroyedCount: number }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const [empresaGlobal] = await queryRunner.manager.query(
        `SELECT id, "schema_name" FROM public.companies WHERE "schema_name" = $1 LIMIT 1`,
        [tenantIdHeader]
      );

      if (!empresaGlobal) {
        throw new UnauthorizedException(`La empresa '${tenantIdHeader}' no existe en el registro global.`);
      }

      const uuidRealTenant = empresaGlobal.id;
      const esquemaDestino = empresaGlobal.schema_name;

      await queryRunner.query(`SET search_path TO ${esquemaDestino}`);

      const numeroPeriodoInt = parseInt(metadata.numero_periodo, 10);
      const recibosAEliminar = await queryRunner.manager.query(
        `SELECT id, url_pdf, url_xml FROM recibos_nomina 
         WHERE tenant_id = $1 
           AND periodo_tipo = $2 
           AND numero_periodo = $3 
           AND nomina_tipo = $4`,
        [uuidRealTenant, metadata.periodo_tipo, numeroPeriodoInt, metadata.nomina_tipo]
      );

      if (recibosAEliminar.length === 0) {
        throw new NotFoundException(
          `No se hallaron recibos cargados para el periodo ${metadata.periodo_tipo} N° ${metadata.numero_periodo} (${metadata.nomina_tipo}) en este tenant.`
        );
      }

      const s3ObjectsToDelete: { Key: string }[] = [];
      for (const recibo of recibosAEliminar) {
        if (recibo.url_pdf) s3ObjectsToDelete.push({ Key: recibo.url_pdf });
        if (recibo.url_xml) s3ObjectsToDelete.push({ Key: recibo.url_xml });
      }



      // 5. Eliminar de forma masiva los registros físicos en la tabla del Tenant
      await queryRunner.manager.query(
        `DELETE FROM recibos_nomina 
         WHERE tenant_id = $1 
           AND periodo_tipo = $2 
           AND numero_periodo = $3 
           AND nomina_tipo = $4`,
        [uuidRealTenant, metadata.periodo_tipo, numeroPeriodoInt, metadata.nomina_tipo]
      );

      // 6. 🚀 PURGA FÍSICA EN AWS S3 COMPACTA Y ULTRA RÁPIDA
      if (s3ObjectsToDelete.length > 0) {
        this.logger.log(`[Rollback S3] Iniciando purga física de ${s3ObjectsToDelete.length} archivos en AWS...`);
        
        const s3ServiceAny = this.s3Service as any;
        const s3ClientReal = s3ServiceAny.s3Client || s3ServiceAny.s3 || s3ServiceAny['_s3Client'];

        if (s3ClientReal && typeof s3ClientReal.send === 'function') {
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: process.env.AWS_S3_BUCKET_NOMINAS || process.env.AWS_BUCKET_NAME || 'tu-bucket-default',
            Delete: {
              Objects: s3ObjectsToDelete,
              Quiet: true // 🚀 ACTIVADO: S3 ya no gasta ancho de banda mandando miles de confirmaciones exitosas
            }
          });
          
          const respuestaS3 = await s3ClientReal.send(deleteCommand);
          
          // Dejamos un log limpio: Solo registrará si AWS reporta algún error real de red o permisos
          if (respuestaS3.Errors && respuestaS3.Errors.length > 0) {
            this.logger.error(`[Auditoría S3] Se presentaron ${respuestaS3.Errors.length} errores durante la purga en AWS.`);
          } else {
            this.logger.log(`[Rollback S3] Purga masiva en bloque finalizada con éxito en los servidores de AWS.`);
          }
        } else {
          this.logger.warn(`[Rollback S3] Cliente nativo no expuesto. Usando métodos del S3Service de la app...`);
          
          const nombreMetodoBorrado = Object.getOwnPropertyNames(Object.getPrototypeOf(this.s3Service))
            .find(m => m.toLowerCase().includes('delete') || m.toLowerCase().includes('remove') || m.toLowerCase().includes('eliminar'));

          if (nombreMetodoBorrado && typeof s3ServiceAny[nombreMetodoBorrado] === 'function') {
            await Promise.all(
              s3ObjectsToDelete.map(obj => s3ServiceAny[nombreMetodoBorrado](obj.Key))
            );
            this.logger.log(`[Rollback S3] Borrado secuencial finalizado usando el método: ${nombreMetodoBorrado}`);
          } else {
            throw new Error('No se localizó el cliente de AWS ni ningún método de borrado válido en el S3Service.');
          }
        }
      }


      // 7. Consolidar la transacción si la BD y S3 respondieron de forma correcta
      await queryRunner.commitTransaction();
      this.logger.log(`[Rollback Exitoso] ${recibosAEliminar.length} recibos eliminados del esquema ${esquemaDestino}.`);

      return { destroyedCount: recibosAEliminar.length };

    } catch (error: any) {
      // Si la base de datos o AWS fallan en red, deshacemos todo el borrado en PostgreSQL
      await queryRunner.rollbackTransaction();
      this.logger.error(`[Rollback Error] Error abortando la reversión masiva: ${error?.message || error}`);
      
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno al ejecutar la purga masiva de nóminas.', error?.message || String(error));
    } finally {
      // Liberar la conexión al pool del sistema
      await queryRunner.release();
    }
  }
}




