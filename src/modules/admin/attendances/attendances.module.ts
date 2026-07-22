import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { Attendance } from './entities/attendance.entity';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../users/users.module'; // Requerido para consultar el start_day_of_payment

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance]),
    AuthModule,
    UsersModule,
  ],
  controllers: [AttendancesController],
  providers: [AttendancesService],
  exports: [AttendancesService],
})
export class AttendancesModule {}
