import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NominasController } from './nominas.controller';
import { NominasService } from './nominas.service';
import { ReciboNomina } from './entities/recibo-nomina.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReciboNomina]),
  ],
  controllers: [NominasController],
  providers: [NominasService],
})
export class NominasModule {}

