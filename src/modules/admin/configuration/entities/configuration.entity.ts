import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Configuration {
    @PrimaryColumn()
    config_id: number;

    @Column({unique: true, nullable: true})
    RH1_name: string;
    
    @Column({unique: true, nullable: true})
    RH1_email:string;

    @Column({unique: true, nullable: true})
    RH2_name: string;
    
    @Column({unique: true, nullable: true})
    RH2_email:string;

    @Column({unique: true, nullable: true})
    RH3_name: string;
    
    @Column({unique: true, nullable: true})
    RH3_email:string;

    @Column({unique: true, nullable: true})
    RH4_name: string;
    
    @Column({unique: true, nullable: true})
    RH4_email:string;
    
    @Column({unique: true, nullable: true})
    RH5_name: string;
    
    @Column({unique: true, nullable: true})
    RH5_email:string;

    @Column({unique: true, nullable: true})
    RH6_name: string;
    
    @Column({unique: true, nullable: true})
    RH6_email:string;

    @Column({default: "",nullable: true})
    nameCo: string;

    @Column({default: "",nullable: true})
    rfcCo:string;

    @Column({default: "",nullable: true})
    urlCo:string;

    @Column({default: "",nullable: true})
    portNumber: string;

    @Column({default: "",nullable: true})
    token: string;



    

}
