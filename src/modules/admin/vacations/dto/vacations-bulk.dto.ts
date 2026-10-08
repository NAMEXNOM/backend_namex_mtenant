// src/modules/admin/vacations/dto/vacations-bulk.dto.ts
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VacationItemSyncDto {
  @ApiProperty({ example: '2025-2026', description: 'Período vacacional correspondiente al que pertenece el registro' })
  @IsString()
  @IsNotEmpty()
  period: string;

  @ApiProperty({ example: 'Disfrutadas', description: 'Tipo de registro o movimiento: Disfrutadas, Prorrogadas, Ajuste' })
  @IsString()
  @IsNotEmpty()
  recordType: string;

  @ApiProperty({ example: '2026-12-20', description: 'Fecha de inicio del periodo vacacional (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  fechaInicio: string;

  @ApiProperty({ example: '2026-12-24', description: 'Fecha de fin del periodo vacacional (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  fechaFinal: string;

  @ApiProperty({ example: 5.00, description: 'Cantidad exacta de días solicitados o tomados en este bloque' })
  @IsNumber()
  vacationDays: number;
}

export class EmpleadoVacationsSyncDto {
  @ApiProperty({ example: 'GOCJ681111UR3', description: 'RFC único del trabajador para enlazar los registros' })
  @IsString()
  @IsNotEmpty()
  userRFC: string;

  @ApiProperty({ type: [VacationItemSyncDto], description: 'Listado de bloques vacacionales registrados para este empleado' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VacationItemSyncDto)
  vacaciones: VacationItemSyncDto[];
}

export class VacationsBulkEnvelopeDto {
  @ApiProperty({ 
    type: [EmpleadoVacationsSyncDto], 
    description: 'Sobre contenedor global que aloja el arreglo de empleados y sus respectivas vacaciones' 
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmpleadoVacationsSyncDto)
  empleados: EmpleadoVacationsSyncDto[];
}
