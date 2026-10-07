import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { Env } from './config/env';
import { setupApp } from './setup-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  setupApp(app);
  app.enableCors({ origin: config.get('CORS_ORIGINS', { infer: true }).split(','), credentials: true });
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('BRICS API')
    .setDescription('Brick Chimney ERP & Accounting — REST API v1')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
