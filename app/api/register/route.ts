import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { name, email, password } = await req.json() as { name: string; email: string; password: string };

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase().trim());
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const password_hash = await bcrypt.hash(password, 12);

  db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(
    id, name.trim(), email.toLowerCase().trim(), password_hash
  );

  // First registered user inherits all existing (dev) data
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 1) {
    db.prepare('UPDATE user_profile  SET user_id=? WHERE user_id IS NULL').run(id);
    db.prepare('UPDATE job_searches  SET user_id=? WHERE user_id IS NULL').run(id);
    db.prepare('UPDATE resumes       SET user_id=? WHERE user_id IS NULL').run(id);
    db.prepare('UPDATE study_plans   SET user_id=? WHERE user_id IS NULL').run(id);
  }

  return NextResponse.json({ success: true });
}
