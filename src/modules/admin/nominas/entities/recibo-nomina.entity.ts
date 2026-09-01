// src/modules/admin/nominas/entities/recibo-nomina.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('recibos_nomina')
export class ReciboNomina {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index('idx_recibos_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'user_rfc', length: 13 })
  userRfc!: string;

  // Modificado: Ahora guardamos URLs completas de S3 por separado para PDF y XML
  @Column({ name: 'url_pdf', length: 512 })
  urlPdf!: string;

  @Column({ name: 'url_xml', length: 512 })
  urlXml!: string;

  // Nuevos campos de control de periodos y tipos de nómina
  @Column({ name: 'periodo_tipo', length: 50 }) // 'Semanal', 'Quincenal', 'Mensual'
  periodoTipo!: string;

  @Column({ name: 'numero_periodo', type: 'int' }) // Ej. Periodo 14
  numeroPeriodo!: number;

  @Column({ name: 'nomina_tipo', length: 50 }) // 'Ordinaria' o 'Especial'
  nominaTipo!: string;

  // Nuevo campo para renderizar en el historial del empleado
  @Column({ name: 'monto_neto', type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  montoNeto!: number;

  @CreateDateColumn({ name: 'fecha_pago', type: 'timestamp with time zone' })
  fechaPago!: Date;
}
