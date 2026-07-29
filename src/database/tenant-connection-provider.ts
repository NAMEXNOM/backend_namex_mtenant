import { Provider, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { DataSource, EntityManager } from 'typeorm';
import { tenantStorage } from './tenant-storage';

// 🎯 Este token reemplazará la inyección estática en tus servicios
export const TENANT_MANAGER = 'TENANT_MANAGER';

export const TenantConnectionProvider: Provider = {
  provide: TENANT_MANAGER,
  scope: Scope.REQUEST, // 👈 CRUCIAL: Se crea uno nuevo por cada petición HTTP
  inject: [REQUEST, DataSource],
  useFactory: async (req: Request, dataSource: DataSource): Promise<EntityManager> => {
    // 1. Extraer el esquema activo desde el AsyncLocalStorage
    const tenantId = tenantStorage.getStore() || 'public';
    
    // 2. Crear un QueryRunner exclusivo para esta petición
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    
    // 3. Forzar el camino de búsqueda de Postgres de forma aislada
    await queryRunner.query(`SET search_path TO "${tenantId}", public;`);
    
    // Al finalizar la petición, nos aseguramos de liberar la conexión de vuelta al pool
    req.res?.on('finish', async () => {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    });

    // Retornamos el manager asociado exclusivamente a esta conexión modificada
    return queryRunner.manager;
  },
};
