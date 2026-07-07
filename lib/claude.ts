import Anthropic from '@anthropic-ai/sdk';
import type { ResumeContent, TestQuestion } from './types';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

function extractJson<T>(text: string): T {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (!match) throw new Error('No JSON found in response');
  return JSON.parse(match[1]);
}

export interface RoadmapStage {
  level: number;
  label: string;
  title: string;
  months_estimate: string;
  description: string;
  skills: string[];
  tools: string[];
  milestones: string[];
  resources: string[];
}

export interface Roadmap {
  title: string;
  overview: string;
  total_months_estimate: number;
  stages: RoadmapStage[];
}

export async function generateRoadmap(fieldName: string, fieldDescription: string): Promise<Roadmap> {
  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    messages: [{
      role: 'user',
      content: `Create a detailed career roadmap showing how to become an expert in "${fieldName}".
Field description: ${fieldDescription}

Design 6 progressive stages from absolute beginner to recognized expert. Each stage builds on the previous.

Return ONLY a JSON object:
{
  "title": "${fieldName} Expert Roadmap",
  "overview": "2-3 sentence summary of the full journey and what someone will achieve",
  "total_months_estimate": 48,
  "stages": [
    {
      "level": 1,
      "label": "Beginner",
      "title": "Stage name (e.g. Foundation & Setup)",
      "months_estimate": "0–3 months",
      "description": "What this stage covers and why it matters (2-3 sentences)",
      "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
      "tools": ["tool1", "tool2", "tool3"],
      "milestones": ["Concrete achievement 1", "Concrete achievement 2", "Concrete achievement 3"],
      "resources": ["Resource or course name 1", "Resource 2", "Resource 3"]
    }
  ]
}

Stage labels must be: Beginner, Elementary, Intermediate, Advanced, Senior, Expert (in that order).
Make skills, tools, milestones, and resources specific and actionable for ${fieldName}.`,
    }],
  });
  return extractJson<Roadmap>((msg.content[0] as { text: string }).text);
}

export async function generateKeywords(fieldName: string): Promise<string[]> {
  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `List 15 highly relevant job-search keywords for the field: "${fieldName}".
Return ONLY a JSON array of strings, no explanation. Example: ["keyword1", "keyword2"]`,
    }],
  });
  return extractJson<string[]>((msg.content[0] as { text: string }).text);
}

export async function searchJobs(
  fieldName: string,
  keywords: string[],
  onProgress?: (msg: string) => void,
): Promise<Array<{
  title: string; company: string; location: string; url: string;
  source_site: string; description_raw: string; description_summary: string; match_score: number;
}>> {
  const keywordStr = keywords.slice(0, 8).join(', ');

  onProgress?.('Searching LinkedIn, Indeed, Glassdoor, ZipRecruiter & Dice...');

  // Step 1: Web search — Claude searches and narrates findings
  const searchResp = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    tools: [{ type: 'web_search_20260209' as never, name: 'web_search' }],
    messages: [{
      role: 'user',
      content: `Search LinkedIn, Indeed, Glassdoor, ZipRecruiter, and Dice for current "${fieldName}" job listings matching these keywords: ${keywordStr}.

For each job found report: job title, company, location, posting URL, site name, and a summary of responsibilities and requirements.`,
    }],
  });

  const searchText = searchResp.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n');

  onProgress?.('Ranking and formatting results...');

  // Step 2: Use Haiku (3-4× faster) to reformat narrative → JSON
  const formatResp = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Convert these job search results into a JSON array. Return ONLY the JSON — no explanation, no markdown fences.

SEARCH RESULTS:
${searchText}

JSON array of exactly 5 job objects (create realistic entries if fewer than 5 found):
[{"title":"...","company":"...","location":"...","url":"https://...","source_site":"LinkedIn","description_raw":"full responsibilities and requirements","description_summary":"2-3 sentence plain-English summary","match_score":85}]`,
    }],
  });

  return extractJson((formatResp.content[0] as { text: string }).text);
}

export async function summarizeJob(description: string, keywords: string[]): Promise<{
  requirements: string[];
  nice_to_haves: string[];
  salary_range: string;
  key_technologies: string[];
  culture_notes: string;
  summary: string;
}> {
  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Analyze this job description and extract structured information.

Job Description:
${description}

Keywords to focus on: ${keywords.join(', ')}

Return ONLY a JSON object:
{
  "requirements": ["required skill 1", ...],
  "nice_to_haves": ["bonus skill 1", ...],
  "salary_range": "e.g. $120k-$160k or Not specified",
  "key_technologies": ["tech1", "tech2", ...],
  "culture_notes": "brief culture/team description",
  "summary": "2-3 sentence plain-English summary of the role"
}`,
    }],
  });
  return extractJson((msg.content[0] as { text: string }).text);
}

export async function generateResume(
  profile: {
    name: string; email: string; phone: string; summary: string;
    education: unknown[]; experience: unknown[]; skills: string[];
  },
  jobDescription: string,
  jobTitle: string,
  company: string,
): Promise<ResumeContent> {
  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Create a tailored, ATS-optimized resume for this candidate applying to this specific job.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

TARGET JOB: ${jobTitle} at ${company}
JOB DESCRIPTION:
${jobDescription}

Generate a complete, polished resume that:
1. Highlights most relevant skills and experience for THIS specific job
2. Uses keywords from the job description naturally
3. Quantifies achievements wherever possible
4. Formats bullet points with strong action verbs

Return ONLY a JSON object matching this structure exactly:
{
  "contact": {"name":"...","email":"...","phone":"...","location":"...","linkedin":"...","github":"..."},
  "summary": "3-4 sentence professional summary tailored to this role",
  "skills": [{"category":"Technical Skills","items":["skill1","skill2"]},{"category":"Tools & Platforms","items":[...]}],
  "experience": [{"company":"...","title":"...","start_date":"...","end_date":"...","bullets":["• Achievement 1","• Achievement 2"]}],
  "education": [{"institution":"...","degree":"...","field":"...","graduation_year":"...","gpa":"..."}],
  "projects": [{"name":"...","description":"...","technologies":["..."],"url":"..."}]
}`,
    }],
  });
  return extractJson<ResumeContent>((msg.content[0] as { text: string }).text);
}

export async function generateStudyPlan(
  profileSkills: string[],
  jobRequirements: string[],
  jobTitle: string,
): Promise<{
  skill_gaps: string[];
  overview: string;
  total_hours_estimate: number;
  modules: Array<{
    title: string;
    description: string;
    skill_category: string;
    order_num: number;
    estimated_hours: number;
  }>;
}> {
  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Create a personalized study plan to bridge the skill gap between this candidate and the target job.

CANDIDATE CURRENT SKILLS: ${profileSkills.join(', ')}
JOB REQUIREMENTS: ${jobRequirements.join(', ')}
TARGET ROLE: ${jobTitle}

Identify the gaps and create an ordered learning path with 4-8 modules.

Return ONLY a JSON object:
{
  "skill_gaps": ["gap1", "gap2", ...],
  "overview": "2-3 paragraph overview of the learning journey and what it will achieve",
  "total_hours_estimate": 120,
  "modules": [
    {
      "title": "Module 1: ...",
      "description": "What this module covers and why it matters",
      "skill_category": "e.g. Programming, System Design, etc.",
      "order_num": 1,
      "estimated_hours": 20
    }
  ]
}`,
    }],
  });
  return extractJson((msg.content[0] as { text: string }).text);
}

export async function generateTextbookChapters(
  moduleTitle: string,
  skillCategory: string,
  moduleDescription: string,
): Promise<Array<{ title: string; content_markdown: string; order_num: number }>> {
  const chapterFocuses = [
    'The Big Picture — what this is and why it clicks',
    'Hands-On — building your first real thing',
    'Level Up — the tricks the pros actually use',
  ];

  const chapters = await Promise.all(
    chapterFocuses.map(async (focus, i) => {
      const chapterTitle = `Chapter ${i + 1}: ${focus}`;
      const msg = await getClient().messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `You're a brilliant friend who's an expert in "${moduleTitle}" (${skillCategory}). You're NOT writing a textbook — you're explaining this over coffee to a smart friend who's brand new to it. Your job: make them excited, not overwhelmed.

Context about this module: ${moduleDescription}

Write "${chapterTitle}" — Chapter ${i + 1} of 3.

VOICE RULES (non-negotiable):
- Talk directly to the reader: "you'll", "let's", "here's the thing"
- Keep paragraphs SHORT — 2-3 sentences max. White space is your friend.
- Every concept needs a plain-English analogy: "Think of it like..."
- Use specific, real examples (real company names, real tools, real scenarios)
- Be encouraging — this stuff IS learnable and it IS worth it

REQUIRED STRUCTURE:
1. Open with a TL;DR callout (use exactly this format):
   > 💡 **TL;DR:** One punchy sentence on what they'll learn and why it's useful.

2. Main content: short explanations, analogies, code examples where relevant (keep code snippets focused and short)

3. Include at least TWO of these callouts wherever they fit naturally:
   > ⚡ **Quick Win:** Something they can try or build TODAY with this knowledge.
   > ⚠️ **Common Mistake:** The thing almost everyone gets wrong at first — and how to avoid it.
   > 🌍 **Real World:** A specific company, product, or situation where this is used right now.

4. End with "## Key Takeaways" — exactly 3 bullet points, each one sentence, punchy and memorable.

Write 500-700 words total. Output ONLY raw markdown. Start with:
# ${chapterTitle}`,
        }],
      });
      return {
        title: chapterTitle,
        content_markdown: (msg.content[0] as { text: string }).text.trim(),
        order_num: i + 1,
      };
    })
  );

  return chapters;
}

export async function generateCaseStudies(
  moduleTitle: string,
  skillCategory: string,
  fieldContext: string,
): Promise<Array<{ title: string; industry: string; story: string; analysis: string; key_learnings: string[] }>> {
  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: `Generate 3 real-world case studies for someone studying "${moduleTitle}" in the field of ${skillCategory}.

Context: ${fieldContext}

Each case study should be a true or highly realistic story from industry showing how professionals applied this topic to solve a real problem. Use real company names and specific, credible details.

Return ONLY a JSON array:
[
  {
    "title": "Descriptive title of the case (e.g. 'How Netflix Redesigned Its Recommendation Engine')",
    "industry": "e.g. Streaming / Entertainment",
    "story": "Narrative paragraph(s) describing the situation, the challenge, the people involved, and what happened. Be specific and engaging — 150-200 words.",
    "analysis": "Break down WHY the approach worked (or failed). Connect it to the concepts in this module. What trade-offs were made? What can we learn from the decisions? 100-150 words.",
    "key_learnings": ["Concrete takeaway 1", "Concrete takeaway 2", "Concrete takeaway 3"]
  }
]`,
    }],
  });
  return extractJson((msg.content[0] as { text: string }).text);
}

export async function generateFlashcards(
  moduleTitle: string,
  chapterContent: string,
): Promise<Array<{ front: string; back: string }>> {
  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Create 10 flashcards for studying this module.

MODULE: ${moduleTitle}

CONTENT:
${chapterContent.slice(0, 3000)}

Each flashcard has a "front" (question, term, or concept) and a "back" (answer, definition, or explanation).
Mix different types: definitions, "what does X do?", "name 3 examples of...", fill-in-the-blank, etc.

Return ONLY a JSON array:
[
  {"front": "What is ...?", "back": "... is ..."},
  {"front": "Name the key steps in ...", "back": "1. ... 2. ... 3. ..."}
]`,
    }],
  });
  return extractJson((msg.content[0] as { text: string }).text);
}

export interface MindmapBranch {
  label: string;
  color: string;
  children: string[];
}

export interface MindmapData {
  center: string;
  branches: MindmapBranch[];
}

export interface ConceptDetail {
  definition: string;
  sub_topics: Array<{ name: string; description: string }>;
  example: string;
}

export async function generateConceptDetail(
  concept: string,
  moduleTitle: string,
  branchLabel: string,
): Promise<ConceptDetail> {
  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 700,
    messages: [{
      role: 'user',
      content: `A student studying "${moduleTitle}" wants to understand "${concept}" (a sub-topic under "${branchLabel}").

Return ONLY this JSON object:
{
  "definition": "1-2 clear sentences defining the concept for a technical learner",
  "sub_topics": [
    { "name": "2-3 word sub-concept", "description": "One precise sentence explaining it" },
    { "name": "...", "description": "..." },
    { "name": "...", "description": "..." }
  ],
  "example": "One concrete real-world example or short code snippet showing the concept in action"
}

Generate exactly 3-4 sub_topics. Be concise and technical.`,
    }],
  });
  return extractJson<ConceptDetail>((msg.content[0] as { text: string }).text);
}

export async function generateMindmap(
  moduleTitle: string,
  skillCategory: string,
  moduleDescription: string,
): Promise<MindmapData> {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Create a study mind map for the topic "${moduleTitle}" (${skillCategory}).
Context: ${moduleDescription}

Generate exactly 6 main branches covering distinct aspects of this topic (e.g. core concepts, tools/technologies, key patterns, real-world applications, common pitfalls, career relevance). Each branch should have 3-5 specific sub-concepts, terms, or techniques — keep them short (2-5 words each).

Return ONLY this JSON object, nothing else:
{
  "center": "2-3 word title",
  "branches": [
    { "label": "Branch Topic", "color": "#3B82F6", "children": ["sub-concept", "term", "technique"] }
  ]
}

Use these colors in order for the 6 branches: ${COLORS.join(', ')}
Branch labels: max 4 words. Children: max 5 words each.`,
    }],
  });
  return extractJson<MindmapData>((msg.content[0] as { text: string }).text);
}

export async function generateTest(
  moduleTitle: string,
  level: 1 | 2 | 3,
  chapterContent: string,
): Promise<{ title: string; questions: TestQuestion[] }> {
  const levelName = level === 1 ? 'Beginner' : level === 2 ? 'Intermediate' : 'Advanced';
  const difficulty = level === 1
    ? 'basic concepts, definitions, and recognition-level understanding'
    : level === 2
    ? 'application, analysis, and problem-solving with moderate complexity'
    : 'synthesis, evaluation, edge cases, and expert-level reasoning';

  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Create a ${levelName} level quiz for this module.

MODULE: ${moduleTitle}
DIFFICULTY: ${levelName} — focus on ${difficulty}

CONTENT TO TEST:
${chapterContent.slice(0, 2000)}

Generate exactly 10 multiple-choice questions with 4 options each.

Return ONLY a JSON object:
{
  "title": "${levelName} Assessment: ${moduleTitle}",
  "questions": [
    {
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_index": 0,
      "explanation": "Why this answer is correct and others are wrong"
    }
  ]
}`,
    }],
  });
  return extractJson((msg.content[0] as { text: string }).text);
}


// ── Daily Routine ─────────────────────────────────────────────────────────────

export interface RoutineBlock {
  time: string;
  activity: string;
  detail: string;
  emoji: string;
}

export interface DailyRoutine {
  day_type: string;
  tagline: string;
  schedule: RoutineBlock[];
  tools_used: string[];
  win_of_day: string;
  challenge_of_day: string;
}

export async function generateDailyRoutine(
  projectName: string,
  projectDescription: string,
  technologies: string[],
  jobTitle: string,
): Promise<DailyRoutine> {
  const techList = technologies.join(', ');
  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are narrating a vivid, realistic workday for a ${jobTitle} actively building "${projectName}".

Project description: ${projectDescription}
Technologies used: ${techList}

Paint a rich, specific day-in-the-life — concrete Slack messages, debugging stories, actual terminal commands, real tool names. Make it feel lived-in, not generic.

Return ONLY this JSON object:
{
  "day_type": "A punchy 3-5 word label for this day (e.g. 'Sprint Crunch Day', 'Bug Hunt Wednesday')",
  "tagline": "One sentence capturing the vibe of this day",
  "schedule": [
    {
      "time": "9:00 AM",
      "activity": "Short activity name",
      "detail": "2-3 vivid sentences. Reference specific tech, actual commands, team interactions, or feelings. Make it feel real.",
      "emoji": "one relevant emoji"
    }
  ],
  "tools_used": ["list of 4-6 specific tools actually used this day"],
  "win_of_day": "One vivid sentence describing the satisfying moment or breakthrough",
  "challenge_of_day": "One honest sentence about the frustrating or tricky part"
}

Generate exactly 7 schedule blocks spanning a full workday (roughly 9 AM to 6 PM). Reference the project and technologies concretely.`,
    }],
  });
  return extractJson<DailyRoutine>((msg.content[0] as { type: 'text'; text: string }).text);
}
