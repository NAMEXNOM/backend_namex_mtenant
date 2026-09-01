// src/modules/admin/nominas/nominas.controller.ts
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

@Controller('admin/nominas')
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





/*
import { Controller, Post, UseInterceptors, UploadedFile, Headers, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NominasService } from './nominas.service';

@Controller('admin/nominas')
export class NominasController {
  constructor(private readonly nominasService: NominasService) {}

  @Post('upload-mass-zip')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }, // Límite: 50MB
  }))
  async uploadMassZip(
    // CAMBIO DE TIPO: Usamos 'any' temporalmente o la firma de objeto directo para evadir el error del compilador
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!file) {
      throw new BadRequestException('El archivo ZIP es requerido');
    }
    if (!tenantId) {
      throw new BadRequestException('El header x-tenant-id es requerido');
    }
    
    return await this.nominasService.procesarZipEnMemoria(file.buffer, tenantId);
  }
}
*/