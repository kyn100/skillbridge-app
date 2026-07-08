export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, initDb } from '@/lib/db';

export async function GET() {
  await initDb();
  const fields = await rows('SELECT * FROM job_fields ORDER BY display_order');
  return NextResponse.json(fields);
}
