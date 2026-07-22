import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  
  // 🚨 MÉTODO DE ESPIONAJE AGREGADO: Rastrea por qué Passport da 401
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      console.error("======================================================");
      console.error("❌ ERROR DETECTADO POR EL GUARDIÁN JWT:", info?.message || info);
      console.error("======================================================");
      throw err || new UnauthorizedException('Acceso no autorizado al módulo');
    }
    return user;
  }
}
