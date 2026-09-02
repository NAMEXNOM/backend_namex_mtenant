import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NominasController } from './nominas.controller';
import { NominasService } from './nominas.service';
import { ReciboNomina } from './entities/recibo-nomina.entity';
import { AwsModule } from '../../../shared/aws/aws.module'; // 🟢 Asegura importar el módulo compartido de S3

@Module({
  imports: [
    TypeOrmModule.forFeature([ReciboNomina]),
    AwsModule,   // 🟢 Agregamos el módulo aquí para proveer explícitamente el S3Service
  ],
  controllers: [NominasController],
  providers: [NominasService],
})
export class NominasModule {}

