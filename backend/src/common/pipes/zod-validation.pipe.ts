import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodError, ZodType } from 'zod';

/** Field-level detail for `{ error: { details } }`. */
export interface ValidationIssue {
  field: string;
  message: string;
}

export function formatZodIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(body)',
    message: issue.message,
  }));
}

/**
 * Validates a payload against a Zod schema from `@brics/shared` and returns the
 * parsed value, so handlers receive a typed DTO instead of `unknown`.
 * Use as `@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto`.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: formatZodIssues(result.error),
      });
    }
    return result.data;
  }
}
