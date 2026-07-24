import { EntitySubscriberInterface, EventSubscriber } from 'typeorm';
import { tenantStorage } from './tenant-storage'; // Tu almacenamiento aislado

@EventSubscriber()
export class TenantSchemaSubscriber implements EntitySubscriberInterface {
  
  private async connectionResolver(event: any): Promise<void> {
    const tenantId = tenantStorage.getStore() || 'public';
    
    // 🚨 REGRESIÓN DE ESCAPE: Si la query actual es precisamente un SET o RESET, 
    // salimos de inmediato para romper el bucle infinito de memoria.
    if (event.query?.includes('search_path')) {
      return;
    }

    try {
      // Forzar el cambio del buscador directo en Postgres de forma limpia
      await event.queryRunner.query(`SET search_path TO ${tenantId}, public;`);
    } catch (error) {
      // Evitar que un fallo de red tire la API completa
      console.error('🚨 Error al conmutar el esquema en Postgres:', error);
    }
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