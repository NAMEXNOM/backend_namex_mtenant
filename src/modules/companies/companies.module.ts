import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity'; // 👈 Importas tu nueva entidad
// Importa aquí tu controlador y servicio si el asistente los creó

@Module({
  imports: [
    TypeOrmModule.forFeature([Company]) // 👈 Registras la entidad para TypeORM
  ],
  controllers: [], // Coloca el controlador si lo necesitas
  providers: [],   // Coloca el servicio si lo necesitas
  exports: [TypeOrmModule] // 👈 Exportarlo permitirá que el Middleware lo use después
})
export class CompaniesModule {}