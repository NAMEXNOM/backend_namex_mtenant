import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../admin/users/users.module'; 
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Importación de herramientas de entorno

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './guards/strategies/jwt.strategy'; 

@Module({
  imports: [
    UsersModule, 
    PassportModule.register({ defaultStrategy: 'jwt' }), 
    
    // 🟢 1. SOLUCIÓN ASÍNCRONA PARA EL JWT: Espera al .env y evita la firma inválida
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Lee del .env de forma segura
        signOptions: { expiresIn: '24h' }, // Mantiene tus 24 horas de expiración
      }),
    }),
    
    // 2. Configuración asíncrona del correo (Ya validada y funcionando)
    MailerModule.forRootAsync({
      imports: [ConfigModule], 
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST'),
          port: parseInt(configService.get<string>('MAIL_PORT') || '465', 10),
          secure: configService.get<string>('MAIL_PORT') === '465', 
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASS'),
          },
        },
        defaults: {
          from: configService.get<string>('MAIL_FROM') || '"Soporte Sistema" <noreply@mpsnamex.com>',
        },
      }),
    }),
  ],
  controllers: [AuthController], 
  providers: [AuthService, JwtStrategy, JwtAuthGuard], 
  // 🟢 3. EXPORTS OPTIMIZADOS: Exportamos Passport y Jwt para que VacationsModule los herede automáticamente
  exports: [AuthService, JwtStrategy, JwtAuthGuard, PassportModule, JwtModule],   
})
export class AuthModule {}
