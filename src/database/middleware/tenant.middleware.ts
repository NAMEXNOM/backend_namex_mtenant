import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks'; // Nativo de Node.js

// contenedor global que exportamos para que TypeORM lo lea después
export const tenantStorage = new AsyncLocalStorage<string>();

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extraer el encabezado inyectado por el Proxy de Nginx
    const rawTenant = req.headers['x-tenant-id'] as string;

    // Si no viene (pruebas locales/IP), cae a 'public' por defecto
    let tenantId = rawTenant || 'public';

    // Sanitización de guiones para Postgres ("empresa-a" -> "empresa_a")
    tenantId = tenantId.replace(/-/g, '_').toLowerCase();

    // Validación estricta de seguridad anti-inyección SQL
    if (!/^[a-z0-9_]+$/.test(tenantId)) {
      throw new BadRequestException('Identificador de empresa no válido.');
    }

    // Ejecutar el hilo de la petición de forma aislada y segura
    tenantStorage.run(tenantId, () => {
      next();
    });
  }
}