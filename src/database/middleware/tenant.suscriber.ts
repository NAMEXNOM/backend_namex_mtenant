import { EventSubscriber, EntitySubscriberInterface, Connection } from 'typeorm';
import { tenantStorage } from '../tenant-storage';

@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  
  // Este método intercepta la conexión justo antes de que se ejecute cualquier consulta a la BD
  async beforeQuery(event: any) {
    const tenantId = tenantStorage.getStore();
    
    // Si hay un tenant activo en la petición actual y no es el público
    if (tenantId && tenantId !== 'public') {
      // Forzamos a esta conexión específica a mirar el esquema del cliente
      await event.queryRunner.query(`SET search_path TO "${tenantId}", public;`);
    }
  }
}
