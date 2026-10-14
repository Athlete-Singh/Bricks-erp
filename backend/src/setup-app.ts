import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { API_PREFIX } from '@brics/shared';
import { AuditContextInterceptor } from './common/audit/audit-context.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';

/** Global app wiring shared by main.ts and e2e tests, so tests run the real pipeline. */
export function setupApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  // Audit context must wrap the handler so writes inside it inherit the
  // request's actor kind and support session id. Response envelope runs
  // outermost — it only shapes the eventual payload.
  app.useGlobalInterceptors(new AuditContextInterceptor(), new ResponseEnvelopeInterceptor());
}
