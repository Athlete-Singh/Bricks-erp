import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';
import { formatZodIssues } from '../pipes/zod-validation.pipe';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

const STATUS_CODES: Record<number, string> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'BUSINESS_RULE',
  503: 'SERVICE_UNAVAILABLE',
};

/** Maps every thrown error to `{ error: { code, message, details? } }`. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toBody(exception);
    if (status >= 500) this.logger.error(exception);
    res.status(status).json(body);
  }

  toBody(exception: unknown): { status: number; body: ApiErrorBody } {
    // Safety net: a schema parsed outside ZodValidationPipe must still be a 400, not a 500.
    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          error: { code: 'VALIDATION_FAILED', message: 'Validation failed', details: formatZodIssues(exception) },
        },
      };
    }
    if (!(exception instanceof HttpException)) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
      };
    }
    const status = exception.getStatus();
    const payload = exception.getResponse();
    const fallbackCode = STATUS_CODES[status] ?? 'HTTP_ERROR';
    if (typeof payload === 'string') {
      return { status, body: { error: { code: fallbackCode, message: payload } } };
    }
    const p = payload as { code?: string; message?: string | string[]; details?: unknown };
    // class-validator puts the list of field errors in `message`
    if (Array.isArray(p.message)) {
      return {
        status,
        body: { error: { code: p.code ?? fallbackCode, message: 'Validation failed', details: p.message } },
      };
    }
    return {
      status,
      body: { error: { code: p.code ?? fallbackCode, message: p.message ?? exception.message, details: p.details } },
    };
  }
}
