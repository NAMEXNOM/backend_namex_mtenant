import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { UsersService } from '../users/users.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Injectable()
export class AttendancesService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly usersService: UsersService,
  ) {}

  async findRecentByUser(userId: string) {
    // 🚨 REPARADO DEFINITIVO: Usamos el nuevo método de búsqueda por ID
    const user = await this.usersService.findById(userId); 
    
    // 1. Obtenemos su día de inicio de pago asignado
    const startDay = user.startDayOfPayment || 1;
    const today = new Date();
    
    // Convertir día de JavaScript (0=Dom, 1=Lun) a nuestro estándar (1=Lun, 7=Dom)
    const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

    // Calcular cuántos días restar para llegar al inicio del período actual
    let daysToSubtract = currentDayOfWeek - startDay;
    if (daysToSubtract < 0) {
      daysToSubtract += 7; 
    }

    // Fecha exacta del inicio del período de pago actual (Semana 1)
    const currentPeriodStart = new Date(today);
    currentPeriodStart.setDate(today.getDate() - daysToSubtract);
    currentPeriodStart.setHours(0, 0, 0, 0);

    // Para acumular 3 períodos completos, restamos 14 días adicionales hacia atrás
    const threeWeeksAgoStart = new Date(currentPeriodStart);
    threeWeeksAgoStart.setDate(currentPeriodStart.getDate() - 14);

    // La fecha de fin es el cierre del período actual (Inicio + 6 días)
    const currentPeriodEnd = new Date(currentPeriodStart);
    currentPeriodEnd.setDate(currentPeriodStart.getDate() + 6);
    currentPeriodEnd.setHours(23, 59, 59, 999);

    // Convertir a texto plano YYYY-MM-DD compatible con el campo DATE de Postgres
    const startDateStr = threeWeeksAgoStart.toISOString().split('T')[0];
    const endDateStr = currentPeriodEnd.toISOString().split('T')[0];

    // 2. Ejecutar consulta optimizada filtrando por el rango calculado
    const attendances = await this.attendanceRepository.find({
      where: {
        userId: userId,
        recDate: Between(startDateStr, endDateStr),
      },
      order: {
        recDate: 'ASC',
      },
    });

    // 3. Retornar los datos junto con la configuración para que el Front agrupe fácilmente
    return {
      userId,
      config: {
        startDayOfPayment: startDay,
        periodStartDate: startDateStr,
        periodEndDate: endDateStr,
      },
      attendances,
    };
  }

/*
    async createAttendanceCompleto(dto: CreateAttendanceDto): Promise<{ status: number; message: string; data: Attendance }> {
    // 1. Validar que el usuario exista
    const user = await this.usersService.findById(dto.userId);
    if (!user) {
      throw new NotFoundException(`El usuario con ID ${dto.userId} no existe.`);
    }

    // 2. 🟢 REPARADO: Corregido error de dedo en dto.dto y mapeado a camelCase estándar de TypeORM
    const nuevosDatosAsistencia: any = {
      userId: dto.userId, 
      recDate: dto.recDate,
      recType: dto.recType ?? 'Regular', // 🟢 Corregido (antes decía dto.dto.recType)
      shift: dto.shift ?? 1,
      incidentId: dto.incidentId ?? null,  // 🟢 Mapeado a camelCase
      dailyHours: dto.dailyHours ?? 0.00,  // 🟢 Mapeado a camelCase
      
      // 🟢 CONTROL DE HORAS: Mapeado a camelCase para que TypeORM llene las columnas correctas
      checkIn1: dto.check_in_1 ?? null,
      checkOut1: dto.check_out_1 ?? null,
      checkIn2: dto.check_in_2 ?? null,
      checkOut2: dto.check_out_2 ?? null,
    };

    // 3. Crear e insertar el registro de forma atómica
    const nuevaAsistencia = this.attendanceRepository.create(nuevosDatosAsistencia as object);
    const data = await this.attendanceRepository.save(nuevaAsistencia);

    return {
      status: 201,
      message: 'Registro de asistencia insertado de forma externa con éxito.',
      data
    };
  }
*/

  /**
   * Helper exclusivo de TypeScript para determinar la siguiente columna vacía
   */
/*
  private obtenerSiguienteColumnaChecada(asistencia: Attendance): keyof Attendance | null {
    const camposChecadas: (keyof Attendance)[] = [
      'check_in_1' as keyof Attendance,
      'check_out_1' as keyof Attendance,
      'check_in_2' as keyof Attendance,
      'check_out_2' as keyof Attendance
    ];

    for (const campo of camposChecadas) {
      if (!(asistencia as any)[campo]) {
        return campo;
      }
    }

    return null;
  }




*/

  async deleteAttendance(id: string): Promise<{ status: number; message: string }> {
    // 1. Validar que el string recibido sea un formato UUID válido para Postgres
    const esUuidValido = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    
    if (!esUuidValido) {
      throw new BadRequestException('El ID proporcionado no es un UUID de usuario válido.');
    }

    // 2. Borrar todos los registros de la tabla que pertenezcan a ese user_id
    // 💡 NOTA: Usa "userId" o "user_id" según se llame la propiedad en tu entidad de TypeScript
    const resultado = await this.attendanceRepository.delete({ userId: id } as any);

    if (resultado.affected === 0) {
      throw new NotFoundException(`No se encontraron registros de asistencia para el usuario con UUID ${id}.`);
    }

    return {
      status: 200,
      message: `Se eliminaron correctamente los registros de asistencia del usuario.`
    };
  }



// Reemplaza o actualiza estos métodos dentro de tu AttendancesService:

async createAttendanceCompleto(dto: CreateAttendanceDto): Promise<{ status: number; message: string; data: Attendance }> {
  const user = await this.usersService.findById(dto.userId);
  if (!user) {
    throw new NotFoundException(`El usuario con ID ${dto.userId} no existe.`);
  }

  // Mapeo seguro: Transforma la entrada mixta a la estructura limpia de la Entidad
  const nuevosDatosAsistencia: Partial<Attendance> = {
    userId: dto.userId, 
    recDate: dto.recDate,
    recType: dto.recType ?? 'Regular', 
    shift: dto.shift ?? 1,
    incidentId: dto.incidentId ?? null,      // Asignación de String directo
    dailyHours: dto.dailyHours ?? 0.00,  
    dailyHoursOVT: dto.dailyHoursOVT ?? 0.00, // Asignación del nuevo campo numérico
    
    // Traductor de formatos de entrada (snake_case -> camelCase)
    checkIn1: dto.check_in_1 ?? null,
    checkOut1: dto.check_out_1 ?? null,
    checkIn2: dto.check_in_2 ?? null,
    checkOut2: dto.check_out_2 ?? null,
  };

  const nuevaAsistencia = this.attendanceRepository.create(nuevosDatosAsistencia);
  const data = await this.attendanceRepository.save(nuevaAsistencia);

  return {
    status: 201,
    message: 'Registro de asistencia insertado de forma externa con éxito.',
    data
  };
}

private obtenerSiguienteColumnaChecada(asistencia: Attendance): keyof Attendance | null {
  // Evaluamos usando estrictamente las propiedades reales de la Entidad en TypeScript
  const camposChecadas: (keyof Attendance)[] = [
    'checkIn1',
    'checkOut1',
    'checkIn2',
    'checkOut2'
  ];

  for (const campo of camposChecadas) {
    if (!asistencia[campo]) {
      return campo;
    }
  }
  return null;
}
}