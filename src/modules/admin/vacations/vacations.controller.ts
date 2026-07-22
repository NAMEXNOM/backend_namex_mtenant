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
