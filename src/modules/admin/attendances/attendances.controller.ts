/*
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
//import { AuthGuard } from '@nestjs/passport';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger/dist';


@ApiBearerAuth()
@Controller('attendances')
@UseGuards(JwtAuthGuard)
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  
  @Get('user')
  async getRecentByUser(@Req() req: any) {

    // Extraemos el sub (ID de usuario) o el id que guarda tu estrategia JWT en la petición
    const userId = req.user.userId || req.user.id || req.user.sub;
    return this.attendancesService.findRecentByUser(userId);
  }
}
*/

/*

import { Controller, Get, Post, Delete, Body, Req, UseGuards, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@ApiBearerAuth()
@Controller('attendances')
@UseGuards(JwtAuthGuard)
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Get('user')
  @ApiOperation({ summary: 'Obtener las asistencias recientes del usuario autenticado' })
  async getRecentByUser(@Req() req: any) {
    const userId = req.user.userId || req.user.id || req.user.sub;
    return this.attendancesService.findRecentByUser(userId);
  }

    @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Insertar un registro de asistencia completo desde sistema externo' })
  @ApiResponse({ status: 201, description: 'Asistencia insertada con éxito.' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
  async create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return await this.attendancesService.createAttendanceCompleto(createAttendanceDto);
  }


  // 2. 🟢 NUEVO - MÉTODO DELETE: Eliminar un registro de asistencia por ID (Ej: para Administradores)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un registro de asistencia específico' })
  @ApiResponse({ status: 200, description: 'Registro de asistencia eliminado con éxito.' })
  @ApiResponse({ status: 404, description: 'El registro de asistencia no existe.' })
  async remove(@Param('id') id: string) { // Cambia a 'number' si tus IDs en la DB son autoincrementables
    return await this.attendancesService.deleteAttendance(id);
  }
}
*/

import { Controller, Get, Post, Delete, Body, Req, UseGuards, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@ApiTags('Attendances (Asistencias)') // 🟢 Agregado para organizar la UI de Swagger
@ApiBearerAuth()
@Controller('attendances')
@UseGuards(JwtAuthGuard)
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Get('user')
  @ApiOperation({ summary: 'Obtener las asistencias recientes del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de asistencias del período actual devuelta con éxito.' })
  async getRecentByUser(@Req() req: any) {
    // Extrae de forma segura el ID del payload del JWT de AWS/Passport
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
    // Recuerda que el método del service ejecuta: delete({ userId: id })
    return await this.attendancesService.deleteAttendance(id);
  }
}
