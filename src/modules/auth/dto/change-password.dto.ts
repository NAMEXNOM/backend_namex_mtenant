import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'ID único del usuario', example: 'abc-123-xyz' })
  @IsString()
  @IsNotEmpty({ message: 'El ID de usuario es obligatorio.' })
  userId: string;

  @ApiProperty({ description: 'La nueva contraseña que se va a asignar', example: 'NuevaClave2026!' })
  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña no puede estar vacía.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }) // Ajusta según tus políticas de seguridad
  password: string;

  @ApiProperty({ description: 'Contraseña actual (Solo obligatoria si el cambio es voluntario)', required: false })
  @IsString()
  @IsOptional() // Permite que no venga si es obligatorio (primer ingreso)
  currentPassword?: string;
}
