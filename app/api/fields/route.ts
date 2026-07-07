import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export function GET() {
  const db = getDb();
  const fields = db.prepare('SELECT * FROM job_fields ORDER BY display_order').all();
  return NextResponse.json(fields);
}
