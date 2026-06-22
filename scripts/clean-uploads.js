import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const uploadsDir = path.join(root, 'uploads');

if (fs.existsSync(uploadsDir)) {
  fs.rmSync(uploadsDir, { recursive: true, force: true });
}

fs.mkdirSync(path.join(uploadsDir, 'results'), { recursive: true });
console.log('Removed uploads/ and recreated an empty folder.');
