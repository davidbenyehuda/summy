import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '..', 'config.json');

export const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

export function getDbConfig() {
  const { database } = config;
  return {
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: database.database,
  };
}
