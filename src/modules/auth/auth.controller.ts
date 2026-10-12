/*
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

// 🟢 1. IMPORTA TU DTO DE LOGIN EXACTO:
import { LoginAuthDto } from './dto/login-auth.dto'; // Ajusta la ruta si tus carpetas varían

@ApiTags('Autenticación') // 🟢 Organiza este bloque en tu panel de Swagger
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión con RFC de usuario' })
  @ApiResponse({ status: 200, description: 'Login exitoso. Devuelve token de acceso.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  // 🟢 2. REPARADO: Cambiamos "body: any" por tu DTO estructurado
  async login(@Body() loginAuthDto: LoginAuthDto) {
    // Deja que el servicio responda directamente. 
    // Si el servicio lanza un error, NestJS lo enviará con su código HTTP correcto de forma automática.
    return await this.authService.login(loginAuthDto);
  }

  @Post('recover-password')
  @ApiOperation({ summary: 'Recuperar contraseña (Emite contraseña temporal)' })
  // 💡 Tipado temporal con los campos que comúnmente usa tu base de datos para recuperar
  async recoverPassword(@Body() body: { userRFC: string }) {
    // Llama al método que configuramos en tu auth.service
    return await this.authService.sendTemporaryPassword(body);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Cambio de contraseña definitivo' })
  async changePassword(@Body() body: any) {
    return await this.authService.changePasswordDefinitivo(body);
  }
}
  */


import { Controller, Post, Body, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginAuthDto } from './dto/login-auth.dto'; 
import { ChangePasswordDto } from './dto/change-password.dto'; // 🟢 Importamos el nuevo DTO

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}


@Post('login')
  @ApiOperation({ summary: 'Iniciar sesión con RFC de usuario' })
  @ApiResponse({ status: 200, description: 'Login exitoso. Devuelve token de acceso.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  async login(
    @Request() req: any, // 🟢 Inyectamos la petición HTTP para capturar cabeceras de red
    @Body() loginAuthDto: LoginAuthDto
  ) {
    // 🚀 Extraemos de forma segura el Tenant ID sin importar mayúsculas o minúsculas en el header
    const rawTenant = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'];
    const tenantIdLimpio = rawTenant ? rawTenant.trim().toLowerCase() : null;

    // 🟢 Pasamos las credenciales y el Tenant ID extraído directo al servicio
    return await this.authService.login(loginAuthDto, tenantIdLimpio);
  }
  /*
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión con RFC de usuario' })
  @ApiResponse({ status: 200, description: 'Login exitoso. Devuelve token de acceso.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  async login(@Body() loginAuthDto: LoginAuthDto) {
    return await this.authService.login(loginAuthDto);
  }
*/

  @Post('recover-password')
  @ApiOperation({ summary: 'Recuperar contraseña (Emite contraseña temporal)' })
  async recoverPassword(@Body() body: { userRFC: string }) {
    return await this.authService.sendTemporaryPassword(body);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Cambio de contraseña definitivo' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada con éxito.' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
  @ApiResponse({ status: 401, description: 'Contraseña actual incorrecta o faltante.' })
  @ApiResponse({ status: 404, description: 'El usuario no existe.' })
  // 🟢 REPARADO: Cambiamos "body: any" por "changePasswordDto: ChangePasswordDto"
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return await this.authService.changePasswordDefinitivo(changePasswordDto);
  }
}
