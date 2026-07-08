import { Pool } from 'pg';
import { FIELDS_SEED } from './fields-seed';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
});

export async function rows<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

export async function row<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined> {
  const res = await pool.query(sql, params);
  return res.rows[0] as T | undefined;
}

// Returns the id of inserted row (use RETURNING id in your INSERT), or rowCount for UPDATE/DELETE
export async function run(sql: string, params?: unknown[]): Promise<{ id: number; rowCount: number }> {
  const res = await pool.query(sql, params);
  return { id: Number(res.rows[0]?.id ?? 0), rowCount: res.rowCount ?? 0 };
}

let _initialized = false;
let _initPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (_initialized) return;
  if (_initPromise) { await _initPromise; return; }
  _initPromise = _doInit().then(() => { _initialized = true; });
  await _initPromise;
}

async function _doInit(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      education_json TEXT NOT NULL DEFAULT '[]',
      experience_json TEXT NOT NULL DEFAULT '[]',
      skills_json TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS job_fields (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon_emoji TEXT NOT NULL DEFAULT '💼',
      color_class TEXT NOT NULL DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS field_keywords (
      id SERIAL PRIMARY KEY,
      field_id INTEGER NOT NULL REFERENCES job_fields(id) ON DELETE CASCADE,
      keyword TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS job_searches (
      id SERIAL PRIMARY KEY,
      field_id INTEGER NOT NULL REFERENCES job_fields(id),
      user_id TEXT,
      keywords_used_json TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS job_listings (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id SERIAL PRIMARY KEY,
      job_listing_id INTEGER NOT NULL REFERENCES job_listings(id),
      profile_id INTEGER NOT NULL REFERENCES user_profile(id),
      user_id TEXT,
      content_json TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id SERIAL PRIMARY KEY,
      resume_id INTEGER NOT NULL REFERENCES resumes(id),
      job_listing_id INTEGER NOT NULL REFERENCES job_listings(id),
      user_id TEXT,
      skill_gaps_json TEXT NOT NULL DEFAULT '[]',
      overview TEXT NOT NULL DEFAULT '',
      total_hours_estimate INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS study_modules (
      id SERIAL PRIMARY KEY,
      plan_id INTEGER NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      skill_category TEXT NOT NULL DEFAULT '',
      order_num INTEGER NOT NULL DEFAULT 0,
      estimated_hours INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'locked'
    );

    CREATE TABLE IF NOT EXISTS textbook_chapters (
      id SERIAL PRIMARY KEY,
      module_id INTEGER NOT NULL REFERENCES study_modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      content_markdown TEXT NOT NULL DEFAULT '',
      order_num INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tests (
      id SERIAL PRIMARY KEY,
      module_id INTEGER NOT NULL REFERENCES study_modules(id) ON DELETE CASCADE,
      level INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL DEFAULT '',
      questions_json TEXT NOT NULL DEFAULT '[]',
      passing_score INTEGER NOT NULL DEFAULT 70,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS test_attempts (
      id SERIAL PRIMARY KEY,
      test_id INTEGER NOT NULL REFERENCES tests(id),
      score INTEGER NOT NULL DEFAULT 0,
      answers_json TEXT NOT NULL DEFAULT '[]',
      passed INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS field_roadmaps (
      id SERIAL PRIMARY KEY,
      field_id INTEGER NOT NULL REFERENCES job_fields(id) ON DELETE CASCADE,
      content_json TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS case_studies (
      id SERIAL PRIMARY KEY,
      module_id INTEGER NOT NULL REFERENCES study_modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT '',
      story TEXT NOT NULL DEFAULT '',
      analysis TEXT NOT NULL DEFAULT '',
      key_learnings_json TEXT NOT NULL DEFAULT '[]',
      order_num INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id SERIAL PRIMARY KEY,
      module_id INTEGER NOT NULL REFERENCES study_modules(id) ON DELETE CASCADE,
      front TEXT NOT NULL DEFAULT '',
      back TEXT NOT NULL DEFAULT '',
      order_num INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mindmaps (
      id SERIAL PRIMARY KEY,
      module_id INTEGER NOT NULL REFERENCES study_modules(id) ON DELETE CASCADE,
      data_json TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id SERIAL PRIMARY KEY,
      job_listing_id INTEGER NOT NULL REFERENCES job_listings(id),
      user_id TEXT NOT NULL,
      interview_type TEXT NOT NULL DEFAULT 'mixed',
      status TEXT NOT NULL DEFAULT 'in_progress',
      overall_score REAL,
      overall_feedback TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS interview_questions (
      id SERIAL PRIMARY KEY,
      interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'behavioral',
      order_num INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS interview_answers (
      id SERIAL PRIMARY KEY,
      question_id INTEGER NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
      answer_text TEXT NOT NULL DEFAULT '',
      score INTEGER NOT NULL DEFAULT 0,
      strengths_json TEXT NOT NULL DEFAULT '[]',
      improvements_json TEXT NOT NULL DEFAULT '[]',
      sample_answer TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await _seedFields();
}

async function _seedFields(): Promise<void> {
  const existing = await row<{ value: string }>('SELECT value FROM settings WHERE key=$1', ['fields_seeded']);
  if (existing) return;

  for (let idx = 0; idx < FIELDS_SEED.length; idx++) {
    const field = FIELDS_SEED[idx];
    const { id: fieldId } = await run(
      'INSERT INTO job_fields (name, description, icon_emoji, color_class, display_order) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [field.name, field.description, field.icon_emoji, field.color_class, idx + 1]
    );
    for (const keyword of field.keywords) {
      await run('INSERT INTO field_keywords (field_id, keyword, is_default) VALUES ($1,$2,1)', [fieldId, keyword]);
    }
  }
  await run("INSERT INTO settings (key, value) VALUES ('fields_seeded','1') ON CONFLICT (key) DO NOTHING");
}
