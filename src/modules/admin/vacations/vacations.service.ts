import { Injectable, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { UpdateVacationDto } from './dto/update-vacation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Vacation } from './entities/vacation.entity';
import { Repository, DataSource } from 'typeorm'; // 🟢 Inyectamos DataSource

@Injectable()
export class VacationsService {
  private readonly logger = new Logger(VacationsService.name);

  constructor(
    @InjectRepository(Vacation)
    private vacationRepository: Repository<Vacation>,
    // 🟢 INYECTAMOS EL DATASOURCE PARA ADAPTACIÓN EN CALIENTE MULTI-TENANT
    private readonly dataSource: DataSource 
  ) {}

  // 🚀 MOTOR DE SINCRONIZACIÓN MASIVA DE VACACIONES (Alta Velocidad Atómica)
  async procesarSincronizacionMasiva(tenantId: string, empleadosMasivos: any[]) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    this.logger.log(`[Vacations-Bulk] Iniciando carga masiva para: ${tenantId}. Total: ${empleadosMasivos.length} empleados.`);

    try {
      // 1. Conmutamos en caliente al esquema físico de la empresa
      await queryRunner.query(`SET search_path TO ${tenantId}`);

      let vacacionesInsertadasTotal = 0;

      for (const emp of empleadosMasivos) {
        // Enlazar al usuario buscando su ID real mediante el RFC provisto por la app de escritorio
        const [userExiste] = await queryRunner.manager.query(
          `SELECT "userId" FROM users WHERE "userRFC" = $1 LIMIT 1`,
          [emp.userRFC]
        );

        if (!userExiste) {
          this.logger.warn(`[Vacations-Bulk] El RFC ${emp.userRFC} no existe en ${tenantId}. Saltando registro.`);
          continue;
        }

        const userIdReal = userExiste.userId;

        if (emp.vacaciones && emp.vacaciones.length > 0) {
          // 2. PURGA DE DUPLICADOS: Limpiamos los registros dentro del rango de fechas recibido
          for (const vac of emp.vacaciones) {
            await queryRunner.manager.query(
              `DELETE FROM vacations 
               WHERE "userId" = $1 
                 AND ("fechaInicio", "fechaFinal") OVERLAPS ($2::date, $3::date)`,
              [userIdReal, vac.fechaInicio, vac.fechaFinal]
            );
          }

          // 3. ARMADO DEL QUERY COMPACTO EN LOTE
          const valoresSql: any[] = [];
          const bloquesValores: string[] = [];
          let indiceParametro = 1;

          emp.vacaciones.forEach((vac: any) => {
            bloquesValores.push(`($${indiceParametro}, $${indiceParametro+1}, $${indiceParametro+2}, $${indiceParametro+3}, $${indiceParametro+4}, $${indiceParametro+5})`);
            
            valoresSql.push(
              userIdReal,
              vac.period,
              vac.recordType,
              vac.fechaInicio,
              vac.fechaFinal,
              vac.vacationDays || 0.00
            );

            indiceParametro += 6; // 6 parámetros por cada inserción vacacional
          });

          // Inserción directa respetando las comillas dobles obligatorias de Postgres por CamelCase
          const queryBulkVacaciones = `
            INSERT INTO vacations (
              "userId", period, "recordType", "fechaInicio", "fechaFinal", "vacationDays"
            ) 
            VALUES ${bloquesValores.join(', ')}
          `;

          await queryRunner.manager.query(queryBulkVacaciones, valoresSql);
          vacacionesInsertadasTotal += emp.vacaciones.length;
        }
      }

      await queryRunner.commitTransaction();

      return {
        status: 'success',
        message: 'Sincronización masiva de vacaciones procesada con éxito.',
        resumen: {
          totalEmpleadosProcesados: empleadosMasivos.length,
          totalRegistrosVacacionalesInsertados: vacacionesInsertadasTotal
        }
      };

    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`[Vacations-Bulk] Error crítico: ${error.message}`);
      throw new InternalServerErrorException('Error en la sincronización masiva de vacaciones: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }

  // 🟢 TRUNCATE ADAPTADO A MULTI-TENANT SEGURO
  async clearAndResetTable(tenantId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(`SET search_path TO ${tenantId}`);
      await queryRunner.query('TRUNCATE TABLE vacations RESTART IDENTITY CASCADE');
      await queryRunner.commitTransaction();
      return { status: 'success', message: `Base de datos de vacaciones de "${tenantId}" limpia.` };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`No se pudo limpiar la tabla de vacaciones para el tenant ${tenantId}: ` + error.message);
    } finally {
      await queryRunner.release();
    }
  }

  // ... (Tus métodos create, findAll, findAllByUser, update, remove se quedan igual) ...
  async create(createVacationDto: CreateVacationDto) {
    try {
      const newVacation = this.vacationRepository.create({
        userId: createVacationDto.userId,
        period: createVacationDto.period,
        recordType: createVacationDto.recordType,
        fechaInicio: createVacationDto.fechaInicio,
        fechaFinal: createVacationDto.fechaFinal,
        vacationDays: createVacationDto.vacationDays
      });
      await this.vacationRepository.save(newVacation);
      return newVacation;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  findAll() { return this.vacationRepository.find(); }
  findOne(id: number) { return `This action returns a #${id} vacation`; }
  async findAllByUser(userId: string) { return await this.vacationRepository.find({ where: { userId }, order: { fechaInicio: 'DESC' } }); }
  async findAllByUserId(userId: string): Promise<Vacation[]> { return await this.vacationRepository.find({ where: { userId }, order: { fechaInicio: 'DESC' } }); }
  update(id: number, updateVacationDto: UpdateVacationDto) { return `This action updates a #${id} vacation`; }
  async remove(userId: string) { const result = await this.vacationRepository.delete({userId}); if (result.affected === 0) throw new NotFoundException("El usuario no existe"); }
  async removeAll() { await this.vacationRepository.clear(); return `Se han borrado todos los registros de vacaciones`; }
}


/*
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
*/