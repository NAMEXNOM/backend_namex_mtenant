// src/modules/admin/users/users.service.ts
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
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
}
