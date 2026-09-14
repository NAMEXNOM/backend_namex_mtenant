import { Controller, Get, Query, Headers, Res, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { NominasService } from './nominas.service';
import { JwtAuthGuard } from './../../auth/guards/jwt-auth.guard'; // Ajusta la ruta a tu Guard real

@Controller('nominas')
export class NominasEmpleadoController {
  constructor(private readonly nominasService: NominasService) {}

  private s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });

  /**
   * 🟢 ENDPOINT 1: Recupera el listado de recibos del empleado para llenar la tabla
   */
  @UseGuards(JwtAuthGuard)
  @Get('mis-recibos')
  async obtenerMisRecibos(
    @Request() req: any,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('El header x-tenant-id es requerido');
    }

    // Leemos el RFC del token desempacado por tu Guard
    const rfcEmpleado = req.user?.rfc;

    if (!rfcEmpleado) {
      throw new BadRequestException('No se encontró un RFC válido en tu sesión.');
    }
    
    return await this.nominasService.obtenerRecibosPorEmpleado(rfcEmpleado, tenantId);
  }

  /**
   * 🔵 ENDPOINT 2: Actúa como puente seguro para descargar los archivos de S3 sin URLs públicas
   */
    @UseGuards(JwtAuthGuard)
    @Get('descargar-archivo')
    async descargarArchivo(
    @Query('key') s3Key: string,
    @Res() res: Response
  ) {
    try {
      if (!s3Key) {
        return res.status(400).json({ message: 'La llave del archivo es requerida.' });
      }

      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NOMINAS || 'namexportal-nominas-private',
        Key: s3Key,
      });

      const s3Response = await this.s3Client.send(command);
      
      // 🟢 DETECCION DINÁMICA DE TIPO DE ARCHIVO (PDF o XML)
      const llaveMinusculas = s3Key.toLowerCase();
      if (llaveMinusculas.endsWith('.xml')) {
        // Indica al navegador que es un archivo XML XML y fuerza la descarga limpia
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="${s3Key.split('/').pop()}"`);
      } else {
        // Si es PDF, mantiene la visualización directa en pantalla
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      }
      
      const stream = s3Response.Body as any;
      stream.pipe(res);
    } catch (error: any) {
      res.status(500).json({ message: 'No se pudo recuperar el archivo de S3.', error: error.message });
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