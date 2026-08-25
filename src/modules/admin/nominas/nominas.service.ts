// src/modules/admin/nominas/nominas.service.ts
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
