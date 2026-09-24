// src/modules/admin/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiBearerAuth() 
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Delete('all')
  @ApiOperation({ 
    summary: 'Borra todos los registros y reinicia el ID',
    description: 'Ejecuta un TRUNCATE direccionado al esquema del Tenant para vaciar la tabla y resetear el contador identity a 1.' 
  })
  @ApiResponse({ status: 200, description: 'Tabla reseteada con éxito.' })
  @ApiResponse({ status: 400, description: 'Identificador de empresa no válido.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async borrarTodo(
    @Request() req: any // 🚀 CAPTURAMOS LA PETICIÓN DE RED EN VIVO
  ) {
    // Extraemos el encabezado de forma segura buscando tanto en minúsculas como en mayúsculas
    const rawTenant = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'];

    if (!rawTenant) {
      throw new BadRequestException('El header X-Tenant-ID es requerido para direccionar el esquema.');
    }

    // 🟢 NORMALIZACIÓN EXTRACTORA: Forzamos el esquema a minúsculas limpias para pasar los pipes de NestJS
    const tenantIdLimpio = rawTenant.trim().toLowerCase();
    
    return await this.usersService.clearAndResetTable(tenantIdLimpio);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    console.log("Guardando en controlador ... ", createUserDto);
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':userRFC')
  findOne(@Param('userRFC') userRFC: string) {
    return this.usersService.findOne(userRFC);
  }

  @Patch(':userRFC')
  update(@Param('userRFC') userRFC: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(userRFC, updateUserDto);
  }

  @Delete(':userRFC')
  remove(@Param('userRFC') userRFC: string) {
    return this.usersService.remove(userRFC);
  }
}
