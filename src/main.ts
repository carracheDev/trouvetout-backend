// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:3001',
      'http://localhost:3000',
    ],
    credentials: true,
  });

  // Prefix global
  app.setGlobalPrefix('api/v1');

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Filtres globaux
  app.useGlobalFilters(new HttpExceptionFilter());

  // Intercepteurs globaux
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 TrouveTout API démarrée sur http://localhost:${port}/api/v1`);
}
bootstrap();