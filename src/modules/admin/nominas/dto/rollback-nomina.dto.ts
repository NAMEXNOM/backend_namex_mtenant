import { IsNotEmpty, IsString } from 'class-validator';

export class RollbackNominaDto {
  @IsString()
  @IsNotEmpty({ message: 'El tipo de periodo es requerido (Semanal/Quincenal/Mensual).' })
  periodo_tipo: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de periodo es requerido.' })
  numero_periodo: string;

  @IsString()
  @IsNotEmpty({ message: 'El tipo de nómina es requerido (Ordinaria/Especial).' })
  nomina_tipo: string;
}
