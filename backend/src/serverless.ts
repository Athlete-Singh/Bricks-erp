import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { Env } from './config/env';
import { setupApp } from './setup-app';

/**
 * Entry point for serverless hosting (Vercel functions).
 *
 * `main.ts` ends in `app.listen()`, which a function host never calls — there
 * is no port to listen on. Here the Express instance Nest wires itself into is
 * handed straight to the platform instead.
 *
 * The whole application is built once per instance and kept. A cold start pays
 * for TypeORM, the chart of accounts and twenty-odd modules; every warm request
 * after it reuses them. Rebuilding per request would turn a 12 ms read into a
 * multi-second one.
 */
const expressApp = express();
let ready: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  setupApp(app);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.enableCors({ origin: config.get('CORS_ORIGINS', { infer: true }).split(','), credentials: true });

  // `init()` rather than `listen()`: wiring without a socket.
  await app.init();
}

export default async function handler(req: Request, res: Response): Promise<void> {
  ready ??= bootstrap();
  await ready;
  expressApp(req, res);
}
