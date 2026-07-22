import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTables1775683107704 implements MigrationInterface {
    name = 'CreateTables1775683107704'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "permission" ("id" SERIAL NOT NULL, "action" character varying, "subject" character varying, "label" character varying, CONSTRAINT "PK_3b8b97af9d9d8807e41e6f48362" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("userId" uuid NOT NULL DEFAULT uuid_generate_v4(), "userRFC" character varying NOT NULL, "empNumber" character varying NOT NULL, "name" character varying NOT NULL, "firstLastName" character varying NOT NULL, "secondLastName" character varying NOT NULL, "email" character varying NOT NULL, "hireDate" TIMESTAMP NOT NULL, "termDate" TIMESTAMP, "status" character varying NOT NULL, "shiftType" character varying NOT NULL, "jobRole" character varying NOT NULL, "firstTimeLoad" boolean NOT NULL DEFAULT true, "password" character varying NOT NULL, "empPriv" character varying NOT NULL DEFAULT 'usuario', "vacationBalance" integer NOT NULL DEFAULT '0', "balanceDateTime" TIMESTAMP, CONSTRAINT "UQ_8be01cc2a2dd7cdbb6fb1799980" UNIQUE ("userRFC"), CONSTRAINT "UQ_2b4c50bca5f8f00c04ad6d84138" UNIQUE ("empNumber"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_d72ea127f30e21753c9e229891e" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "vacations" ("vacationId" SERIAL NOT NULL, "userId" uuid NOT NULL, "period" character varying NOT NULL, "recordType" character varying NOT NULL DEFAULT 'pending', "fechaInicio" date NOT NULL, "fechaFinal" date NOT NULL, "vacationDays" character varying NOT NULL, CONSTRAINT "PK_1beb5bd3fe81a1eec9864815453" PRIMARY KEY ("vacationId"))`);
        await queryRunner.query(`CREATE TABLE "configuration" ("config_id" integer NOT NULL, "RH1_name" character varying, "RH1_email" character varying, "RH2_name" character varying, "RH2_email" character varying, "RH3_name" character varying, "RH3_email" character varying, "RH4_name" character varying, "RH4_email" character varying, "RH5_name" character varying, "RH5_email" character varying, "RH6_name" character varying, "RH6_email" character varying, "nameCo" character varying DEFAULT '', "rfcCo" character varying DEFAULT '', "urlCo" character varying DEFAULT '', "portNumber" character varying DEFAULT '', "token" character varying DEFAULT '', CONSTRAINT "UQ_1bfecb9c4cc4746e6dd2660dcdf" UNIQUE ("RH1_name"), CONSTRAINT "UQ_55976348608c82717bd6b3ff55a" UNIQUE ("RH1_email"), CONSTRAINT "UQ_7a4adf8cc2623fa4a5a14e57e12" UNIQUE ("RH2_name"), CONSTRAINT "UQ_8d49fe0e16370d4e7ce531f576a" UNIQUE ("RH2_email"), CONSTRAINT "UQ_47af08902e6a8a77b13ac2a9cd9" UNIQUE ("RH3_name"), CONSTRAINT "UQ_0f5b6159e4b6b42685fa09eba57" UNIQUE ("RH3_email"), CONSTRAINT "UQ_1d1cd343878a941ef2246961e56" UNIQUE ("RH4_name"), CONSTRAINT "UQ_a8e3ecacd670195d432c82b8426" UNIQUE ("RH4_email"), CONSTRAINT "UQ_e3b0a015c9f16d8b28e23613ff1" UNIQUE ("RH5_name"), CONSTRAINT "UQ_ea54ac612c6afc50a1c8ccbff63" UNIQUE ("RH5_email"), CONSTRAINT "UQ_a58b91ae7ef2dbb06954abe2f34" UNIQUE ("RH6_name"), CONSTRAINT "UQ_9aeea13ce70ba7c85f87c54b925" UNIQUE ("RH6_email"), CONSTRAINT "PK_bfecc86452256847d8bbb4c1b3c" PRIMARY KEY ("config_id"))`);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("role_id" integer NOT NULL, "permission_id" integer NOT NULL, CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY ("role_id", "permission_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") `);
        await queryRunner.query(`CREATE TABLE "users_roles" ("user_id" uuid NOT NULL, "role_id" integer NOT NULL, CONSTRAINT "PK_c525e9373d63035b9919e578a9c" PRIMARY KEY ("user_id", "role_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e4435209df12bc1f001e536017" ON "users_roles" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_1cf664021f00b9cc1ff95e17de" ON "users_roles" ("role_id") `);
        await queryRunner.query(`ALTER TABLE "vacations" ADD CONSTRAINT "FK_89640b2dfe9d14d229c6943626f" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "users_roles" ADD CONSTRAINT "FK_e4435209df12bc1f001e5360174" FOREIGN KEY ("user_id") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "users_roles" ADD CONSTRAINT "FK_1cf664021f00b9cc1ff95e17de4" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users_roles" DROP CONSTRAINT "FK_1cf664021f00b9cc1ff95e17de4"`);
        await queryRunner.query(`ALTER TABLE "users_roles" DROP CONSTRAINT "FK_e4435209df12bc1f001e5360174"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`);
        await queryRunner.query(`ALTER TABLE "vacations" DROP CONSTRAINT "FK_89640b2dfe9d14d229c6943626f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1cf664021f00b9cc1ff95e17de"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e4435209df12bc1f001e536017"`);
        await queryRunner.query(`DROP TABLE "users_roles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_17022daf3f885f7d35423e9971"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_178199805b901ccd220ab7740e"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TABLE "configuration"`);
        await queryRunner.query(`DROP TABLE "vacations"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "permission"`);
    }

}
