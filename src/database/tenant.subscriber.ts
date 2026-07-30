import { EventSubscriber, EntitySubscriberInterface } from 'typeorm';
import { tenantStorage } from './tenant-storage';

@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  
  // Este método intercepta la consulta justo antes de que TypeORM ensamble el SQL
  beforeQuery(event: any) {
    // 1. Extraer el esquema que guardó el middleware para esta petición HTTP
    const tenantId = tenantStorage.getStore();
    
    // 2. Si hay un tenant activo y no es el público, forzamos el esquema a nivel de metadata
    if (tenantId && tenantId !== 'public') {
      // Modificamos el esquema del metadato de la entidad para esta consulta específica
      if (event.metadata) {
        event.metadata.schema = tenantId;
      }
      
      // Si la consulta viene empaquetada en un QueryBuilder, le inyectamos el esquema al vuelo
      if (event.queryRunner && event.queryRunner.manager) {
        event.connection.entityMetadatas.forEach(meta => {
          meta.schema = tenantId;
        });
      }
    } else {
      // Si es una petición pública o del sistema central, aseguramos que use el esquema público
      if (event.metadata) {
        event.metadata.schema = 'public';
      }
    }
  }
}

