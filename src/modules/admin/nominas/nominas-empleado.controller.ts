// src/modules/admin/nominas/nominas-empleado.controller.ts
import { Controller, Get, Query, Headers, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

@Controller('nominas')
export class NominasEmpleadoController {
  
  // Creamos el cliente interno de S3 usando tus variables de entorno
  private s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });

  @UseGuards(JwtAuthGuard)
  @Get('descargar-archivo')
  async descargarArchivo(
    @Query('key') s3Key: string,
    @Res() res: Response
  ) {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NOMINAS || 'namexportal-nominas-private',
        Key: s3Key,
      });

      const s3Response = await this.s3Client.send(command);
      
      // Configuramos las cabeceras para que el navegador sepa que es un PDF seguro
      res.setHeader('Content-Type', 'application/pdf');
      
      // Transmitimos los bytes directamente de S3 al navegador del empleado
      const stream = s3Response.Body as any;
      stream.pipe(res);
    } catch (error) {
      res.status(500).json({ message: 'No se pudo recuperar el archivo de S3.' });
    }
  }
}




/*
// src/modules/admin/nominas/nominas-empleado.controller.ts
import { Controller, Get, Headers, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { NominasService } from './nominas.service';
// 🛡️ Importamos tu guard oficial de autenticación.
// (Ajusta la ruta de importación si tu JwtAuthGuard vive en otra carpeta)
import { JwtAuthGuard } from './../../auth/guards/jwt-auth.guard'; 

@Controller('nominas') // 🟢 Ruta limpia sin la palabra 'admin'
export class NominasEmpleadoController {
  constructor(private readonly nominasService: NominasService) {}

  /**
   * Recupere el historial de recibos del empleado que inició sesión
   */  /*
  @UseGuards(JwtAuthGuard) // Protege la ruta: exige que haya un Token válido
  @Get('mis-recibos')
  async obtenerMisRecibos(
    @Request() req: any,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('El header x-tenant-id es requerido');
    }

    // Ayer vimos en la consola de tu navegador que tu Token guarda el RFC en minúsculas: "rfc"
    // req.user lo inyecta automáticamente tu JwtAuthGuard al desempacar el Token
    const rfcEmpleado = req.user?.rfc;

    if (!rfcEmpleado) {
      throw new BadRequestException('No se encontró un RFC válido dentro de tu sesión.');
    }
    
    return await this.nominasService.obtenerRecibosPorEmpleado(rfcEmpleado, tenantId);
  }
}


*/