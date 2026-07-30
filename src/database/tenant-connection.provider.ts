import { Provider, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { DataSource, EntityManager } from 'typeorm';
import { tenantStorage } from './tenant-storage'; // Ajusta la ruta a tu tenantStorage real

export const TENANT_MANAGER = 'TENANT_MANAGER';

export const TenantConnectionProvider: Provider = {
  provide: TENANT_MANAGER,
  scope: Scope.REQUEST, // 👈 Crucial: Garantiza aislamiento total por petición HTTP
  inject: [REQUEST, DataSource],
  useFactory: async (req: Request, dataSource: DataSource): Promise<EntityManager> => {
    // 1. Obtener el esquema que guardó el middleware en AsyncLocalStorage
    const tenantId = tenantStorage.getStore() || 'public';
    
    // 2. Crear un QueryRunner exclusivo para este canal de datos
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    
    // 3. Forzar el camino de búsqueda de Postgres de forma segura
    await queryRunner.query(`SET search_path TO "${tenantId}", public;`);
    
    // 4. Registrar la liberación automática de la conexión al terminar la respuesta HTTP
    req.res?.on('finish', async () => {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    });

    // Retornamos el mánager asociado exclusivamente a esta petición
    return queryRunner.manager;
  },
};
