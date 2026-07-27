import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'companies', schema: 'public' }) // 👈 Obligatorio para multi-tenant
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ name: 'tenant_id', length: 50, unique: true })
  tenantId: string;

  @Column({ name: 'schema_name', length: 50, unique: true })
  schemaName: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}