import { IsString, IsNotEmpty, IsEmail, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AsistenciaSyncDto {
  @ApiProperty({ example: '2026-09-23', description: 'Fecha de la asistencia' })
  @IsDateString()
  @IsNotEmpty()
  rec_date: string;

  @ApiProperty({ example: 'Regular', description: 'Tipo de registro: Regular, Incidencia, Falta' })
  @IsString()
  @IsNotEmpty()
  rec_type: string;

  @ApiProperty({ example: 1, description: 'Turno asignado' })
  @IsNumber()
  shift: number;

  @ApiProperty({ example: 'VAC', description: 'ID o código de la incidencia si aplica', required: false })
  @IsString()
  @IsOptional()
  incidentId?: string;

  @ApiProperty({ example: '08:00:00', required: false })
  @IsString()
  @IsOptional()
  check_in_1?: string;

  @ApiProperty({ example: '17:00:00', required: false })
  @IsString()
  @IsOptional()
  check_out_1?: string;

  @ApiProperty({ example: '12:00:00', required: false, description: 'Segunda checada de entrada si aplica' })
  @IsString()
  @IsOptional()
  check_in_2?: string;

  @ApiProperty({ example: '13:00:00', required: false, description: 'Segunda checada de salida si aplica' })
  @IsString()
  @IsOptional()
  check_out_2?: string;

  @ApiProperty({ example: 8.00, description: 'Horas laboradas normales' })
  @IsNumber()
  daily_hours: number;

  @ApiProperty({ example: 0.00, description: 'Horas extra laboradas (Overtime)' })
  @IsNumber()
  daily_hours_ovt: number;
}

export class EmpleadoSyncDto {
  @ApiProperty({ example: 'GOCJ681111UR3', description: 'RFC único del trabajador' })
  @IsString()
  @IsNotEmpty()
  userRFC: string;

  @ApiProperty({ example: '129', description: 'Número de reloj o empleado único' })
  @IsString()
  @IsNotEmpty()
  empNumber: string;

  @ApiProperty({ example: 'JUAN MARTIN' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'GONZALEZ' })
  @IsString()
  @IsNotEmpty()
  firstLastName: string;

  @ApiProperty({ example: 'CRUZ' })
  @IsString()
  @IsNotEmpty()
  secondLastName: string;

  @ApiProperty({ example: 'juan.gonzalez@namex.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '2026-06-25', description: 'Fecha de ingreso' })
  @IsDateString()
  @IsNotEmpty()
  hireDate: string;

  @ApiProperty({ example: 'ACTIVO' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ example: 'DIURNO', description: 'Tipo de turno o jornada' })
  @IsString()
  @IsNotEmpty()
  shiftType: string;

  @ApiProperty({ example: 'Operador' })
  @IsString()
  @IsNotEmpty()
  jobRole: string;

  @ApiProperty({ example: 'usuario', description: 'Nivel de privilegio: usuario, admin' })
  @IsString()
  @IsNotEmpty()
  empPriv: string;

  @ApiProperty({ example: 12.00, description: 'Saldo actual de vacaciones disponibles' })
  @IsNumber()
  vacationBalance: number;

  @ApiProperty({ example: '2026-10-01 12:00:00', description: 'Última actualización del balance', required: false })
  @IsString()
  @IsOptional()
  balanceDateTime?: string;

  @ApiProperty({ example: 1, description: 'Día de inicio de pago (1 = Lunes, 7 = Domingo)', required: false })
  @IsOptional()
  @IsNumber({}, { message: 'start_day_of_payment debe ser un número entero' })
  @Type(() => Number)
  @Min(1)
  @Max(7)
  start_day_of_payment?: number;

  @ApiProperty({ example: 3.00, description: 'Días de vacaciones tomadas históricas', required: false })
  @IsNumber()
  @IsOptional()
  vacationsTaken?: number;

  @ApiProperty({ type: [AsistenciaSyncDto], description: 'Listado quincenal o mensual de sus asistencias' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsistenciaSyncDto)
  asistencias: AsistenciaSyncDto[];
}

export class BulkSyncEnvelopeDto {
  @ApiProperty({ type: [EmpleadoSyncDto], description: 'Arreglo masivo de trabajadores con sus asistencias incrustadas.' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmpleadoSyncDto)
  empleados: EmpleadoSyncDto[];
}
