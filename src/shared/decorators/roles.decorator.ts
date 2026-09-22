// src/shared/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

// Este decorador guardará la lista de roles autorizados en los metadatos del endpoint
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
