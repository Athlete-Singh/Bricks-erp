import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { Env } from './config/env';
import { setupApp } from './setup-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  setupApp(app);

  /**
   * Security headers (P13.1). The API serves JSON and PDFs to a browser on
   * another origin, so the headers that matter are the ones a response
   * carries: no sniffing, no framing, a referrer that leaks nothing.
   * `crossOriginResourcePolicy` is relaxed to same-site because the web app
   * fetches invoice and challan PDFs as blobs from this origin.
   */
  app.use(
    helmet({
      contentSecurityPolicy: false, // the API renders no HTML of its own
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.enableCors({ origin: config.get('CORS_ORIGINS', { infer: true }).split(','), credentials: true });
  app.enableShutdownHooks();

  /**
   * The docs describe every route and body shape in the system. That is a map
   * worth having in development and a map worth not publishing in production,
   * where it is served to anyone who finds the URL.
   */
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const swagger = new DocumentBuilder()
      .setTitle('BRICS API')
      .setDescription('Brick Chimney ERP & Accounting — REST API v1')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
  }

  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
