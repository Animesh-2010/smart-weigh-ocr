import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'weighing.db');

let db: SqlJsDatabase;

export async function initDatabase(): Promise<SqlJsDatabase> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      empty_weight_grams REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      tare_image_url TEXT,
      ocr_confidence REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS weighing_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bin_id TEXT NOT NULL,
      gross_weight_grams REAL NOT NULL,
      tare_weight_grams REAL NOT NULL,
      net_weight_grams REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      ocr_confidence REAL,
      ocr_raw_result TEXT,
      ocr_engine TEXT DEFAULT 'tesseract',
      processing_time_ms INTEGER,
      validation_status TEXT NOT NULL DEFAULT 'confirmed',
      image_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (bin_id) REFERENCES bins(id) ON DELETE CASCADE
    )
  `);

  saveDatabase();
  return db;
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export interface QueryResult {
  columns: string[];
  values: any[][];
}

export function query(sql: string, params: any[] = []): any[] {
  const database = getDb();
  const stmt = database.prepare(sql);

  if (params.length > 0) {
    stmt.bind(params);
  }

  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  stmt.free();
  return results;
}

export function run(sql: string, params: any[] = []): void {
  const database = getDb();
  database.run(sql, params);
  saveDatabase();
}

export function getOne(sql: string, params: any[] = []): any | undefined {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : undefined;
}

export function getAll(sql: string, params: any[] = []): any[] {
  return query(sql, params);
}
