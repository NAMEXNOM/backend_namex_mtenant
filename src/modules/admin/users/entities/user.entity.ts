import { Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Timestamp } from "typeorm/browser";
import { Role } from "../../roles/entities/role.entity";
import { Vacation } from './../../vacations/entities/vacation.entity';

@Entity('user')  //********************************** */
export class User {
    @PrimaryGeneratedColumn('uuid')
    userId: string;

    @Column({unique:true, update: false})
    userRFC: string;

    @Column({unique:true, update: false})
    empNumber: string;
    
    @Column()
    name: string;
    
    @Column()
    firstLastName: string;
    
    @Column()
    secondLastName: string;
    
    @Column({unique: true})
    email: string;
    
    @Column()
    hireDate: Date;
    
    @Column({nullable: true })
    termDate?: Date;
    
    @Column()
    status: string;
    
    @Column()
    shiftType: string;
    
    @Column()
    jobRole: string;
    
    @Column({default: true})
    firstTimeLoad: boolean;

    @Column()
    password: string;

    @Column({default: "usuario"})
    empPriv: string;

    @Column({ type: 'numeric', precision: 5, scale: 2, default: 0.00 })
    vacationBalance: number;

    @Column({nullable: true})
    balanceDateTime: Date;

    @Column({ type: 'smallint', name: 'start_day_of_payment', default: 1 })
    startDayOfPayment: number; 
    // En TypeScript se usará 'startDayOfPayment', pero en SQL buscará 'start_day_of_payment' 
    // 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado, 7 = Domingo

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0.00,
        name: 'vacations_taken' // Opcional: buen formato para la BD
    })
    vacationsTaken: number;



    @ManyToMany(() => Role, {eager: true})
    @JoinTable({
        name: 'users_roles',
        joinColumn: {
            name: 'user_id'
        },
        inverseJoinColumn: {
            name: 'role_id'
        } 
    })
    roles: Role[]

    // Un usuario tiene muchas vacaciones
    @OneToMany(() => Vacation, (vacation) => vacation.userId)
    vacations: Vacation[];
}
