// src/modules/admin/users/users.service.ts
import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    // 🟢 INYECTAMOS EL DATASOURCE: Permite abrir QueryRunners dinámicos para conmutar esquemas [1.1]
    private readonly dataSource: DataSource 
  ) {}

  async clearAndResetTable(tenantId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    // 🚀 Iniciamos una transacción atómica para asegurar que si el admin falla, no se borre nada
    await queryRunner.startTransaction();

    try {
      // 1. Conmutamos en caliente al esquema del Tenant
      await queryRunner.query(`SET search_path TO ${tenantId}`);
      
      // 2. Vaciamos las tablas y reiniciamos el ID auto-incrementable a 1
      await queryRunner.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
      
      // 3. 🟢 CIFRAMOS LA CONTRASEÑA DE LA SEMILLA DE FORMA SEGURA CON BCRYPT
      // Pon aquí la contraseña oficial que requieras para tu administrador
      //const hashPasswordAdmin = await bcrypt.hash('NaMex_2026#', 12);
      //const correoAdmin = `admin@${tenantId.toLowerCase()}.com`;

      // 4. 🚀 REINYECTAMOS AL ADMINISTRADOR MAESTRO (ID 1 de la Tabla)
      // Usamos los campos exactos de tu dump de base de datos
      await queryRunner.query(`
        INSERT INTO users (
          "userRFC", "empNumber", name, "firstLastName", "secondLastName", 
          email, "hireDate", status, "shiftType", "jobRole", password, "empPriv"
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11)
      `, [
        'HERA760219V34',               // RFC Genérico de Administración
        'A1',                     // Número de empleado maestro
        'Adrian',               // Nombre
        'Sistema',                     // Primer Apellido
        'Namex',                      // Segundo Apellido
        'adrian.hernandez@mpsnamex.com',                   // Correo dinámico (ej: admin@empresa_c.com)
        'ACTIVO',                      // Status
        'DIURNO',                        // Tipo de Turno (shiftType)
        'admin',                    // Puesto (jobRole)
        '$2b$10$VcRALltqTwaEqaXhKw4Y6eOZO5C.jscg39KN/oqPZfVPQAGqKsLEK',             // Hash cifrado real de bcrypt
        'admin'                        // Privilegio de acceso (empPriv)
      ]);

      // Si ambos pasos se ejecutan bien, consolidamos los cambios en PostgreSQL
      await queryRunner.commitTransaction();
      
      return { 
        status: 'success',
        message: `Base de datos de "${tenantId}" limpia. Contador reiniciado a 1 y Administrador maestro re-inyectado con éxito.` 
      };
    } catch (error: any) {
      // Si algo truena, regresamos la base de datos a como estaba antes del comando
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`No se pudo resetear el tenant ${tenantId}: ` + error.message);
    } finally {
      // Liberamos la conexión de red de inmediato
      await queryRunner.release();
    }
  }

  async create(createUserDto: CreateUserDto) {
    console.log("Guardando en servicio ... ", createUserDto);
    
    const existeRFC = await this.userRepository.findOne({ where: { userRFC: createUserDto.userRFC } });
    if (existeRFC) {
      throw new BadRequestException(`El RFC ${createUserDto.userRFC} ya está en uso`);
    }

    const existeEmail = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existeEmail) {
      throw new BadRequestException(`El email ${createUserDto.email} ya está en uso`);
    }

    const existeEmpNumber = await this.userRepository.findOne({ where: { empNumber: createUserDto.empNumber } });
    if (existeEmpNumber) {
      throw new BadRequestException(`El número de empleado ${createUserDto.empNumber} ya está en uso`);
    }

    const hashPassword = await bcrypt.hash(createUserDto.password, 12);

    const newUser = this.userRepository.create({
      userRFC: createUserDto.userRFC,
      empNumber: createUserDto.empNumber,
      name: createUserDto.name,
      firstLastName: createUserDto.firstLastName,
      secondLastName: createUserDto.secondLastName,
      email: createUserDto.email,
      hireDate: createUserDto.hireDate,
      termDate: createUserDto.termDate,
      status: createUserDto.status,
      shiftType: createUserDto.shiftType,
      jobRole: createUserDto.jobRole,
      firstTimeLoad: createUserDto.firstTimeLoad,
      password: hashPassword,
      empPriv: createUserDto.empPriv,
      vacationBalance: createUserDto.vacationBalance,
      balanceDateTime: createUserDto.balanceDateTime,
      startDayOfPayment: createUserDto.start_day_of_payment
    });

    await this.userRepository.save(newUser);
    return newUser;
  }

  findAll() {
    return this.userRepository.find();
  }

  async findOne(userRFC: string) {
    const user = await this.userRepository.findOneBy({ userRFC });
    if (!user) throw new NotFoundException('El usuario no existe');
    return user;
  }

  async findById(userId: string) {
    const user = await this.userRepository.findOneBy({ userId }); 
    if (!user) throw new NotFoundException('El usuario no existe por ID');
    return user;
  }

  async findOneByRfc(userRFC: string) {
    return await this.userRepository.findOne({
      where: { userRFC },
      relations: ['roles'], 
    });
  }

  async findByRfcAndEmail(userRFC: string, email: string) {
    return await this.userRepository.findOne({
      where: { userRFC, email } 
    });
  }

  async setTemporaryPassword(userId: string, tempPasswordPlain: string) {
    const hashPassword = await bcrypt.hash(tempPasswordPlain, 12);
    return await this.userRepository.update(userId, {
      password: hashPassword,
      firstTimeLoad: true,       
      status: 'TEMPORAL'         
    });
  }

  async updateToFinalPassword(userId: string, passwordPlano: string): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordPlano, salt);
    await this.userRepository.update(userId, {
      password: passwordHash,
      firstTimeLoad: false,   
      status: 'ACTIVO'        
    });
  }

  async update(userRFC: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(userRFC);
    this.userRepository.merge(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(userRFC: string) {
    const result = await this.userRepository.delete({ userRFC });
    if (result.affected === 0) throw new NotFoundException("El usuario no existe");
  }


    // 🚀 MOTOR DE SINCRONIZACIÓN MASIVA DE ALTA VELOCIDAD (Bulk Load Corregido)
  async procesarSincronizacionMasiva(tenantId: string, empleadosMasivos: any[]) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    
    // Iniciamos transacción atómica: si un solo dato viene corrupto, la DB no se ensucia
    await queryRunner.startTransaction();

    this.logger.log(`[Bulk-Sync] Iniciando carga masiva para el tenant: ${tenantId}. Total: ${empleadosMasivos.length} registros.`);

    try {
      // 1. Conmutamos en caliente al esquema físico de la empresa
      await queryRunner.query(`SET search_path TO ${tenantId}`);

      let empleadosCreados = 0;
      let asistenciasInsertadas = 0;

      // Ciframos una contraseña genérica de fábrica por si vienen empleados nuevos sin clave
      const passwordGenericaHash = await bcrypt.hash('NaMex_Empleado2026#', 12);

      // 2. Procesar el JSON jerárquico empleado por empleado
      for (const emp of empleadosMasivos) {
        // Buscamos si el trabajador ya existe en este esquema por su RFC
        const [existe] = await queryRunner.manager.query(
          `SELECT "userId" FROM users WHERE "userRFC" = $1 LIMIT 1`,
          [emp.userRFC]
        );

        let userIdReal: string;

        if (existe) {
          // 🔄 A. Si ya existe, actualizamos sus datos demográficos de fábrica
          userIdReal = existe.userId;
          await queryRunner.manager.query(`
            UPDATE users SET 
              "empNumber" = $1, name = $2, "firstLastName" = $3, "secondLastName" = $4,
              email = $5, "hireDate" = $6, status = $7, "shiftType" = $8, "jobRole" = $9, 
              "empPriv" = $10, "vacationBalance" = $11
            WHERE "userId" = $12
          `, [
            emp.empNumber, emp.name, emp.firstLastName, emp.secondLastName,
            emp.email, emp.hireDate, emp.status, emp.shiftType, emp.jobRole,
            emp.empPriv.trim().toLowerCase(), emp.vacationBalance, userIdReal
          ]);
        } else {
          // 🆕 B. Si es un nuevo ingreso, lo insertamos desde cero asignándole ID automático
          const resultadoInsert = await queryRunner.manager.query(`
            INSERT INTO users (
              "userRFC", "empNumber", name, "firstLastName", "secondLastName", 
              email, "hireDate", status, "shiftType", "jobRole", password, "empPriv", "vacationBalance"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING "userId"
          `, [
            emp.userRFC, emp.empNumber, emp.name, emp.firstLastName, emp.secondLastName,
            emp.email, emp.hireDate, emp.status, emp.shiftType, emp.jobRole,
            passwordGenericaHash, emp.empPriv.trim().toLowerCase(), emp.vacationBalance
          ]);
          
          userIdReal = resultadoInsert[0].userId;
          empleadosCreados++;
        }

        // 3. 🟢 BULK INSERT DE ASISTENCIAS CON JORNADA Y TIEMPO EXTRA REPARADO
        if (emp.asistencias && emp.asistencias.length > 0) {
          // Primero borramos el rango de fechas que vamos a sobreescribir para evitar duplicados
          const fechasAModificar = emp.asistencias.map((a: any) => a.rec_date);
          await queryRunner.manager.query(
            `DELETE FROM attendances WHERE user_id = $1 AND rec_date = ANY($2::date[])`,
            [userIdReal, fechasAModificar]
          );

          // Armamos el query de bloque compacto
          const valoresSql: any[] = [];
          const bloquesValores: string[] = [];
          let indiceParametro = 1;

          emp.asistencias.forEach((asist: any) => {
            bloquesValores.push(`($${indiceParametro}, $${indiceParametro+1}, $${indiceParametro+2}, $${indiceParametro+3}, $${indiceParametro+4}, $${indiceParametro+5}, $${indiceParametro+6}, $${indiceParametro+7}, $${indiceParametro+8})`);
            
            valoresSql.push(
              userIdReal,
              asist.rec_date,
              asist.rec_type || 'Regular',
              asist.shift || 1,
              asist.check_in_1 || null,
              asist.check_out_1 || null,
              asist.check_out_2 || null, // Mapeado al checkout de salida
              asist.daily_hours || 0,
              asist.daily_hours_ovt || 0 // 🟢 Inyectamos el Overtime quincenal del trabajador
            );

            indiceParametro += 9;
          });

          // Firma de columnas alineada exactamente al 100% con tu base de datos física
          const queryBulkAsistencias = `
            INSERT INTO attendances (
              user_id, rec_date, rec_type, shift, check_in_1, check_out_1, check_out_2, daily_hours, daily_hours_ovt
            ) 
            VALUES ${bloquesValores.join(', ')}
          `;

          await queryRunner.manager.query(queryBulkAsistencias, valoresSql);
          asistenciasInsertadas += emp.asistencias.length;
        }
      }

      // Si todo el JSON se procesó con éxito, consolidamos la transacción de golpe 🏁
      await queryRunner.commitTransaction();

      return {
        status: 'success',
        message: 'Sincronización masiva procesada exitosamente.',
        resumen: {
          totalEmpleadosProcesados: empleadosMasivos.length,
          nuevosEmpleadosCreados: empleadosCreados,
          asistenciasRegistradasEnLote: asistenciasInsertadas
        }
      };

    } catch (error: any) {
      // Si un solo registro truena, revertimos la DB para que no quede incompleta
      await queryRunner.rollbackTransaction();
      this.logger.error(`[Bulk-Sync] Error crítico en la carga masiva: ${error.message}`);
      throw new InternalServerErrorException('Error en la sincronización masiva de datos: ' + error.message);
    } finally {
      // Liberamos el pool de red de inmediato
      await queryRunner.release();
    }
  }
}
