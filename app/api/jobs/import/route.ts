export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { run, initDb } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

function extractJson<T>(text: string): T {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error('No JSON in response');
  return JSON.parse(match[1]) as T;
}

async function parseJobDescription(raw: string, hintTitle: string, hintCompany: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Extract structured information from this job posting.

JOB POSTING:
${raw.slice(0, 4000)}

${hintTitle ? `User says the title is: ${hintTitle}` : ''}
${hintCompany ? `User says the company is: ${hintCompany}` : ''}

Return ONLY this JSON object:
{
  "title": "Job title",
  "company": "Company name or 'Not specified'",
  "location": "City, State / Remote / Hybrid or 'Not specified'",
  "summary": "2-3 sentence summary of role, responsibilities, and key requirements",
  "match_score": 72
}`,
    }],
  });
  return extractJson<{ title: string; company: string; location: string; summary: string; match_score: number }>(
    (msg.content[0] as { text: string }).text
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { description: string; title?: string; company?: string; url?: string };
  if (!body.description?.trim()) return NextResponse.json({ error: 'description required' }, { status: 400 });

  await initDb();

  try {
    const parsed = await parseJobDescription(body.description, body.title ?? '', body.company ?? '');

    // Placeholder search record — field_id=1 (AI/ML) used as generic fallback for imports
    const { id: searchId } = await run(
      'INSERT INTO job_searches (field_id, user_id, keywords_used_json) VALUES ($1,$2,$3) RETURNING id',
      [1, userId, JSON.stringify(['imported'])]
    );

    const { id: jobId } = await run(`
      INSERT INTO job_listings
        (search_id, field_id, title, company, location, url, source_site, description_raw, description_summary, match_score)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id
    `, [
      searchId, 1,
      body.title || parsed.title || 'Position',
      body.company || parsed.company || 'Company',
      parsed.location || 'Not specified',
      body.url || '',
      'Imported',
      body.description,
      parsed.summary,
      parsed.match_score || 72,
    ]);

    return NextResponse.json({ id: jobId });
  } catch (err) {
    console.error('Job import error:', err);
    return NextResponse.json({ error: 'Failed to import job description' }, { status: 500 });
  }
}
