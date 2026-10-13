import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate limiting, off under `test` (P13.1).
 *
 * The e2e suite fires hundreds of requests a second from one address on
 * purpose — concurrency tests exist precisely to do that — so a throttled
 * suite would go red for a reason that has nothing to do with the code under
 * test, and the usual fix for that is someone quietly raising the production
 * limit until it stops hurting.
 *
 * The check is on the environment rather than a setting an operator could
 * turn off by accident in production.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') return true;
    return super.shouldSkip(context);
  }
}
