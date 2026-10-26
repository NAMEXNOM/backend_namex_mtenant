// src/modules/admin/nominas/nominas.controller.ts
import { 
  Controller, 
  Post, 
  Get, // 👈 ¡ASEGÚRATE DE QUE ESTA IMPORTACIÓN EXISTE!
  Delete,
  UseInterceptors, 
  UploadedFile, 
  Headers, 
  BadRequestException, 
  Body, 
  ValidationPipe,
  UseGuards,
  HttpCode,
  HttpStatus 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NominasService } from './nominas.service';
import { UploadNominaDto } from './dto/upload-nomina.dto';
import { RollbackNominaDto } from './dto/rollback-nomina.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; 
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';

@Controller('admin/nominas')
@UseGuards(JwtAuthGuard, RolesGuard) 
export class NominasController {
  constructor(private readonly nominasService: NominasService) {}

  @Post('upload-mass-zip')
  @Roles('admin', 'administrador')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 },
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
    
    return await this.nominasService.procesarZipEnMemoria(
      file.buffer, 
      tenantId, 
      metadata
    );
  }

  // 🔄 NUEVA RUTA: Expone el catálogo de periodos con datos reales para el Dropdown
  @Get('periodos-activos')
  @Roles('admin', 'administrador')
  async obtenerPeriodosActivos(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('El header x-tenant-id es requerido');
    }
    
    const periodos = await this.nominasService.listarPeriodosConRecibos(tenantId);
    return {
      success: true,
      data: periodos,
    };
  }

  @Delete('rollback')
  @Roles('admin', 'administrador')
  @HttpCode(HttpStatus.OK)
  async rollbackMassive(
    @Headers('x-tenant-id') tenantId: string,
    @Body(new ValidationPipe({ transform: true })) metadata: RollbackNominaDto
  ) {
    if (!tenantId) {
      throw new BadRequestException('El header x-tenant-id es requerido');
    }

    const resultado = await this.nominasService.revertirPeriodoMultiTenant(tenantId, metadata);
    
    return {
      success: true,
      message: `Reversión completada con éxito. Se eliminaron ${resultado.destroyedCount} recibos de la base de datos y de AWS S3.`,
      data: resultado,
    };
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

*/

