// src/modules/admin/attendances/attendances.controller.ts
import { Controller, Get, Post, Delete, Body, Req, UseGuards, Param, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common'; // 🟢 Agregado BadRequestException
import { AttendancesService } from './attendances.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@ApiTags('Attendances (Asistencias)')
@ApiBearerAuth()
@Controller('attendances')
@UseGuards(JwtAuthGuard)
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Get('user')
  @ApiOperation({ summary: 'Obtener las asistencias recientes del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de asistencias del período actual devuelta con éxito.' })
  async getRecentByUser(@Req() req: any) {
    const userId = req.user.userId || req.user.id || req.user.sub;
    return this.attendancesService.findRecentByUser(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Insertar un registro de asistencia completo desde sistema externo',
    description: 'Crea un registro mapeando campos mixtos. Soporta el nuevo formato string para incidentId y horas extra en dailyHoursOVT.'
  })
  @ApiResponse({ status: 201, description: 'Asistencia insertada con éxito.' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos o formato incorrecto.' })
  @ApiResponse({ status: 404, description: 'El usuario especificado en el DTO no existe.' })
  async create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return await this.attendancesService.createAttendanceCompleto(createAttendanceDto);
  }

  // 🟢 1. ELIMINACIÓN MASIVA POR TENANT (MOVIDO ARRIBA Y ADAPTADO A MULTI-TENANT)
  @Delete('all')
  @ApiOperation({ 
    summary: 'Borra todos los registros y reinicia el ID',
    description: 'Ejecuta un TRUNCATE direccionado al esquema del Tenant para vaciar la tabla y resetear el contador identity a 1.' 
  })
  @ApiResponse({ status: 200, description: 'Tabla reseteada con éxito.' })
  @ApiResponse({ status: 400, description: 'Identificador de empresa no válido.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async borrarTodo(@Req() req: any) { // 🟢 Inyectamos Req para extraer el Tenant
    const rawTenant = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'];
    if (!rawTenant) {
      throw new BadRequestException('El header X-Tenant-ID es requerido para direccionar el esquema.');
    }
    const tenantIdLimpio = rawTenant.trim().toLowerCase();
    return await this.attendancesService.clearAndResetTable(tenantIdLimpio);
  }

  // 🔴 2. ELIMINACIÓN INDIVIDUAL POR USUARIO (MOVIDO ABAJO)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Eliminar todas las asistencias asociadas a un UUID de usuario',
    description: '🚨 NOTA: Este endpoint recibe el UUID del usuario y purga todo su historial de la tabla.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'UUID del usuario (user_id) cuyos registros se van a eliminar', 
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' 
  })
  @ApiResponse({ status: 200, description: 'Se eliminaron correctamente los registros de asistencia del usuario.' })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no corresponde a un UUID válido.' })
  @ApiResponse({ status: 404, description: 'No se encontraron registros de asistencia para el usuario con ese UUID.' })
  async remove(@Param('id') id: string) { 
    return await this.attendancesService.deleteAttendance(id);
  }
}
