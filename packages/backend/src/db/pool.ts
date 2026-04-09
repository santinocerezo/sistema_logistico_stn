import { Pool } from 'pg';

const isProd = process.env.NODE_ENV === 'production';

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: isProd ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'stnpq',
        user: process.env.POSTGRES_USER || 'stnpq_user',
        password: process.env.POSTGRES_PASSWORD || 'stnpq_pass',
      },
);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export { pool };
export default pool;
