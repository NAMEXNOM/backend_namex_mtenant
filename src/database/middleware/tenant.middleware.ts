import { Injectable, NestMiddleware, BadRequestException, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { tenantStorage } from '../tenant-storage';
import { Company } from '../../modules/companies/entities/company.entity'; // 🟢 1. IMPORTA LA ENTIDAD (Ajusta la ruta si es necesario)

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // 1. Intentar leer el encabezado que inyecta Nginx (Máxima prioridad)
    const rawTenant = req.headers['x-tenant-id'] as string;
    let tenantId = rawTenant;

    // 2. EXTRACCIÓN DESDE EL HOST
    if (!tenantId || tenantId === 'public' || tenantId === 'undefined') {
      const host = req.headers.host || ''; 
      
      // 🟢 SI ES EL DOMINIO REAL: Buscamos el subdominio de forma estricta
      if (host.includes('namexportal.com')) {
        const parts = host.split('.');
        if (parts.length > 2) {
          tenantId = parts[0]; // Captura "empresademo", "empresa_a", etc.
        }
      } 
      // 🟢 EN REPOSITORIO LOCAL EN TU PC: Validamos contra el puerto del frontend local (evita colisión con Nginx en AWS)
      else if (host.includes('localhost:3000') || host.includes('127.0.0.1:3000')) {
        tenantId = 'empresa_a'; 
      }
    }

    /*
    // 1. Intentar leer el encabezado de Nginx por si acaso
    const rawTenant = req.headers['x-tenant-id'] as string;
    let tenantId = rawTenant;

    // 2. 🎯 EXTRACCIÓN DIRECTA DESDE EL HOST DEL NAVEGADOR
    if (!tenantId || tenantId === 'public') {
      const host = req.headers.host || ''; 
      const parts = host.split('.');
      
      //if (parts.length > 2) {
      //  tenantId = parts[0]; // Captura "empresademo", "empresa_a", etc.
      //}

      if (parts.length > 2) {
        tenantId = parts[0]; // Captura "empresademo", "empresa_a" en producción
      } else if (host.includes('localhost')) {
        // 🟢 NUEVO: Si estás desarrollando localmente, fuérzalo a 'empresademo' 
        // para que pueda ir a buscar este registro a la base de datos de AWS
        tenantId = 'empresademo'; 
      }
    }*/

    // 3. Sanitización estándar
    let finalTenant = (tenantId || 'public').replace(/-/g, '_').toLowerCase();

    if (finalTenant === 'www') {
      finalTenant = 'public';
    }

    if (!/^[a-z0-9_]+$/.test(finalTenant)) {
      throw new BadRequestException('Identificador de empresa no válido.');
    }

    // 🟢 4. NUEVO: VALIDACIÓN CONTRA LA TABLA MAESTRA DE CLIENTES
    // Si no es el esquema root 'public', validamos que la empresa exista y esté activa
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

        // Si la empresa existe pero está deshabilitada (is_active = false)
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

        // Medida de seguridad extra: Usamos el nombre del esquema verificado en la BD 
        // para mitigar cualquier intento de inyección de nombres de esquemas extraños
        finalTenant = company.schemaName;

      } catch (error) {
        // Si es un error controlado por nosotros (HttpException / UnauthorizedException) lo lanzamos
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

    tenantStorage.run(finalTenant, () => {
      next();
    });
  }
}


/*
import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { tenantStorage } from '../tenant-storage';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  // Inyectamos el DataSource global para tener acceso al pool de conexiones nativo
  constructor(private readonly dataSource: DataSource) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const rawTenant = req.headers['x-tenant-id'] as string;
    let tenantId = rawTenant || 'public';

    tenantId = tenantId.replace(/-/g, '_').toLowerCase();

    if (!/^[a-z0-9_]+$/.test(tenantId)) {
      throw new BadRequestException('Identificador de empresa no válido.');
    }

    // 🚨 ENFOQUE DEFINITIVO: Cambiar el search_path directamente en el cliente Postgres
    // Esto se ejecuta una Sola Vez por cada petición HTTP, eliminando la recursividad infinita
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.query(`SET search_path TO ${tenantId}, public;`);
      await queryRunner.release(); // Liberamos el queryRunner de vuelta al pool
    } catch (dbError) {
      console.error('🚨 Error al setear el esquema de la petición:', dbError);
    }

    tenantStorage.run(tenantId, () => {
      next();
    });
  }
}
*/