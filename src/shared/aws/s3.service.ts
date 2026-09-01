// src/shared/aws/s3.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName = process.env.AWS_S3_BUCKET_NOMINAS;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  /**
   * Sube un archivo en memoria (Buffer) a Amazon S3 organizándolo por carpetas estructuradas.
   */
  async uploadFile(
    fileBuffer: Buffer,
    folderPath: string,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
    const cleanFolderPath = folderPath.replace(/\/+$/, '');
    const s3Key = `${cleanFolderPath}/${fileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);
      
      return `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}://{s3Key}`;
    } catch (error) {
      console.error('Error subiendo archivo a AWS S3:', error);
      throw new InternalServerErrorException('Error al almacenar el archivo en el servidor de almacenamiento S3.');
    }
  }
}
 