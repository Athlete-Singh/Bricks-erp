import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from '../config/typeorm.config';

/**
 * Which env file to read. `ENV_FILE=.env.production` points the CLI at a
 * different environment without anyone retyping a connection string, which is
 * how a production command ends up run against the wrong database.
 */
config({ path: resolve(__dirname, '../../', process.env.ENV_FILE ?? '.env'), quiet: true });

/**
 * Data source for the TypeORM CLI (migrations and seeds). The app itself uses
 * TypeOrmModule in AppModule.
 *
 * `DATABASE_DIRECT_URL` wins when it is set: a pooled connection cannot run DDL
 * reliably, and migrations are DDL. The app keeps using the pooled URL.
 */
export default new DataSource(
  buildTypeOrmOptions(
    process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? 'postgres://brics:brics@localhost:5432/brics',
    process.env.DATABASE_SSL === 'true',
  ),
);
