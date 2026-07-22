import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";
import { IsNull } from "typeorm/browser";


// se crearon las validaciones de los puertos 03/03/2026 RAP

export class CreateConfigurationDto {
    
    @ApiProperty()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    @ValidateIf(o => o.RH1_email !== undefined && o.RH2_email !== null)
    @IsNotEmpty()
    RH1_name: string;

    @ApiProperty()
    @IsEmail()
    @ValidateIf(o => o.RH1_name !== undefined && o.RH2_name !== null)
    @IsNotEmpty()
    RH1_email: string;

// RH2 Validacion de entradas de valores, deben estar presentes ambos valores

    @ApiProperty()
    //@IsOptional()
    @ValidateIf(o => o.RH2_email !== undefined && o.RH2_email !== null)
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    @IsNotEmpty({ message: 'RH2_nombre es obligatorio cuando RH2_email es configurado' })
    RH2_name: string;
    
    @ApiProperty()
    
  //  @IsOptional()
    @ValidateIf(o => o.RH2_name !== undefined && o.RH2_name !== null)
    @IsNotEmpty({ message: 'RH2_email es obligatorio cuando RH2_nombre es configurado' })
    @IsEmail()
    RH2_email: string;

// RH3 Validacion de entradas de valores, deben estar presentes ambos valores

    @ApiProperty()
    //@IsOptional()
    @ValidateIf(o => o.RH3_email !== undefined && o.RH3_email !== null)
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    @IsNotEmpty({ message: 'RH3_nombre es obligatorio cuando RH3_email es configurado' })
    RH3_name: string;
    
    @ApiProperty()
    
  //  @IsOptional()
    @ValidateIf(o => o.RH3_name !== undefined && o.RH3_name !== null)
    @IsNotEmpty({ message: 'RH3_email es obligatorio cuando RH3_nombre es configurado' })
    @IsEmail()
    RH3_email: string;

// RH4 Validacion de entradas de valores, deben estar presentes ambos valores

    @ApiProperty()
    //@IsOptional()
    @ValidateIf(o => o.RH4_email !== undefined && o.RH4_email !== null)
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    @IsNotEmpty({ message: 'RH4_nombre es obligatorio cuando RH4_email es configurado' })
    RH4_name: string;
    
    @ApiProperty()
    
  //  @IsOptional()
    @ValidateIf(o => o.RH4_name !== undefined && o.RH4_name !== null)
    @IsNotEmpty({ message: 'RH4_email es obligatorio cuando RH4_nombre es configurado' })
    @IsEmail()
    RH4_email: string;

// RH5 Validacion de entradas de valores, deben estar presentes ambos valores

    @ApiProperty()
    //@IsOptional()
    @ValidateIf(o => o.RH5_email !== undefined && o.RH5_email !== null)
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    @IsNotEmpty({ message: 'RH5_nombre es obligatorio cuando RH5_email es configurado' })
    RH5_name: string;
    
    @ApiProperty()
    
  //  @IsOptional()
    @ValidateIf(o => o.RH5_name !== undefined && o.RH5_name !== null)
    @IsNotEmpty({ message: 'RH5_email es obligatorio cuando RH5_nombre es configurado' })
    @IsEmail()
    RH5_email: string;

// RH6 Validacion de entradas de valores, deben estar presentes ambos valores

    @ApiProperty()
    //@IsOptional()
    @ValidateIf(o => o.RH6_email !== undefined && o.RH6_email !== null)
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    @IsNotEmpty({ message: 'RH6_nombre es obligatorio cuando RH6_email es configurado' })
    RH6_name: string;
    
    @ApiProperty()
    
  //  @IsOptional()
    @ValidateIf(o => o.RH6_name !== undefined && o.RH6_name !== null)
    @IsNotEmpty({ message: 'RH6_email es obligatorio cuando RH6_nombre es configurado' })
    @IsEmail()
    RH6_email: string;

  // Configuracion de datos de la compañia. 03/14/2026  RAP
    
    @ApiProperty()
    @IsOptional()
    @IsString()
    nameCo: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    rfcCo: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    urlCo: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    portNumber: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    token: string;



}

// se terminaron de configurar las validaciones de los puertos 