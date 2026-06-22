import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = new pg.Pool(getDbConfig());

export async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(schema);
}

export async function query(text, params) {
  return pool.query(text, params);
}

export { pool };
