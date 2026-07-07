import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { searchJobs } from '@/lib/claude';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { field_id: number; field_name: string; keywords: string[] };
  if (!body.field_id || !body.field_name || !body.keywords?.length) {
    return NextResponse.json({ error: 'field_id, field_name, and keywords required' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { /* closed */ }
      };

      const db = getDb();
      const searchResult = db.prepare(
        'INSERT INTO job_searches (field_id, keywords_used_json, user_id) VALUES (?, ?, ?)'
      ).run(body.field_id, JSON.stringify(body.keywords), userId);
      const searchId = searchResult.lastInsertRowid as number;

      try {
        const jobs = await searchJobs(body.field_name, body.keywords, (msg) => {
          send({ type: 'status', message: msg });
        });

        send({ type: 'status', message: 'Saving results...' });

        const insertJob = db.prepare(`
          INSERT INTO job_listings (search_id, field_id, title, company, location, url, source_site, description_raw, description_summary, match_score)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        db.transaction(() => {
          for (const job of jobs) {
            insertJob.run(searchId, body.field_id, job.title, job.company, job.location,
              job.url, job.source_site, job.description_raw, job.description_summary, job.match_score);
          }
        })();

        const listings = db.prepare('SELECT * FROM job_listings WHERE search_id=? ORDER BY match_score DESC').all(searchId);
        send({ type: 'done', search_id: searchId, jobs: listings });
      } catch (err) {
        console.error('Job search error:', err);
        send({ type: 'error', message: 'Search failed. Please check your API key and try again.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
