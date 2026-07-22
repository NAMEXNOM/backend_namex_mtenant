import { ApiProperty } from "@nestjs/swagger/dist";

import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateVacationDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    userId!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    period!: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @IsEnum(['1', '2']) // Ejemplo de estados
    recordType?: string;

    @ApiProperty()
    @IsDateString()
    @IsNotEmpty()
    fechaInicio!: string; // Se recibe como string ISO date

    @ApiProperty()
    @IsDateString()
    @IsNotEmpty()
    fechaFinal?: string;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 2 })
    vacationDays!: number;

}
