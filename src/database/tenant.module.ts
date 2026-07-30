import { Module, Global } from '@nestjs/common';
import { TenantConnectionProvider, TENANT_MANAGER } from './tenant-connection.provider';

@Global() // 🟢 Este decorador sí es válido aquí y propaga el token a todo el sistema
@Module({
  providers: [TenantConnectionProvider],
  exports: [TENANT_MANAGER], // 👈 Expone el token de forma automática para UsersService
})
export class TenantModule {}
