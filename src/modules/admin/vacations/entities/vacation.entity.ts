import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from './../../users/entities/user.entity'; 


@Entity("vacations")
export class Vacation {
    @PrimaryGeneratedColumn()
    vacationId!: number;

    @Column()
    userId!: string;

    @Column()
    period!: string;

    @Column()
    recordType!: string;

    @Column({ type: "date" })
    fechaInicio!: Date;

    @Column({ type: "date" })
    fechaFinal!: Date;

    @Column({ type: 'numeric', precision: 5, scale: 2, default: 0.00 })
    vacationDays!: number;

      // Relación con User
    @ManyToOne(() => User, (user) => user.vacations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' }) // Especificamos que use 'userId' como FK
    user: User;

 
}
