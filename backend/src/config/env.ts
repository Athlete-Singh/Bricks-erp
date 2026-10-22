import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

/** Every env variable the API reads. Keep in sync with `backend/.env.example`. */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgres:// URL'),
  /** Serverless hosts want a pool of 1; a long-lived server wants the default. */
  DB_POOL_MAX: z.coerce.number().int().positive().optional(),
  DATABASE_SSL: booleanString,
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  // NTF-01 — SMS / WhatsApp alerts. `log` writes the message to the outbox and
  // the log and sends nothing: the default until the client's gateway account
  // exists (OPEN_QUESTIONS #14). Indian SMS also needs DLT-registered template ids.
  NOTIFY_PROVIDER: z.enum(['log', 'msg91', 'twilio']).default('log'),
  NOTIFY_CHANNEL: z.enum(['sms', 'whatsapp']).default('sms'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_DISPATCH_SENT: z.string().optional(),
  MSG91_TEMPLATE_PAYMENT_RECEIVED: z.string().optional(),
  MSG91_TEMPLATE_ADVANCE_ALERT: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  /** A Twilio number (`+1…`) or Messaging Service SID (`MG…`); for WhatsApp, the sender number. */
  TWILIO_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule: fails fast at boot with a readable list of bad variables. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
