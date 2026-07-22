// src/modules/admin/attendances/entities/attendance.entity.ts
/*
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity'; 

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'date', name: 'rec_date' })
  recDate: string; // Formato YYYY-MM-DD

  @Column({ type: 'varchar', length: 20, name: 'rec_type', default: 'Regular' })
  recType: string; // 'Regular', 'Rest', 'Holiday'

  @Column({ type: 'smallint', name: 'shift', default: 1 })
  shift: number; // 1, 2 or 3

  @Column({ type: 'varchar', name: 'incident_id', nullable: true }) 
  incidentId: string; 

  @Column({ type: 'time', name: 'check_in_1', nullable: true })
  checkIn1: string;

  @Column({ type: 'time', name: 'check_out_1', nullable: true })
  checkOut1: string;

  @Column({ type: 'time', name: 'check_in_2', nullable: true })
  checkIn2: string;

  @Column({ type: 'time', name: 'check_out_2', nullable: true })
  checkOut2: string;

  @Column({ type: 'decimal', precision: 4, scale: 2, name: 'daily_hours', default: 0.00 })
  dailyHours: number; 

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'daily_hours_ovt', default: 0.00 })
  dailyHoursOVT: number;
}
*/

// src/modules/admin/attendances/entities/attendance.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity'; 

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'date', name: 'rec_date' })
  recDate: string; 

  @Column({ type: 'varchar', length: 20, name: 'rec_type', default: 'Regular' })
  recType: string; 

  @Column({ type: 'smallint', name: 'shift', default: 1 })
  shift: number; 

  @Column({ type: 'varchar', name: 'incident_id', nullable: true }) 
  incidentId: string | null; 

  @Column({ type: 'time', name: 'check_in_1', nullable: true })
  checkIn1: string | null;

  @Column({ type: 'time', name: 'check_out_1', nullable: true })
  checkOut1: string | null;

  @Column({ type: 'time', name: 'check_in_2', nullable: true })
  checkIn2: string | null;

  @Column({ type: 'time', name: 'check_out_2', nullable: true })
  checkOut2: string | null;

  @Column({ type: 'decimal', precision: 4, scale: 2, name: 'daily_hours', default: 0.00 })
  dailyHours: number; 

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'daily_hours_ovt', default: 0.00 })
  dailyHoursOVT: number;
}

