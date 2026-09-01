import { Module, NestModule, MiddlewareConsumer, Global } from '@nestjs/common'; 

import { AwsModule } from './shared/aws/aws.module';


import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; 
import { ConfigurationModule } from './modules/admin/configuration/configuration.module';
import { Configuration } from './modules/admin/configuration/entities/configuration.entity';
import { UsersModule } from './modules/admin/users/users.module';
import { User } from './modules/admin/users/entities/user.entity';
import { AuthModule } from './modules/auth/auth.module';
import { PermissionsModule } from './modules/admin/permissions/permissions.module';
import { RolesModule } from './modules/admin/roles/roles.module';
import { Permission } from './modules/admin/permissions/entities/permission.entity';
import { Role } from './modules/admin/roles/entities/role.entity';
import { VacationsModule } from './modules/admin/vacations/vacations.module';
import { Vacation } from './modules/admin/vacations/entities/vacation.entity';
import { AttendancesModule } from './modules/admin/attendances/attendances.module';
import { Attendance } from './modules/admin/attendances/entities/attendance.entity';
import { CompaniesModule } from './modules/companies/companies.module';
import { Company } from './modules/companies/entities/company.entity'; 

// 🚨 IMPORTACIÓN DEL MIDDLEWARE MULTI-TENANT
import { TenantModule } from './database/tenant.module'; // 👈 1. IMPORTA EL NUEVO MÓDULO GLOBAL
import { TenantMiddleware } from './database/middleware/tenant.middleware';
import { TenantConnectionProvider } from './database/tenant-connection.provider';
import { TenantSubscriber } from './database/tenant.subscriber';


import { NominasModule } from './modules/admin/nominas/nominas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
    }),

    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST,
      port: 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [
        Configuration,
        User,
        Permission,
        Role,
        Vacation,
        Attendance,
        Company, 
      ],
      subscribers: [TenantSubscriber],
      synchronize: false,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }),
    TenantModule,
    ConfigurationModule,
    UsersModule,
    AuthModule, 
    PermissionsModule,
    RolesModule,
    VacationsModule,
    AttendancesModule,
    CompaniesModule,
    NominasModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*'); 
  }
}



