export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { initDb, rows } from '@/lib/db';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  const info = {
    DATABASE_URL_set: !!dbUrl,
    DATABASE_URL_preview: dbUrl ? dbUrl.replace(/:([^:@]+)@/, ':***@') : 'NOT SET',
    db_connected: false,
    table_count: 0,
    error: null as string | null,
  };

  if (dbUrl) {
    try {
      await initDb();
      const result = await rows<{ count: string }>(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema='public'`
      );
      info.db_connected = true;
      info.table_count = Number(result[0]?.count ?? 0);
    } catch (err) {
      info.error = String(err);
    }
  }

  return NextResponse.json(info);
}
