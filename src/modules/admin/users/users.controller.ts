// src/modules/admin/users/users.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request, 
  BadRequestException 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { EmpleadoSyncDto, BulkSyncEnvelopeDto  } from './dto/bulk-sync.dto'; 

@ApiTags('users')
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 1. Endpoint para borrar y re-inyectar al Administrador Semilla
  @Delete('all')
  @UseGuards(RolesGuard) // 🟢 BLINDADO: Activa el policía de roles
  @Roles('admin', 'administrador') // 🚫 BLINDADO: Impide que usuarios normales borren la base de datos
  @ApiOperation({ 
    summary: 'Borra todos los registros y reinicia el ID',
    description: 'Ejecuta un TRUNCATE direccionado al esquema del Tenant para vaciar la tabla y resetear el contador identity a 1.' 
  })
  @ApiResponse({ status: 200, description: 'Tabla reseteada con éxito.' })
  @ApiResponse({ status: 400, description: 'Identificador de empresa no válido.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async borrarTodo(
    @Request() req: any 
  ) {
    const rawTenant = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'];
    if (!rawTenant) {
      throw new BadRequestException('El header X-Tenant-ID es requerido para direccionar el esquema.');
    }
    const tenantIdLimpio = rawTenant.trim().toLowerCase();
    return await this.usersService.clearAndResetTable(tenantIdLimpio);
  }

  // 2. NUEVO ENDPOINT: Sincronización Masiva (Bulk Load Validado)
  @Post('bulk-synchronization')
  @UseGuards(RolesGuard) 
  @Roles('admin', 'administrador')
  @ApiOperation({ 
    summary: 'Sincronización masiva quincenal/mensual de empleados y asistencias desde app de escritorio',
    description: 'Recibe un JSON jerárquico para insertar o actualizar personal y asistencias en un solo bloque.' 
  })
  @ApiBody({ 
    type: BulkSyncEnvelopeDto, 
    description: 'Objeto contenedor con el arreglo de trabajadores.' 
  })
  @ApiResponse({ status: 201, description: 'Sincronización masiva procesada exitosamente.' })
  async bulkSync(
    @Request() req: any,
    @Body() body: BulkSyncEnvelopeDto 
  ) {
    const rawTenant = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'];
    if (!rawTenant) {
      throw new BadRequestException('El header X-Tenant-ID es requerido.');
    }
    const tenantIdLimpio = rawTenant.trim().toLowerCase();
    
    return await this.usersService.procesarSincronizacionMasiva(tenantIdLimpio, body.empleados);
  }

  @Post()
  @UseGuards(RolesGuard) // 🟢 BLINDADO: Solo administradores pueden crear usuarios uno a uno
  @Roles('admin', 'administrador')
  create(@Body() createUserDto: CreateUserDto) {
    console.log("Guardando en controlador ... ", createUserDto);
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(RolesGuard) // 🟢 BLINDADO: Evita que empleados comunes listen a todo el personal de la empresa
  @Roles('admin', 'administrador', 'rh') // Permite también a Recursos Humanos consultar
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':userRFC')
  findOne(@Param('userRFC') userRFC: string) {
    // 💡 Este se queda libre de roles para que el usuario pueda consultar su propio perfil
    return this.usersService.findOne(userRFC);
  }

  @Patch(':userRFC')
  @UseGuards(RolesGuard) // 🟢 BLINDADO: Solo administradores pueden modificar datos de personal
  @Roles('admin', 'administrador')
  update(@Param('userRFC') userRFC: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(userRFC, updateUserDto);
  }

  @Delete(':userRFC')
  @UseGuards(RolesGuard) // 🟢 BLINDADO: Bloqueo estricto para despidos/bajas de sistema
  @Roles('admin', 'administrador')
  remove(@Param('userRFC') userRFC: string) {
    return this.usersService.remove(userRFC);
  }
}


/*
// src/modules/admin/users/users.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request, 
  BadRequestException 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
// 🟢 IMPORTAMOS LOS DECORADORES EXCLUSIVOS DE SWAGGER PARA ARREGLOS
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { EmpleadoSyncDto, BulkSyncEnvelopeDto  } from './dto/bulk-sync.dto'; // 🟢 Asegura que creaste este archivo DTO en tu PC

@ApiTags('users')
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 1. Endpoint para borrar y re-inyectar al Administrador Semilla
  @Delete('all')
  @ApiOperation({ 
    summary: 'Borra todos los registros y reinicia el ID',
    description: 'Ejecuta un TRUNCATE direccionado al esquema del Tenant para vaciar la tabla y resetear el contador identity a 1.' 
  })
  @ApiResponse({ status: 200, description: 'Tabla reseteada con éxito.' })
  @ApiResponse({ status: 400, description: 'Identificador de empresa no válido.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async borrarTodo(
    @Request() req: any 
  ) {
    const rawTenant = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'];
    if (!rawTenant) {
      throw new BadRequestException('El header X-Tenant-ID es requerido para direccionar el esquema.');
    }
    const tenantIdLimpio = rawTenant.trim().toLowerCase();
    return await this.usersService.clearAndResetTable(tenantIdLimpio);
  }

  
  // 🟢 CONFIGURACIÓN ESTÁNDAR Y DE ALTA COMPATIBILIDAD DE SWAGGER
  // 🟢 2. NUEVO ENDPOINT: Sincronización Masiva (Bulk Load Validado)
  @Post('bulk-synchronization')
  @UseGuards(RolesGuard) 
  @Roles('admin', 'administrador')
  @ApiOperation({ 
    summary: 'Sincronización masiva quincenal/mensual de empleados y asistencias desde app de escritorio',
    description: 'Recibe un JSON jerárquico para insertar o actualizar personal y asistencias en un solo bloque.' 
  })
  @ApiBody({ 
    type: BulkSyncEnvelopeDto, 
    description: 'Objeto contenedor con el arreglo de trabajadores.' 
  })
  @ApiResponse({ status: 201, description: 'Sincronización masiva procesada exitosamente.' })
  async bulkSync(
    @Request() req: any,
    @Body() body: BulkSyncEnvelopeDto // 🟢 Cambiado por el DTO contenedor para activar class-validator
  ) {
    const rawTenant = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'];
    if (!rawTenant) {
      throw new BadRequestException('El header X-Tenant-ID es requerido.');
    }
    const tenantIdLimpio = rawTenant.trim().toLowerCase();
    
    // Pasamos el arreglo interno al método del servicio que ya teníamos listo
    return await this.usersService.procesarSincronizacionMasiva(tenantIdLimpio, body.empleados);
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

*/