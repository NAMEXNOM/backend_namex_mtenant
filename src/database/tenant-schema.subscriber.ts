import { EntitySubscriberInterface, EventSubscriber } from 'typeorm';
import { tenantStorage } from './middleware/tenant.middleware'; // Ajustado a tu ruta real

@EventSubscriber()
export class TenantSchemaSubscriber implements EntitySubscriberInterface {
  
  // Función central que fuerza a Postgres a usar el esquema dinámico
  private async connectionResolver(event: any): Promise<void> {
    const tenantId = tenantStorage.getStore() || 'public';
    
    // Limpia la caché del buscador de Postgres y lo amarra a la empresa actual
    await event.queryRunner.query(`RESET search_path;`);
    await event.queryRunner.query(`SET search_path TO ${tenantId}, public;`);
  }

  async beforeQuery(event: any): Promise<void> {
    await this.connectionResolver(event);
  }

  async beforeInsert(event: any): Promise<void> {
    await this.connectionResolver(event);
  }

  async beforeUpdate(event: any): Promise<void> {
    await this.connectionResolver(event);
  }

  async beforeRemove(event: any): Promise<void> {
    await this.connectionResolver(event);
  }
}