// src/shared/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Leemos los roles permitidos que le programamos al endpoint
    const rolesPermitidos = this.reflector.get<string[]>('roles', context.getHandler());
    
    // Si el endpoint no tiene ninguna restricción de rol especificada, damos paso libre
    if (!rolesPermitidos) {
      return true;
    }

    // 2. Extraemos el objeto 'user' que previamente desempaquetó tu JwtAuthGuard
    const request = context.switchToHttp().getRequest();
    const usuario = request.user;

    if (!usuario || !usuario.role) {
      throw new ForbiddenException('No tienes un rol válido asignado en tu sesión.');
    }

    // 3. 🟢 NORMALIZACIÓN EN MAYÚSCULAS (Tu brillante idea):
    // Convertimos el rol del token a mayúsculas para que acepte 'admin', 'Admin' o 'ADMIN' sin romperse
    const rolUsuarioSuperior = usuario.role.trim().toUpperCase();
    
    // Convertimos también la lista de roles permitidos a mayúsculas para comparar manzanas con manzanas
    const tienePermiso = rolesPermitidos
      .map(r => r.toUpperCase())
      .includes(rolUsuarioSuperior);

    if (!tienePermiso) {
      throw new ForbiddenException('Acceso denegado: Este módulo es exclusivo para Administradores.');
    }

    return true;
  }
}
