import { ApiProperty } from "@nestjs/swagger/dist";
import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { dateTimestampProvider } from "rxjs/internal/scheduler/dateTimestampProvider";
import { Timestamp } from "typeorm";

export class CreateUserDto {  //que es lo que queremos guardar, es lo que debemos poner en esta clase
    @ApiProperty()
    @IsString()
    @MinLength(13)
    @MaxLength(13)
    @IsNotEmpty()
    userRFC!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    empNumber!: string;

    @ApiProperty()
    @IsString()
    @MinLength(1)
    @MaxLength(30)
    @IsNotEmpty()
    name!: string;

    @ApiProperty()
    @IsString()
    @MinLength(1)
    @MaxLength(30)
    @IsNotEmpty()
    firstLastName!: string;

    @ApiProperty()
    @IsString()
    @MinLength(1)
    @MaxLength(30)
    @IsOptional()
    secondLastName?: string;

    @ApiProperty()
    @IsString()
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @ApiProperty()
    @Type(() => Date) // 1. Convierte el string del JSON a objeto Date
    @IsDate()         // 2. Valida que sea una fecha válida
    hireDate!: Date;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    termDate?: Date;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    status!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    shiftType!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    jobRole!: string;

    @ApiProperty()
    @IsBoolean()
    @IsNotEmpty()
    firstTimeLoad!: boolean;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    empPriv!: string;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 2 })
    vacationBalance!: number;

    @ApiProperty()
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    balanceDateTime?: Date;

    @ApiProperty({default: 0})
    @IsNumber()
    start_day_of_payment!: number;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 2 })
    vacationsTaken!: number;


}
