import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Configuración de CORS habilitando el encabezado personalizado
  app.enableCors({
    origin: true, 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    // 🟢 Habilitamos explícitamente el encabezado con guion medio para evitar bloqueos del navegador
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With, X-Tenant-ID',
  }); 

  // Class validator de nestjs.doc 2-Marzo-2026 RAP
  app.useGlobalPipes(new ValidationPipe({
     whitelist: true, 
     forbidNonWhitelisted: true 
  }));
  
  // Swagger se copia de nesjs.doc openapi 02-28-26 AHR SWAGGER
  const configBuilder = new DocumentBuilder()
    .addBearerAuth()    
    .setTitle('backend api')
    .setDescription('Backend api portal')
    .setVersion('1.0')
    .addTag('node')
    
    // 🟢 2. Agrega el casillero visual de X-Tenant-ID en todos los endpoints de Swagger
    .addGlobalParameters({
      name: 'X-Tenant-ID',
      in: 'header',
      required: true,
      description: 'Identificador del esquema de la empresa (ej: empresa_a, empresademo)',
      schema: {
        type: 'string',
        default: 'empresa_a', 
      },
    });

  // DETECCIÓN AUTOMÁTICA DE ENTORNO
  configBuilder.addServer(process.env.SWAGGER_SERVER_URL || 'http://localhost:5000', 'Servidor de la API');

  const config = configBuilder.build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();

