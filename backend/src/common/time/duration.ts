const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Parses a JWT-style TTL (`"15m"`, `"30d"`, `"3600"`) to milliseconds, so the
 * `refresh_tokens.expires_at` row can never drift from `JWT_REFRESH_TTL`.
 */
export function parseDurationToMs(ttl: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(ttl.trim());
  if (!match) {
    throw new Error(`Invalid duration '${ttl}'. Use e.g. 900, 15m, 24h, 30d.`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  return unit ? amount * (UNIT_MS[unit] as number) : amount * 1_000;
}
