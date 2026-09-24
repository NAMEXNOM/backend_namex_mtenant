import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger/dist';
import { AuthGuard } from './../../auth/auth.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';



@ApiBearerAuth() 
@UseGuards(JwtAuthGuard) // 🚨 2. REPARADO: Activamos tu guardián de tokens real para proteger todo el controlador
// @UseGuards(AuthGuard)   // Este decorador hace que se habiliten los guardias de las autorizaciones.
@Controller('users')
export class UsersController {
  //inyeccion de dependencia
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    console.log("Guardando en controlador ... ",createUserDto)
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

  @Delete('all')
  @ApiOperation({ 
    summary: 'Borra todos los registros y reinicia el ID',
    description: 'Ejecuta un TRUNCATE en Postgres para vaciar la tabla y resetear el contador identity a 1.' 
  })
  @ApiResponse({ status: 200, description: 'Tabla reseteada con éxito.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async borrarTodo() {
    return await this.usersService.clearAndResetTable();
  }

}
