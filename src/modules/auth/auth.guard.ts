import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(private jwtService: JwtService){    // tenemos que inyectar el servicio

  }  

  async canActivate(   // se agrega async
    context: ExecutionContext,
  ): Promise<boolean>  {
    // agregamos una constante para captura de lo que quiere el cliente
    const request = context.switchToHttp().getRequest();
    // usamos un separador para el bearer y el token buscando el espacio que hay entre ellos
    // Bearer FDKIJOSJIDFAFIKDA    03/31/2026  RAP 
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (!token){      // si no existe el token
      throw new UnauthorizedException();  
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {secret: process.env.JWT_SECRET})  //comparar contra el secreto guardado
      request['user'] = payload;
    } catch(error){
      throw new UnauthorizedException();
    }

    return true;
  }
}
