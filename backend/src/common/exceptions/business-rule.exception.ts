import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * A domain rule was broken (e.g. STOCK_INSUFFICIENT, FY_LOCKED, JOURNAL_UNBALANCED).
 * `code` is MODULE_REASON in upper snake case; the filter returns it to the client as 422.
 */
export class BusinessRuleException extends HttpException {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
