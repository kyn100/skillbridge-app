import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { FIELDS_SEED } from './fields-seed';

// On Railway, set DB_PATH=/data/skillbridge.db (volume mount). Locally falls back to ./data/
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'skillbridge.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      education_json TEXT NOT NULL DEFAULT '[]',
      experience_json TEXT NOT NULL DEFAULT '[]',
      skills_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS job_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon_emoji TEXT NOT NULL DEFAULT '💼',
      color_class TEXT NOT NULL DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS field_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field_id INTEGER NOT NULL REFERENCES job_fields(id) ON DELETE CASCADE,
      keyword TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS job_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field_id INTEGER NOT NULL REFERENCES job_fields(id),
      keywords_used_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS job_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_id INTEGER NOT NULL REFERENCES job_searches(id) ON DELETE CASCADE,
      field_id INTEGER NOT NULL REFERENCES job_fields(id),
      title TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      source_site TEXT NOT NULL DEFAULT '',
      description_raw TEXT NOT NULL DEFAULT '',
      description_summary TEXT NOT NULL DEFAULT '',
      match_score INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_listing_id INTEGER NOT NULL REFERENCES job_listings(id),
      profile_id INTEGER NOT NULL REFERENCES user_profile(id),
      content_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resume_id INTEGER NOT NULL REFERENCES resumes(id),
      job_listing_id INTEGER NOT NULL REFERENCES job_listings(id),
      skill_gaps_json TEXT NOT NULL DEFAULT '[]',
      overview TEXT NOT NULL DEFAULT '',
      total_hours_estimate INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      skill_category TEXT NOT NULL DEFAULT '',
      order_num INTEGER NOT NULL DEFAULT 0,
      estimated_hours INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'locked'
    );

    CREATE TABLE IF NOT EXISTS textbook_chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL REFERENCES study_modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      content_markdown TEXT NOT NULL DEFAULT '',
      order_num INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL REFERENCES study_modules(id) ON DELETE CASCADE,
      level INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL DEFAULT '',
      questions_json TEXT NOT NULL DEFAULT '[]',
      passing_score INTEGER NOT NULL DEFAULT 70,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS test_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL REFERENCES tests(id),
      score INTEGER NOT NULL DEFAULT 0,
      answers_json TEXT NOT NULL DEFAULT '[]',
      passed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS field_roadmaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field_id INTEGER NOT NULL REFERENCES job_fields(id) ON DELETE CASCADE,
      content_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS case_studies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL REFERENCES study_modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT '',
      story TEXT NOT NULL DEFAULT '',
      analysis TEXT NOT NULL DEFAULT '',
      key_learnings_json TEXT NOT NULL DEFAULT '[]',
      order_num INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL REFERENCES study_modules(id) ON DELETE CASCADE,
      front TEXT NOT NULL DEFAULT '',
      back TEXT NOT NULL DEFAULT '',
      order_num INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mindmaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL REFERENCES study_modules(id) ON DELETE CASCADE,
      data_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `);

  runMigrations(db);
  seedFields(db);
}

function runMigrations(db: Database.Database): void {
  const cols: Array<[string, string, string]> = [
    ['user_profile',  'user_id', 'TEXT'],
    ['job_searches',  'user_id', 'TEXT'],
    ['resumes',       'user_id', 'TEXT'],
    ['study_plans',   'user_id', 'TEXT'],
  ];
  for (const [table, col, type] of cols) {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch { /* already exists */ }
  }
}

function seedFields(db: Database.Database): void {
  const seeded = db.prepare('SELECT value FROM settings WHERE key = ?').get('fields_seeded') as { value: string } | undefined;
  if (seeded) return;

  const insertField = db.prepare(
    'INSERT INTO job_fields (name, description, icon_emoji, color_class, display_order) VALUES (?, ?, ?, ?, ?)'
  );
  const insertKeyword = db.prepare(
    'INSERT INTO field_keywords (field_id, keyword, is_default) VALUES (?, ?, 1)'
  );

  const seedAll = db.transaction(() => {
    FIELDS_SEED.forEach((field, idx) => {
      const result = insertField.run(field.name, field.description, field.icon_emoji, field.color_class, idx + 1);
      const fieldId = result.lastInsertRowid as number;
      for (const keyword of field.keywords) {
        insertKeyword.run(fieldId, keyword);
      }
    });
    db.prepare("INSERT INTO settings (key, value) VALUES ('fields_seeded', '1')").run();
  });

  seedAll();
}
