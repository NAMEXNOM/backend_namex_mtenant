// src/auth/jwt.strategy.ts
/*import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Extrae el token del header "Authorization: Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // DEBE ser la misma clave que usaste en el AuthModule
      secretOrKey: process.env.JWT_SECRET || 'CLAVE_SECRETA_POR_DEFECTO', 
      //secretOrKey: 'MI_LLAVE_SECRETA_UNIFICADA_PORTAL_NAMEX_2026!', 
    });
  }

  async validate(payload: any) {
    // Lo que retornes aquí se inyectará en req.user
    // Asegúrate de que los nombres coincidan con tu JWT (ej: userId, userRFC)
    return { 
        userId: payload.userId, 
        userRFC: payload.userRFC 
    };
  }
}*/

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      // 1. Extrae el token del formato "Bearer <TOKEN>" enviado por Next.js
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      /*
      
      // 2. 🟢 SOLUCIÓN MAESTRA: Evaluador dinámico de firma por petición
      secretOrKeyProvider: (request: any, rawJwtToken: any, done: any) => {
        const secret = this.configService.get<string>('JWT_SECRET');
        
        if (!secret) {
          // Si el .env no ha cargado, usamos la clave de respaldo de tus módulos
          return done(null, 'CLAVE_SECRETA_POR_DEFECTO');
        }
        
        return done(null, secret);
      },*/
      secretOrKey: configService.get<string>('JWT_SECRET'), // 🟢 Usa la misma lectura asíncrona
    });
  }

  // 3. Este método se ejecuta únicamente si la firma fue válida
  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('El token no contiene un identificador de usuario válido');
    }
    
    // Retornamos el usuario firmado (Inyecta req.user en los controladores)
    return { 
      userId: payload.sub, 
      rfc: payload.rfc, 
      role: payload.role 
    };
  }
}
