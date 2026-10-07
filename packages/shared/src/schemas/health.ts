import { z } from 'zod';

export const healthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['up', 'down']),
  version: z.string(),
  uptimeSeconds: z.number(),
  timestamp: z.string(),
});
export type Health = z.infer<typeof healthSchema>;
