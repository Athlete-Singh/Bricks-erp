import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';
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

/**
 * Postgres error codes we can answer better than "something went wrong".
 * The database is the last line of defence — a service usually checks for a
 * duplicate first — but it is the only one that holds under a race, and
 * several masters rely on a unique index alone. Without this mapping a user
 * entering a unit that already exists gets a 500.
 */
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';
const PG_NOT_NULL_VIOLATION = '23502';

/** `lower(name)` reads as a function to a user; the column name does not. */
function describeConstraint(constraint: string | undefined): string | undefined {
  if (!constraint) return undefined;
  const match = /^(?:uq|idx|fk|chk|ck)_(.+?)_(.+)$/i.exec(constraint);
  return match?.[2]?.replace(/_/g, ' ');
}

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
    if (exception instanceof QueryFailedError) {
      const driver = exception.driverError as { code?: string; constraint?: string; detail?: string };
      const field = describeConstraint(driver?.constraint);

      if (driver?.code === PG_UNIQUE_VIOLATION) {
        return {
          status: HttpStatus.CONFLICT,
          body: {
            error: {
              code: 'DUPLICATE_VALUE',
              message: field ? `A record with this ${field} already exists` : 'This record already exists',
              details: driver.constraint,
            },
          },
        };
      }
      if (driver?.code === PG_FOREIGN_KEY_VIOLATION) {
        // Either the id does not exist, or something still references this row.
        return {
          status: HttpStatus.CONFLICT,
          body: {
            error: {
              code: 'REFERENCE_CONFLICT',
              message: field
                ? `The ${field} is not valid, or this record is still in use`
                : 'This record references something that does not exist, or is still in use',
              details: driver.constraint,
            },
          },
        };
      }
      if (driver?.code === PG_CHECK_VIOLATION || driver?.code === PG_NOT_NULL_VIOLATION) {
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          body: {
            error: {
              code: 'BUSINESS_RULE',
              message: 'That value is not allowed',
              details: driver.constraint,
            },
          },
        };
      }

      // Anything else from the driver is a bug on our side, not the caller's.
      this.logger.error(exception);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
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
