import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { tenantStorage } from '../tenant-storage';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // 1. Intentar leer el encabezado de Nginx por si acaso
    const rawTenant = req.headers['x-tenant-id'] as string;
    let tenantId = rawTenant;

    // 2. 🎯 EXTRACCIÓN DIRECTA DESDE EL HOST DEL NAVEGADOR (Solución Definitiva)
    // Si la URL es ://namexportal.com, req.headers.host contendrá exactamente esa cadena
    if (!tenantId || tenantId === 'public') {
      const host = req.headers.host || ''; // ej: "://namexportal.com"
      const parts = host.split('.');
      
      // Si tiene subdominio (ej: ://dominio.com), la primera parte es la empresa
      if (parts.length > 2) {
        tenantId = parts[0]; // Captura "empresademo"
      }
    }

    // 3. Sanitización estándar
    let finalTenant = (tenantId || 'public').replace(/-/g, '_').toLowerCase();

    // Si por alguna razón extrae la palabra "www", la mandamos a public
    if (finalTenant === 'www') {
      finalTenant = 'public';
    }

    if (!/^[a-z0-9_]+$/.test(finalTenant)) {
      throw new BadRequestException('Identificador de empresa no válido.');
    }

    // 4. Cambiar el search_path en Postgres de forma síncrona para esta petición
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.query(`SET search_path TO ${finalTenant}, public;`);
      await queryRunner.release();
    } catch (dbError) {
      console.error(`🚨 Error al conmutar al esquema ${finalTenant}:`, dbError);
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