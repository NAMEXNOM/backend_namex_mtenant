import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MaxLength, MinLength } from "class-validator";

export class LoginAuthDto{  //aqui se pueden validar los tipos de datos

    @ApiProperty({description: "Ingrese un RFC válido"})
    @IsNotEmpty()
    userRFC: string;

    @ApiProperty()
    @MinLength(6)
    @MaxLength(30)
    @IsNotEmpty()
    password: string;
}