import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { UpdateVacationDto } from './dto/update-vacation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Vacation } from './entities/vacation.entity';
import { Repository } from 'typeorm';


@Injectable()
export class VacationsService {

  constructor(
    @InjectRepository(Vacation)
    private vacationRepository: Repository<Vacation>
  ){


  }

  async create(createVacationDto: CreateVacationDto) {
    try {
    const newVacation = this.vacationRepository.create({
      userId: createVacationDto.userId,
      period: createVacationDto.period,
      recordType: createVacationDto.recordType,
      fechaInicio: createVacationDto.fechaInicio,
      fechaFinal: createVacationDto.fechaFinal,
      vacationDays: createVacationDto.vacationDays
    }) 
    
    
      await this.vacationRepository.save(newVacation);
      return newVacation;

    } catch (error) {
      console.error(error); // ESTO TE MOSTRARÁ EL ERROR REAL EN LA CONSOLA
        throw error;
    }
    
  }

  findAll() {
    return this.vacationRepository.find();
  }


  findOne(id: number) {
  //  console.log('Primero');
    return `This action returns a #${id} vacation`;
  }

  async findAllByUser(userId: string) {
  //  console.log('Segundo');
  return await this.vacationRepository.find({
    where: { userId: userId }, // Filtro indispensable
    order: {
      fechaInicio: 'DESC',
    },
  });
}


  
  // Buscar todas las vacaciones de un usuario específico
  async findAllByUserId(userId: string): Promise<Vacation[]> {
  //  console.log('Tercero');
    return await this.vacationRepository.find({
      where: {
        userId: userId // Filtra por la columna userId
      },
      order: {
        fechaInicio: 'DESC' // Opcional: ordenar por la más reciente
      }
    });
  }

  update(id: number, updateVacationDto: UpdateVacationDto) {
    return `This action updates a #${id} vacation`;
  }

  async remove(userId: string) {
    const result = await this.vacationRepository.delete({userId})
    if (result.affected === 0) throw new NotFoundException("El usuario no existe")
   // return `This action removes a #${userId} vacation`;
  }

  async removeAll() {
    const result = await this.vacationRepository.clear()
    return `Se han borrado todos los registros de vacaciones`;
  }

  async clearAndResetTable() {
    try {
      // TRUNCATE es la forma más limpia en Postgres para borrar y reiniciar IDs
      await this.vacationRepository.query('TRUNCATE TABLE vacations RESTART IDENTITY CASCADE');
      return { message: 'Base de datos de vacaciones limpia y contador reiniciado a 1' };
    } catch (error) {
      throw new InternalServerErrorException('No se pudo limpiar la tabla: ' + error.message);
    }
  }


}
