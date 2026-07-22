import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt'


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ){
  }

  async create(createUserDto: CreateUserDto) {
    console.log("Guardando en servicio ... ", createUserDto);
    
  //  const nuevoUser = this.userRepository.create(createUserDto);

    const existeRFC = await this.userRepository.findOne({where: {userRFC: createUserDto.userRFC}})

    if (existeRFC){
      throw new BadRequestException(`El RFC ${createUserDto.userRFC} ya está en uso`);
    }

    const existeEmail = await this.userRepository.findOne({where: {email: createUserDto.email}})

    if (existeEmail){
      throw new BadRequestException(`El email ${createUserDto.email} ya está en uso`);
    }

    const existeEmpNumber = await this.userRepository.findOne({where: {empNumber: createUserDto.empNumber}})

    if (existeEmpNumber){
      throw new BadRequestException(`El numero de empleado ${createUserDto.empNumber} ya está en uso`);
    }

    // cifrar encriptar
    const hashPassword = await bcrypt.hash(createUserDto.password, 12);  // lo vamos a encriptar usando saltround con 12 saltos

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
    })

    this.userRepository.save(newUser);
    return newUser;
  }

  findAll() {
    return this.userRepository.find();
  }

  async findOne(userRFC: string) {
    const user = await this.userRepository.findOneBy({userRFC});
    if (!user) throw new NotFoundException('El usuario no existe');
    return user;
  }


    // 🟢 NUEVO MÉTODO: Para buscar de forma exacta por el ID de la base de datos
  async findById(userId: string) {
    // Nota: Si tu columna en la entidad de TypeORM se llama 'userId', cambia { id } por { userId: id }
    const user = await this.userRepository.findOneBy({ userId }); 
    if (!user) throw new NotFoundException('El usuario no existe por ID');
    return user;
  }

  async findOneByRfc(userRFC: string) {
  return await this.userRepository.findOne({
    where: { userRFC },
    relations: ['roles'], // Esto hace el "Join" automático con la tabla roles
  });
 }



// =========================================================================
// 20/05/2026 - rap / Métodos para el Flujo de Contraseña Temporal
// =========================================================================

async findByRfcAndEmail(userRFC: string, email: string) {
  return await this.userRepository.findOne({
    where: { userRFC, email } // TypeORM buscará que coincidan ambos campos
  });
}

// 🚨 ESTE ES EL MÉTODO QUE TE MARCA ERROR. ¡AQUÍ LO DECLARAMOS!
async setTemporaryPassword(userId: string, tempPasswordPlain: string) {
  // Ciframos la contraseña temporal antes de guardarla en la DB por seguridad
  const hashPassword = await bcrypt.hash(tempPasswordPlain, 12);

  return await this.userRepository.update(userId, {
    password: hashPassword,
    firstTimeLoad: true,       // Obliga al usuario a cambiarla al entrar
    status: 'TEMPORAL'         // Estado informativo de contraseña provisional
  });
}

// Método complementario para cuando el usuario asigne su contraseña definitiva
async updateToFinalPassword(userId: number, passwordPlano: string): Promise<void> {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(passwordPlano, salt);

  // Actualización estricta de las banderas de control de acceso
  await this.userRepository.update(userId, {
    password: passwordHash,
    firstTimeLoad: false,   // Ya no es primer ingreso
    status: 'ACTIVO'        // Cuenta activada definitivamente
  });
}

// =========================================================================


  async update(userRFC: string, updateUserDto: UpdateUserDto) {
  //  const user = await this.userRepository.findOneBy({userRFC}); para no repetir, se puede llamar a la función findOne() antes configurada
    const user = await this.findOne(userRFC);
    this.userRepository.merge(user, updateUserDto)

    return this.userRepository.save(user);
  }

  async remove(userRFC: string) {
    const result = await this.userRepository.delete({userRFC});
    // validacion para saber si se realizo algun cambio, si el registro no se afectó, entonces lanza una exepción de que el usuario no existe. Todo se maneja por 
    if (result.affected === 0) throw new NotFoundException("El usuario no existe")
  }
}
