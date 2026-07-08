import { NextResponse } from 'next/server';
import { row, run, initDb } from '@/lib/db';
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

  await initDb();

  const existing = await row('SELECT id FROM users WHERE email=$1', [email.toLowerCase().trim()]);
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const password_hash = await bcrypt.hash(password, 12);

  await run(
    'INSERT INTO users (id, name, email, password_hash) VALUES ($1,$2,$3,$4)',
    [id, name.trim(), email.toLowerCase().trim(), password_hash]
  );

  // First registered user inherits all existing (dev) data
  const countRow = await row<{ c: string }>('SELECT COUNT(*) as c FROM users');
  const userCount = Number(countRow?.c ?? 0);
  if (userCount === 1) {
    await run('UPDATE user_profile  SET user_id=$1 WHERE user_id IS NULL', [id]);
    await run('UPDATE job_searches  SET user_id=$1 WHERE user_id IS NULL', [id]);
    await run('UPDATE resumes       SET user_id=$1 WHERE user_id IS NULL', [id]);
    await run('UPDATE study_plans   SET user_id=$1 WHERE user_id IS NULL', [id]);
  }

  return NextResponse.json({ success: true });
}
