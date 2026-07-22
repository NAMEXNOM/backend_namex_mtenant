import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../admin/users/users.service';  
import { JwtService } from '@nestjs/jwt'; 
import { MailerService } from '@nestjs-modules/mailer'; 
import * as bcrypt from 'bcrypt'; // 🚨 1. IMPORTACIÓN OBLIGATORIA DE BCRYPT

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService 
  ) {}

  async login(body: any) {
    const { userRFC, password } = body;



    if (!userRFC || !password) {
      throw new UnauthorizedException('RFC y contraseña son requeridos');
    }

    const user = await this.usersService.findOneByRfc(userRFC);

    //console.log("Contraseña de la DB:", user?.password);
    //console.log("Contraseña que digitaste:", password);

    // 🚨 2. COMPARACIÓN SEGURA CON BCRYPT REPARADA
    if (!user || !user.password) {
      throw new UnauthorizedException('RFC o contraseña incorrectos'); 
    }

    // Comparamos el texto plano del formulario contra el hash de la base de datos
    const passwordValido = await bcrypt.compare(password, user.password);
    
    if (!passwordValido) {
      throw new UnauthorizedException('RFC o contraseña incorrectos'); 
    }

    const nombreCompleto = `${user.name || ''} ${user.firstLastName || ''} ${user.secondLastName || ''}`.trim();
    const nombreRol = user.roles?.[0]?.name || 'sin-rol';
  
    const payload = { sub: user.userId, rfc: user.userRFC, role: nombreRol };

    return {
      userId:  user.userId, 
      userName: nombreCompleto,
      role: nombreRol,
      userBalance: user.vacationBalance || 0,
      vacationsTaken: user.vacationsTaken || 0,
      firstTimeLoad: user.firstTimeLoad, 
      status: user.status,
      access_token: await this.jwtService.signAsync(payload)  
    };
  }

  async sendTemporaryPassword(body: any) {
    const { userRFC, email } = body;

    if (!userRFC || !email) {
      throw new UnauthorizedException('RFC y correo electrónico son requeridos');
    }

    const user = await this.usersService.findByRfcAndEmail(userRFC, email);

    if (!user) {
      throw new NotFoundException('Los datos ingresados no coinciden con nuestros registros');
    }

    const tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase(); 

    // Aquí guardamos con cifrado en la base de datos
    await this.usersService.setTemporaryPassword(user.userId, tempPassword);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Tu contraseña temporal de acceso',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 500px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2c3e50; text-align: center;">Hola, ${user.name}</h2>
            <p>Se ha solicitado una contraseña temporal para tu cuenta debido a un olvido o por ser tu primer inicio de sesión.</p>
            <p>Tu contraseña provisoria es:</p>
            <div style="background: #f4f6f7; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 3px; text-align: center; border-radius: 5px; color: #2c3e50; margin: 20px 0;">
              ${tempPassword}
            </div>
            <p style="color: #e74c3c; font-weight: bold;">Importante: Por motivos de seguridad, el sistema te obligará a cambiar esta contraseña inmediatamente después de ingresar.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <small style="color: #7f8c8d; display: block; text-align: center;">Si tú no solicitaste este proceso, ignora este correo o contacta a soporte.</small>
          </div>
        `,
      });
    } catch (mailError) {
      console.error('Detalle del error SMTP:', mailError);
      throw new Error('Error al enviar el correo electrónico de recuperación.');
    }

    return { 
      message: 'Se ha enviado una contraseña temporal a tu correo electrónico registrado.' 
    };
  }

      async changePasswordDefinitivo(body: any) {
    const { userId, password, currentPassword } = body;

    // 1. Validaciones básicas
    if (!userId || !password) {
      throw new UnauthorizedException('El identificador de usuario y la nueva contraseña son requeridos.');
    }

    // 2. Buscar al usuario
    const user = await this.usersService.findById(userId); 
    if (!user) {
      throw new NotFoundException('El usuario no existe en nuestros registros.');
    }

    // 3. Evaluar si es obligatorio
    const esObligatorio = user.firstTimeLoad === true || user.status === 'TEMPORAL';

    // 4. Validar contraseña actual si es cambio voluntario
    if (!esObligatorio) {
      if (!currentPassword) {
        throw new UnauthorizedException('La contraseña actual es requerida para realizar un cambio voluntario.');
      }

      const contraseñaActualValida = await bcrypt.compare(currentPassword, user.password);
      if (!contraseñaActualValida) {
        throw new UnauthorizedException('La contraseña actual introducida es incorrecta.');
      }
    }

    // 5. 🟢 ENVIAR CONTRASEÑA DIRECTA (Tu UsersService ya le aplica el hash correctamente)
    await this.usersService.updateToFinalPassword(userId, password);

    return {
      status: 200,
      message: 'Tu contraseña definitiva ha sido guardada con éxito.'
    };
  }


}



//

