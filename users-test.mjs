import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp DEFAULT now()
)`;

await sql`INSERT INTO users (name) VALUES (${'Alice'})`;
console.log(await sql`SELECT * FROM users`);