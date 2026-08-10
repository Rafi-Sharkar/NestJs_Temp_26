import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';
dotenv.config();

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5454/lauracg882_db';

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
