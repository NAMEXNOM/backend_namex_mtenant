import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  constructor(private readonly usersService: UsersService) {}

  async onApplicationBootstrap() {
    await this.seedAdminUser();
  }

  private async seedAdminUser() {
    const adminRfc = 'HERA760219V34';
    
    // 1. Verificar si el usuario inicial ya existe para no duplicarlo
    const adminExiste = await this.usersService.findOneByRfc(adminRfc).catch(() => null);
    
    if (adminExiste) {
        console.log('🌱 Seed: El usuario inicial ya existe en la base de datos.');
        return;
    }

    console.log('🌱 Seed: Creando usuario administrador inicial por primera vez...');

    // 2. Definir la contraseña temporal en texto plano
    const passTemporal = 'NaMex_2026#';

    // 3. Hashear la contraseña (fuerza 12, tal como lo tienes en tu updateToFinalPassword)
    //const saltRounds = 12;
    //const passHasheado = await bcrypt.hash(passTemporal, saltRounds);

    // 4. 🟢 REPARADO: Estructurar el objeto incluyendo todas las propiedades exigidas por tu DTO
    const usuarioInicial = {
        userRFC: adminRfc,
        empNumber: 'A1', // Si te marca error, cámbialo a string: '1' o 'EMP-001'
        name: 'Administrador',
        firstLastName: 'Sistema',
        secondLastName: 'Namex',
        email: 'adrian.hernandez@mpsnamex.com',
        hireDate: new Date().toISOString(), // 🟢 Mejorado: Formato de fecha estándar para APIs
        termDate: null,
        status: 'ACTIVO',        
        shiftType: 'DIURNO',                   
        jobRole: 'ADMINISTRADOR',              
        firstTimeLoad: false,       
        password: passTemporal,
        empPrivts: 'ALL' // 🟢 REPARADO: Propiedad obligatoria añadida (Ajusta a ['ALL'] si espera un arreglo)
    };

    // 5. Guardar en la base de datos
    try {
      await this.usersService.create(usuarioInicial as any); 
      console.log('✅ Seed: Usuario inicial creado con éxito.');
      console.log(`🔑 RFC: ${adminRfc} | Clave Temporal: ${passTemporal}`);
    } catch (error) {
      console.error('❌ Seed: Error al crear el usuario inicial:', error.message);
    }
  }
}

