// src/modules/admin/nominas/dto/upload-nomina.dto.ts
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum PeriodoTipo {
  SEMANAL = 'Semanal',
  QUINCENAL = 'Quincenal',
  MENSUAL = 'Mensual',
}

export enum NominaTipo {
  ORDINARIA = 'Ordinaria',
  ESPECIAL = 'Especial',
}

export class UploadNominaDto {
  @IsEnum(PeriodoTipo, { message: 'El periodo_tipo debe ser: Semanal, Quincenal o Mensual' })
  @IsNotEmpty()
  periodo_tipo: PeriodoTipo;

  @IsString()
  @IsNotEmpty()
  numero_periodo: string;

  @IsEnum(NominaTipo, { message: 'El nomina_tipo debe ser: Ordinaria o Especial' })
  @IsNotEmpty()
  nomina_tipo: NominaTipo;
}
