import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- AGREGA ESTA LÍNEA AQUÍ ---
  app.enableCors({
    origin: true, // Permite que cualquier origen consulte la API (ideal para desarrollo/Swagger)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  }); 
  // ------------------------------

  // class validator de nestjs.doc  2-Marzo-2026 RAP
  app.useGlobalPipes(new ValidationPipe({
     whitelist: true, //solo pasan los datos configurdos en DTO
     forbidNonWhitelisted: true // avisa cuales datos no deben de ir
  }));
  // Fin de class validator nestjs.doc 2-Marzo-2026 RAP
  
  // Swagger se copia de nesjs.doc openapi 02-28-26 AHR SWAGGER
  const configBuilder = new DocumentBuilder()
    .addBearerAuth()    // se agrega para dar seguridad con token 03/31/2026 RAP
    .setTitle('backend api')
    .setDescription('Backend api portal')
    .setVersion('1.0')
    .addTag('node');

  // DETECCIÓN AUTOMÁTICA DE ENTORNO (Se configura ANTES de hacer .build())

  configBuilder.addServer(process.env.SWAGGER_SERVER_URL || 'http://localhost:5000', 'Servidor de la API');

/*  if (process.env.NODE_ENV === 'production') {
    // Apunta al subdominio de tu API en producción
    configBuilder.addServer('https://fustes.namexportal.com/api', 'Servidor de Producción');
  } else {
    // Apunta al puerto 5000 que es donde escucha tu NestJS local
    configBuilder.addServer('https://fustes.namexportal.com/api', 'Servidor de Producción FORZADO');
  }
    */

  // Ahora sí, construimos la configuración finalizada
  const config = configBuilder.build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);
  // FIN DE Swagger. 02-28-26

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
