// src/modules/admin/nominas/nominas.controller.ts
import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  Headers, 
  BadRequestException, 
  Body, 
  ValidationPipe,
  UseGuards 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NominasService } from './nominas.service';
import { UploadNominaDto } from './dto/upload-nomina.dto';
// 🟢 RUTAS OFICIALES REPARADAS BASADAS EN TU ESCÁNEO:
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; 
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';

@Controller('admin/nominas')
// 🚀 CAPA 1 y 2 DE PROTECCIÓN: Exige un Token JWT auténtico y evalúa el privilegio del usuario
@UseGuards(JwtAuthGuard, RolesGuard) 
export class NominasController {
  constructor(private readonly nominasService: NominasService) {}

  @Post('upload-mass-zip')
  // 🚀 CAPA 3: Restricción explícita. Solo 'admin' o 'administrador' (normalizado a toUpperCase) pasa de la red
  @Roles('admin', 'administrador')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }, // Límite de seguridad: 50MB
  }))
  async uploadMassZip(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
    @Headers('x-tenant-id') tenantId: string,
    @Body(new ValidationPipe({ transform: true })) metadata: UploadNominaDto 
  ) {
    if (!file) {
      throw new BadRequestException('El archivo ZIP es requerido');
    }
    if (!tenantId) {
      throw new BadRequestException('El header x-tenant-id es requerido');
    }
    
    // Ejecuta el extractor inteligente con la fecha del XML y guardado Multi-Tenant
    return await this.nominasService.procesarZipEnMemoria(
      file.buffer, 
      tenantId, 
      metadata
    );
  }
}




/*
// src/modules/admin/nominas/nominas.controller.ts
import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  Headers, 
  BadRequestException, 
  Body, 
  ValidationPipe 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NominasService } from './nominas.service';
import { UploadNominaDto } from './dto/upload-nomina.dto';
// 🟢 IMPORTAMOS NUESTRO NUEVO CANDADO DE CONTROL DE ACCESO
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';

@Controller('admin/nominas')
// 🚀 CAPA 1 y 2 DE PROTECCIÓN: Primero valida que el Token JWT sea real, y luego evalúa sus Roles
@UseGuards(JwtAuthGuard, RolesGuard) 
export class NominasController {
  constructor(private readonly nominasService: NominasService) {}

  @Post('upload-mass-zip')

  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }, // Límite: 50MB
  }))
  async uploadMassZip(
    // 🟢 Evadimos el error de Express.Multer.File usando la firma directa del objeto requerido
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
    @Headers('x-tenant-id') tenantId: string,
    @Body(new ValidationPipe({ transform: true })) metadata: UploadNominaDto // 🟢 Captura los metadatos del periodo
  ) {
    if (!file) {
      throw new BadRequestException('El archivo ZIP es requerido');
    }
    if (!tenantId) {
      throw new BadRequestException('El header x-tenant-id es requerido');
    }
    
    // 🟢 Enviamos de forma exitosa los 3 argumentos requeridos por tu nuevo servicio
    return await this.nominasService.procesarZipEnMemoria(
      file.buffer, 
      tenantId, 
      metadata
    );
  }
}

*/