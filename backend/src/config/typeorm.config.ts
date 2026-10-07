import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

/** Shared by the Nest TypeOrmModule and the migration CLI data source. Never enables `synchronize`. */
export function buildTypeOrmOptions(databaseUrl: string, ssl: boolean): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: false,
  };
}
