// src/modules/admin/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Headers, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiBearerAuth() 
@UseGuards(JwtAuthGuard) // 🚀 Capa de protección obligatoria JWT
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 🟢 UBICACIÓN CRÍTICA: Se posiciona arriba de :userRFC para evitar colisiones en Swagger [1.1]
  @Delete('all')
  @ApiOperation({ 
    summary: 'Borra todos los registros y reinicia el ID',
    description: 'Ejecuta un TRUNCATE direccionado al esquema del Tenant para vaciar la tabla y resetear el contador identity a 1.' 
  })
  @ApiResponse({ status: 200, description: 'Tabla reseteada con éxito.' })
  @ApiResponse({ status: 400, description: 'Falta el encabezado de Tenant.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async borrarTodo(
    @Headers('x-tenant-id') tenantId: string // 🚀 Captura el Tenant directo de la API web
  ) {
    if (!tenantId) {
      throw new BadRequestException('El header x-tenant-id es requerido para direccionar la base de datos.');
    }
    return await this.usersService.clearAndResetTable(tenantId);
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
