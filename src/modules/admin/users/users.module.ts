import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseSeedService } from './database-seed.service'; // 🟢 Importar
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService,DatabaseSeedService],
  exports:[UsersService]   // Se debe exportar el UsersService para que se pueda usar en Auth  03/15/2026 RAP
})
export class UsersModule {}
