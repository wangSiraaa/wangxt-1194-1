import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const MIGRATION_0001 = path.join(__dirname, '..', 'migrations', '0001_init.sql');
const MIGRATION_0002 = path.join(__dirname, '..', 'migrations', '0002_rollback_retire_impact.sql');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const tableExists = (name: string) =>
  !!db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);

if (!tableExists('welding_programs')) {
  db.exec(fs.readFileSync(MIGRATION_0001, 'utf-8'));
  console.log('[db] database initialized with seed data');
}

if (!tableExists('workstations')) {
  const migrate = db.transaction(() => {
    db.exec(fs.readFileSync(MIGRATION_0002, 'utf-8'));
  });
  migrate();
  console.log('[db] migration 0002 applied: rollback / retire / impact scope');
}

export default db;
