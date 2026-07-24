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