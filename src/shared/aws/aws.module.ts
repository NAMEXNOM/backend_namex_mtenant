// src/shared/aws/aws.module.ts
import { Module, Global } from '@nestjs/common';
import { S3Service } from './s3.service';

@Global()
@Module({
  providers: [S3Service],
  exports: [S3Service], // Se exporta para que sea visible globalmente
})
export class AwsModule {}
