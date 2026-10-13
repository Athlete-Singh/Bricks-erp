import { Reflector } from '@nestjs/core';
import { THROTTLER_LIMIT, THROTTLER_TTL } from '@nestjs/throttler/dist/throttler.constants';

/** The decorator stores one entry per throttler name, so the key is suffixed. */
const limitKey = `${THROTTLER_LIMIT}default`;
const ttlKey = `${THROTTLER_TTL}default`;
import { AuthController } from '../../../modules/auth/auth.controller';
import { AppThrottlerGuard } from '../app-throttler.guard';

/**
 * P13.1 — rate limiting is configuration, and configuration is exactly the
 * kind of thing that is "obviously there" right up until a refactor drops the
 * decorator and nothing fails. These assert the two claims the security review
 * makes: login is tightly limited, and the limiter is off only under `test`.
 */
describe('Rate limiting', () => {
  const reflector = new Reflector();

  /**
   * Read off the prototype's descriptor rather than the method itself: taking
   * `Controller.prototype.login` as a value is an unbound method, which lint
   * rightly objects to. The decorator's metadata lives on the function either
   * way.
   */
  const handlerOf = (name: 'login' | 'refresh'): ((...args: never[]) => unknown) =>
    Object.getOwnPropertyDescriptor(AuthController.prototype, name)!.value as (...args: never[]) => unknown;

  const context = (handler: unknown) =>
    ({
      getHandler: () => handler,
      getClass: () => AuthController,
    }) as never;

  it('limits login to ten attempts a minute', () => {
    // Enough for anyone who knows their password; far too few to guess one.
    expect(reflector.get<number>(limitKey, handlerOf('login'))).toBe(10);
    expect(reflector.get<number>(ttlKey, handlerOf('login'))).toBe(60_000);
  });

  it('limits the refresh endpoint too, since it also takes a secret', () => {
    expect(reflector.get<number>(limitKey, handlerOf('refresh'))).toBe(30);
  });

  it('skips only under test, so production is never silently unlimited', async () => {
    const guard = new AppThrottlerGuard({ throttlers: [] }, {} as never, reflector);
    const skip = (guard as unknown as { shouldSkip: (c: never) => Promise<boolean> }).shouldSkip.bind(guard);

    const original = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'test';
      await expect(skip(context(handlerOf('login')))).resolves.toBe(true);

      process.env.NODE_ENV = 'production';
      await expect(skip(context(handlerOf('login')))).resolves.toBe(false);
    } finally {
      process.env.NODE_ENV = original;
    }
  });
});
