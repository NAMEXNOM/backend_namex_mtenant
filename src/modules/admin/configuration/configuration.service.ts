import { Injectable } from '@nestjs/common';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Configuration } from './entities/configuration.entity';

@Injectable()
export class ConfigurationService {

  constructor(
    @InjectRepository(Configuration)
    private configurationRepository: Repository<Configuration>
  ){

  }

  async create(createConfigurationDto: CreateConfigurationDto) {
    const SINGLE_ID = 1;

    // Creamos la instancia combinando el ID fijo con los datos del DTO
    const config = this.configurationRepository.create({
      ...createConfigurationDto,
      config_id: SINGLE_ID,
    });

    // .save() gestiona el "UPSERT" (Insert or Update) automáticamente
    return await this.configurationRepository.save(config);

  /*
    create(createConfigurationDto: CreateConfigurationDto) {
    console.log("Guardando en servicio... ",createConfigurationDto);
    
    const newConfiguration = this.configurationRepository.create(createConfigurationDto);
    this.configurationRepository.save(newConfiguration);

    return newConfiguration;
    */
  }

  findAll() {
    return this.configurationRepository.find();
  }

  /*findOne(id: number) {
    return `This action returns a #${id} configuration`;
  }*/

 /* update(id: number, updateConfigurationDto: UpdateConfigurationDto) {
    return `This action updates a #${id} configuration`;
  }*/

 /*remove(id: number) {
    return `This action removes a #${id} configuration`;
  }*/
}
