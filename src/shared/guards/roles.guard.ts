
// src/shared/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger('RolesGuard-Auditoria');

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const rolesPermitidos = this.reflector.get<string[]>('roles', handler);
    
    const request = context.switchToHttp().getRequest();
    const usuario = request.user;

    // 🕵️‍♂️ LÍNEAS ESPÍA: Esto se imprimirá en los logs de PM2 al presionar el botón de carga
    this.logger.log(`==================================================`);
    this.logger.log(`🤖 ENDPOINT DETECTADO: ${handler.name}`);
    this.logger.log(`🔑 ROLES EXIGIDOS EN EL DECORADOR: ${JSON.stringify(rolesPermitidos)}`);
    this.logger.log(`👤 USUARIO DETECTADO EN REQUEST: ${JSON.stringify(usuario)}`);
    this.logger.log(`==================================================`);

    if (!rolesPermitidos) {
      return true;
    }

    if (!usuario || !usuario.role) {
      throw new ForbiddenException('No tienes un rol válido asignado en tu sesión.');
    }

    const rolUsuarioSuperior = usuario.role.trim().toUpperCase();
    
    const tienePermiso = rolesPermitidos
      .map(role => role.trim().toUpperCase())
      .includes(rolUsuarioSuperior);

    if (!tienePermiso) {
      throw new ForbiddenException('Acceso denegado: Este módulo es exclusivo para Administradores.');
    }

    return true;
  }
}


/*

// src/shared/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.get<string[]>('roles', context.getHandler());
    
    if (!rolesPermitidos) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const usuario = request.user;

    if (!usuario || !usuario.role) {
      throw new ForbiddenException('No tienes un rol válido asignado en tu sesión.');
    }

    // 1. Convertimos el rol del usuario a MAYÚSCULAS limpias (Ej: 'admin' -> 'ADMIN') [1.1]
    const rolUsuarioSuperior = usuario.role.trim().toUpperCase();
    
    // 2. 🟢 LA CORRECCIÓN: Convertimos también toda la lista permitida a MAYÚSCULAS
    // Así, sin importar si en el controlador escribiste 'admin' o 'ADMIN', se comparará como 'ADMIN' [1.1].
    const tienePermiso = rolesPermitidos
      .map(role => role.trim().toUpperCase())
      .includes(rolUsuarioSuperior);

    if (!tienePermiso) {
      throw new ForbiddenException('Acceso denegado: Este módulo es exclusivo para Administradores.');
    }

    return true;
  }
}
*/