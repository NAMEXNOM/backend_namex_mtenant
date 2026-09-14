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
   */
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
