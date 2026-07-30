import { Injectable, NestMiddleware, BadRequestException, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { tenantStorage } from '../tenant-storage';
import { Company } from '../../modules/companies/entities/company.entity';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // 1. Intentar leer el encabezado que inyecta Nginx (Prioridad absoluta)
    const rawTenant = req.headers['x-tenant-id'] as string;
    let tenantId = rawTenant;

    // 2. Extracción desde el host del navegador si Nginx no envió el encabezado
    if (!tenantId || tenantId === 'public' || tenantId === 'undefined') {
      const host = req.headers.host || ''; 
      
      // Si tiene el dominio de producción: Buscamos el subdominio de forma estricta
      if (host.includes('namexportal.com')) {
        const parts = host.split('.');
        if (parts.length > 2) {
          tenantId = parts[0]; // Captura "empresademo" o "empresa_a"
        }
      } 
      // Si es desarrollo local en tu PC
      else if (host.includes('localhost:3000') || host.includes('127.0.0.1:3000')) {
        tenantId = 'empresademo'; 
      }
    }

    // 3. Sanitización estándar
    let finalTenant = (tenantId || 'public').replace(/-/g, '_').toLowerCase();

    if (finalTenant === 'www') {
      finalTenant = 'public';
    }

    if (!/^[a-z0-9_]+$/.test(finalTenant)) {
      throw new BadRequestException('Identificador de empresa no válido.');
    }

    // 4. Validación contra la tabla maestra de clientes
    if (finalTenant !== 'public') {
      try {
        const companyRepository = this.dataSource.getRepository(Company);
        const company = await companyRepository.findOne({
          where: { tenantId: finalTenant }
        });

        // Si la empresa no existe en la base de datos central
        if (!company) {
          throw new UnauthorizedException(`La empresa '${finalTenant}' no está registrada en el sistema.`);
        }

        // Si la empresa existe pero está deshabilitada
        if (!company.isActive) {
          throw new HttpException(
            {
              status: HttpStatus.FORBIDDEN,
              error: 'Acceso Suspendido',
              message: `El acceso para la empresa '${company.name}' ha sido deshabilitado temporalmente. Contacte a soporte.`,
            },
            HttpStatus.FORBIDDEN
          );
        }

        // Medida de seguridad: Usamos el esquema verificado en la BD si existe
        finalTenant = company.schemaName || finalTenant;

      } catch (error) {
        if (error instanceof HttpException) throw error;
        console.error('🚨 Error crítico al validar el inquilino en la tabla maestra:', error);
        throw new HttpException('Error interno al validar los accesos de la empresa.', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    // 5. Cambiar el search_path en Postgres de forma síncrona para esta petición
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.query(`SET search_path TO ${finalTenant}, public;`);
      await queryRunner.release();
    } catch (dbError) {
      console.error(`🚨 Error al conmutar al esquema ${finalTenant}:`, dbError);
      throw new HttpException('No se pudo establecer la conexión con el entorno de la empresa.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 6. Guardar en AsyncLocalStorage y pasar al siguiente paso
    tenantStorage.run(finalTenant, () => {
      next();
    });
  }
}
