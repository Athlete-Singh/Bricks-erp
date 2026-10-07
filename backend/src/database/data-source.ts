import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from '../config/typeorm.config';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

/** Data source for the TypeORM CLI (migrations). The app itself uses TypeOrmModule in AppModule. */
export default new DataSource(
  buildTypeOrmOptions(
    process.env.DATABASE_URL ?? 'postgres://brics:brics@localhost:5432/brics',
    process.env.DATABASE_SSL === 'true',
  ),
);
