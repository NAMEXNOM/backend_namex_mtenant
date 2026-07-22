import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Role } from "../../roles/entities/role.entity";

@Entity()  ///******************************************* */
export class Permission {
    @PrimaryGeneratedColumn()
    id: string;

    @Column({nullable: true})
    action: string; // 'create', 'read', 'update', 'delete'

    @Column({nullable: true})
    subject: string; // 'user', 'role', 'producto', 'categoria'

    @Column({nullable: true})
    label: string;

    @ManyToMany(()=> Role, (rol) => rol.permissions)
    roles: Role[]

}
