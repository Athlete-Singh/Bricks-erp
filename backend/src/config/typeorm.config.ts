import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

/**
 * Shared by the Nest TypeOrmModule and the migration CLI data source. Never
 * enables `synchronize`.
 *
 * `DB_POOL_MAX` exists for serverless hosting. A long-lived server wants a
 * pool; a platform that starts a fresh instance per burst of requests wants
 * almost none, because fifty instances holding ten connections each will
 * exhaust the database while the application still looks idle. On Vercel or
 * any other function host, set it to 1 and point `DATABASE_URL` at the
 * transaction pooler.
 */
export function buildTypeOrmOptions(databaseUrl: string, ssl: boolean, poolMax?: number): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    ...(poolMax ? { extra: { max: poolMax } } : {}),
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: false,
  };
}
