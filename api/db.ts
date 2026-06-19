import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const MIGRATION_PATH = path.join(__dirname, '..', 'migrations', '0001_init.sql');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const tableExists = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='welding_programs'")
  .get();

if (!tableExists) {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  db.exec(sql);
  console.log('[db] database initialized with seed data');
}

export default db;
