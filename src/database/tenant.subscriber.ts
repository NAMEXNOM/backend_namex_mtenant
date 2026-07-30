import { EventSubscriber, EntitySubscriberInterface } from 'typeorm';
import { tenantStorage } from './tenant-storage';

@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  
  // Este método intercepta físicamente cada consulta a la BD justo antes de ejecutarse
  async beforeQuery(event: any) {
    // 1. REGLA DE ESCAPE: Si la consulta ya es un comando de control, déjala pasar
    if (event.query && event.query.includes('SET search_path')) {
      return;
    }

    // 2. Extraer el esquema que guardó el middleware en memoria para esta petición
    const tenantId = tenantStorage.getStore();
    
    // 3. Forzar el camino de búsqueda de Postgres en la conexión física exacta que usará la consulta
    if (tenantId && tenantId !== 'public') {
      try {
        await event.queryRunner.query(`SET search_path TO "${tenantId}", public;`);
      } catch (error) {
        console.error(`🚨 Error al forzar esquema en la consulta:`, error);
      }
    }
  }
}
