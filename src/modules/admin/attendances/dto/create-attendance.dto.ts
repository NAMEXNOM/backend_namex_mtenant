import { IsNotEmpty, IsString, IsDateString, IsOptional, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAttendanceDto {
  @ApiProperty({ description: 'ID del usuario (UUID)', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsString()
  @IsNotEmpty({ message: 'El userId es requerido.' })
  userId: string;

  @ApiProperty({ description: 'Fecha del registro (YYYY-MM-DD)', example: '2026-06-18' })
  @IsDateString({}, { message: 'La fecha recDate debe tener un formato de fecha válido.' })
  @IsNotEmpty()
  recDate: string;

  @ApiProperty({ description: 'Tipo de registro', default: 'Regular', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  recType?: string;

  @ApiProperty({ description: 'Número de turno', default: 1, required: false })
  @IsNumber()
  @IsOptional()
  shift?: number;

  @ApiProperty({ description: 'Incidencia asociada si aplica', required: false, example: 'INC-102' })
  @IsString({ message: 'El incidentId debe ser una cadena de texto.' }) 
  @IsOptional()
  incidentId?: string;

  @ApiProperty({ description: 'Hora de primera entrada (HH:MM:SS)', example: '08:00:00', required: false })
  @IsString()
  @IsOptional()
  check_in_1?: string;

  @ApiProperty({ description: 'Hora de primera salida (HH:MM:SS)', example: '13:00:00', required: false })
  @IsString()
  @IsOptional()
  check_out_1?: string;

  @ApiProperty({ description: 'Hora de segunda entrada (HH:MM:SS)', example: '14:00:00', required: false })
  @IsString()
  @IsOptional()
  check_in_2?: string;

  @ApiProperty({ description: 'Hora de segunda salida (HH:MM:SS)', example: '18:00:00', required: false })
  @IsString()
  @IsOptional()
  check_out_2?: string;

  @ApiProperty({ description: 'Total de horas trabajadas en el día', example: 8.5, required: false })
  @IsNumber()
  @IsOptional()
  dailyHours?: number;

  @ApiProperty({ description: 'Total de horas extra (NUMERIC 5,2)', example: 2.5, required: false }) 
  @IsNumber()
  @IsOptional()
  dailyHoursOVT?: number;
}

