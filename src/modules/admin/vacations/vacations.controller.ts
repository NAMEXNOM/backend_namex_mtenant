// src/modules/admin/vacations/vacations.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, BadRequestException } from '@nestjs/common';
import { VacationsService } from './vacations.service';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { UpdateVacationDto } from './dto/update-vacation.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger'; // 🟢 Agregados ApiTags y ApiBody
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; 
import { RolesGuard } from '../../../shared/guards/roles.guard'; // 🟢 Guardian de roles
import { Roles } from '../../../shared/decorators/roles.decorator'; // 🟢 Decorador de roles
import { VacationsBulkEnvelopeDto } from './dto/vacations-bulk.dto'; // 🟢 Importamos el DTO Contenedor

@ApiTags('Vacations (Vacaciones)') // 🟢 Organiza la UI de Swagger de forma limpia
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) 
@Controller('vacations')
export class VacationsController {
  constructor(private readonly vacationsService: VacationsService) {}

  // 🟢 1. NUEVO ENDPOINT: Sincronización Masiva Vacacional (Bulk Load)
  @Post('bulk-synchronization')
  @UseGuards(RolesGuard) 
  @Roles('admin', 'administrador')
  @ApiOperation({ 
    summary: 'Sincronización masiva de periodos vacacionales desde app de escritorio',
    description: 'Recibe un JSON jerárquico validado en cascada para registrar periodos vacacionales por lote.' 
  })
  @ApiBody({ 
    type: VacationsBulkEnvelopeDto, 
    description: 'Objeto contenedor con el listado de empleados y sus vacaciones.' 
  })
  @ApiResponse({ status: 201, description: 'Sincronización masiva procesada exitosamente.' })
  async bulkSync(
    @Req() req: any,
    @Body() body: VacationsBulkEnvelopeDto
  ) {
    const rawTenant = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'];
    if (!rawTenant) {
      throw new BadRequestException('El header X-Tenant-ID es requerido.');
    }
    const tenantIdLimpio = rawTenant.trim().toLowerCase();
    return await this.vacationsService.procesarSincronizacionMasiva(tenantIdLimpio, body.empleados);
  }

  @Post()
  create(@Body() createVacationDto: CreateVacationDto) {
    return this.vacationsService.create(createVacationDto);
  }

  // 🟢 2. ELIMINACIÓN MASIVA POR TENANT (MOVIDO ARRIBA PARA EVITAR CONFLICTOS)
  @Delete('all')
  @ApiOperation({ 
    summary: 'Borra todos los registros y reinicia el ID',
    description: 'Ejecuta un TRUNCATE direccionado al esquema del Tenant para vaciar la tabla y resetear el contador identity a 1.' 
  })
  @ApiResponse({ status: 200, description: 'Tabla reseteada con éxito.' })
  @ApiResponse({ status: 400, description: 'Identificador de empresa no válido.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async borrarTodo(@Req() req: any) { // 🟢 Inyectamos Req para extraer el Tenant de las cabeceras
    const rawTenant = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'];
    if (!rawTenant) {
      throw new BadRequestException('El header X-Tenant-ID es requerido para direccionar el esquema.');
    }
    const tenantIdLimpio = rawTenant.trim().toLowerCase();
    return await this.vacationsService.clearAndResetTable(tenantIdLimpio);
  }

  // URL: GET http://localhost:5000/vacations/user?userId=VALOR
  @Get('user')
  async getVacationsByUserId(@Query('userId') userId: string) {
    return await this.vacationsService.findAllByUserId(userId);
  }

  @Get()
  findAll() {
    return this.vacationsService.findAll();
  }

  @Get(':userId')
  @ApiOperation({ 
    summary: 'Busca un userId específico',
    description: 'Devuelve todos los valores coincidentes con el userId'
  })
  findAllByUserId(@Param('userId') userId: string) {
    return this.vacationsService.findAllByUserId(userId); 
  }

  // 🔴 3. ELIMINACIÓN INDIVIDUAL POR USUARIO (MOVIDO ABAJO)
  @Delete(':userId')
  @ApiOperation({ summary: 'Borra todos los detalles de vacaciones de un userId específico'})
  remove(@Param('userId') userId: string) {
    return this.vacationsService.remove(userId);
  }
}



/*
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { VacationsService } from './vacations.service';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { UpdateVacationDto } from './dto/update-vacation.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger/dist';

// 🚫 BORRA la importación vieja de: import { AuthGuard } from './../../auth/auth.guard';

// 🟢 1. IMPORTA TU GUARDIÁN UNIFICADO REAL DE LA CARPETA MODULES:
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; 

@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // 🚨 2. REPARADO: Activamos tu guardián de tokens real para proteger todo el controlador
@Controller('vacations')
export class VacationsController {
  constructor(private readonly vacationsService: VacationsService) {}

  @Post()
  create(@Body() createVacationDto: CreateVacationDto) {
    return this.vacationsService.create(createVacationDto);
  }

  // URL: GET http://localhost:5000/vacations/user?userId=VALOR
  @Get('user')
  async getVacationsByUserId(@Query('userId') userId: string) {
    return await this.vacationsService.findAllByUserId(userId);
  }

// Mantiene tu método global por si necesitas listar todo como admin
  @Get()
  findAll() {
    return this.vacationsService.findAll();
  }

  @Get(':userId')
  @ApiOperation({ 
    summary: 'Busca un userId específico',
    description: 'Devuelve todos los valores coincidentes con el userId'
  })
  findAllByUserId(@Param('userId') userId: string) {
  return this.vacationsService.findAllByUserId(userId); // 
  }


  @Delete('all')
  @ApiOperation({ 
    summary: 'Borra todos los registros y reinicia el ID',
    description: 'Ejecuta un TRUNCATE en Postgres para vaciar la tabla y resetear el contador identity a 1.' 
  })
  @ApiResponse({ status: 200, description: 'Tabla reseteada con éxito.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async borrarTodo() {
    return await this.vacationsService.clearAndResetTable();
  }


 // @Delete('user/:userId')
  @Delete(':userId')
  @ApiOperation({ summary: 'Borra todos los detalles de vaciones de un userId específico'})
  remove(@Param('userId') userId: string) {
    return this.vacationsService.remove(userId);
  }


}
*/