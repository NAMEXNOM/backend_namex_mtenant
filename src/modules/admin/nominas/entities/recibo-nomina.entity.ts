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

  @Column({ name: 's3_key', length: 512 })
  s3Key!: string;

  @Column({ name: 'periodo_anio', type: 'int' })
  periodoAnio!: number;

  @Column({ name: 'periodo_mes', type: 'int' })
  periodoMes!: number;

  @CreateDateColumn({ name: 'creado_at', type: 'timestamp with time zone' })
  creadoAt!: Date;
}
