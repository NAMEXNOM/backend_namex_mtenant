// src/modules/admin/vacations/vacations.module.ts
/*import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // <-- Asegúrate de importar esto
import { Vacation } from './entities/vacation.entity'; // <-- Tu entidad física
import { VacationsController } from './vacations.controller';
import { VacationsService } from './vacations.service';

import { AuthModule } from '../../auth/auth.module'; 

@Module({
  imports: [
    // ESTA LÍNEA CONECTA LA ENTIDAD CON LA BASE DE DATOS
    TypeOrmModule.forFeature([Vacation]),
    AuthModule, 
  ],
  controllers: [VacationsController],
  providers: [VacationsService],
})
export class VacationsModule {}
*/

// src/modules/admin/vacations/vacations.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; 
import { Vacation } from './entities/vacation.entity'; 
import { VacationsController } from './vacations.controller';
import { VacationsService } from './vacations.service';

// 🟢 1. Dejamos el AuthModule real unificado
import { AuthModule } from '../../auth/auth.module'; 

// 🛑 ELIMINAMOS las importaciones innecesarias de PassportModule y JwtModule de aquí

@Module({
  imports: [
    TypeOrmModule.forFeature([Vacation]),
    
    // 🟢 2. Al importar AuthModule, Vacations automáticamente hereda su JwtStrategy 
    // y el JwtService configurado asíncronamente con la clave correcta del .env
    AuthModule, 
  ],
  controllers: [VacationsController],
  providers: [VacationsService],
})
export class VacationsModule {}

