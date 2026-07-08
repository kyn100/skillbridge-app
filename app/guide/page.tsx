import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Step {
  num: number;
  emoji: string;
  title: string;
  description: string;
  bullets?: string[];
  tip?: string;
  href?: string;
  hrefLabel?: string;
  color: string;
  bgColor: string;
}

const STEPS: Step[] = [
  {
    num: 1,
    emoji: '👤',
    title: 'Set Up Your Profile',
    description: 'Enter your name, education, work experience, and current skills. This is used by AI to personalize your resume and study plan — the more detail the better.',
    tip: 'Be specific about your skills. Instead of "coding", write "Python, React, SQL".',
    href: '/profile',
    hrefLabel: 'Go to Profile',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50 border-violet-200',
  },
  {
    num: 2,
    emoji: '🗂️',
    title: 'Pick a Job Field',
    description: 'Choose from 20 career fields — AI/ML, Software Engineering, Data Science, Cybersecurity, FinTech, and more. Each field comes pre-loaded with relevant keywords.',
    href: '/',
    hrefLabel: 'Browse Fields',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  {
    num: 3,
    emoji: '🏷️',
    title: 'Customize Your Keywords',
    description: 'Review the default keywords for your field and tailor them to your target. Add niche skills, remove irrelevant ones, or generate more with AI.',
    tip: 'More specific keywords (e.g. "LangChain", "Kubernetes") yield better job matches than generic terms.',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50 border-cyan-200',
  },
  {
    num: 4,
    emoji: '🔍',
    title: 'Search for Jobs',
    description: 'AI searches LinkedIn, Indeed, Glassdoor, ZipRecruiter, and Dice simultaneously using your keywords. Results are ranked by match score.',
    tip: 'The search takes 15–25 seconds — watch the live progress steps while it runs.',
    color: 'text-sky-700',
    bgColor: 'bg-sky-50 border-sky-200',
  },
  {
    num: 5,
    emoji: '💼',
    title: 'Review Job Details',
    description: 'Click any job result to see an AI-generated breakdown: required skills, nice-to-haves, salary range, tech stack, and culture notes. A match score shows how well you fit.',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50 border-teal-200',
  },
  {
    num: 6,
    emoji: '🎤',
    title: 'Practice Interview',
    description: 'From any job detail page, click "Practice Interview" to run an AI-powered mock interview tailored to that role. Claude generates 6 questions based on the job description and your background.',
    bullets: [
      'Choose the interview type: Mixed, Behavioral, or Technical',
      'Answer each question in your own words — take your time',
      'Get instant feedback: score out of 10, strengths, and improvements for every answer',
      'Collapsible sample answers show how an ideal response is structured',
      'Final results screen shows your average score and a full per-question recap',
    ],
    tip: 'Run the interview before generating your resume — the feedback tells you which skills to emphasize.',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50 border-rose-200',
  },
  {
    num: 7,
    emoji: '📄',
    title: 'Generate Your Resume',
    description: 'AI creates a tailored, ATS-optimized resume for that specific job — highlighting the skills and experience that match the posting, with strong action verbs and quantified achievements.',
    bullets: [
      'Resume is structured for ATS keyword scanning',
      'Exportable as a PDF with one click',
      'All past resumes are saved under Resumes in the nav',
    ],
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
  },
  {
    num: 8,
    emoji: '🗺️',
    title: 'Build a Study Plan',
    description: 'From the resume page, click "Create Study Plan". AI analyzes the gap between your current skills and the job\'s requirements, then produces an ordered learning roadmap of 4–8 modules.',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
  {
    num: 9,
    emoji: '📚',
    title: 'Study Each Module',
    description: 'Click any unlocked module to access four study tools — all AI-generated specifically for that topic:',
    bullets: [
      '📖  Textbook — 3 chapters covering fundamentals, practical application, and advanced topics. Includes full-text search.',
      '🕸️  Mind Map — visual radial map of key concepts. Click branches to expand or collapse.',
      '🃏  Flashcards — 10 flip-cards for active recall. Shuffle, mark "Got it", and track progress.',
      '🏭  Case Studies — 3 real-world industry stories with analysis and key lessons.',
    ],
    tip: 'Work through Textbook first, then use Mind Map and Flashcards to reinforce before testing.',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  {
    num: 10,
    emoji: '✏️',
    title: 'Take the Tests',
    description: 'Each module has three quiz levels. You must pass one level (≥70%) to unlock the next.',
    bullets: [
      'Beginner — definitions and basic recognition',
      'Intermediate — application and problem-solving',
      'Advanced — synthesis, edge cases, expert reasoning',
    ],
    tip: 'Passing all three levels marks the module as completed and unlocks the next module in your plan.',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
  },
  {
    num: 11,
    emoji: '📊',
    title: 'Track Your Progress',
    description: 'The Progress dashboard shows completed modules, test scores, average grade, and your overall readiness across all study plans.',
    href: '/progress',
    hrefLabel: 'View Progress',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
  },
];

const EXTRAS = [
  {
    emoji: '🗺️',
    title: 'Career Roadmap',
    description: 'From any field\'s keyword page, click "View Roadmap" to see a 6-stage visual timeline — Beginner → Elementary → Intermediate → Advanced → Senior → Expert — with skills, tools, milestones, and resources for each stage.',
  },
  {
    emoji: '📁',
    title: 'Saved Resumes',
    description: 'Every resume you generate is saved automatically. Access them anytime from the Resumes link in the top navigation — browse by job title and company.',
  },
  {
    emoji: '🔐',
    title: 'Multiple Sign-In Options',
    description: 'Sign in with Google, GitHub, or create a local account with email and password. All your data is private and scoped to your account.',
  },
];

export default function GuidePage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">🌉</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">How to Use SkillBridge</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          SkillBridge takes you from "I need a job" to "I'm qualified for that job" — one step at a time.
          Follow the 10 steps below in order for the best experience.
        </p>
      </div>

      {/* Quick flow summary */}
      <div className="card p-5 mb-10 bg-gradient-to-r from-blue-50 to-violet-50 border-blue-200">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">The Full Pipeline</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          {['Profile', 'Pick Field', 'Keywords', 'Search Jobs', 'Interview', 'Resume', 'Study Plan', 'Study', 'Tests', 'Progress'].map((s, i, arr) => (
            <span key={s} className="flex items-center gap-2">
              <span className="font-medium">{s}</span>
              {i < arr.length - 1 && <ArrowRight size={13} className="text-gray-400 shrink-0" />}
            </span>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-5 mb-12">
        {STEPS.map((step, i) => (
          <div key={step.num} className="relative">
            {/* Connector line between steps */}
            {i < STEPS.length - 1 && (
              <div className="absolute left-6 top-full h-5 w-0.5 bg-gray-200 z-10" />
            )}

            <div className={`card p-5 border ${step.bgColor}`}>
              <div className="flex items-start gap-4">
                {/* Step number + emoji */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm bg-white border ${step.bgColor}`}>
                    {step.emoji}
                  </div>
                  <span className={`text-xs font-bold ${step.color}`}>Step {step.num}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <h2 className={`font-bold text-lg mb-1 ${step.color}`}>{step.title}</h2>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>

                  {step.bullets && (
                    <ul className="mt-2 space-y-1.5">
                      {step.bullets.map((b, bi) => (
                        <li key={bi} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="mt-0.5 shrink-0 text-gray-300">›</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {step.tip && (
                    <div className="mt-3 px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">Tip: </span>{step.tip}
                    </div>
                  )}

                  {step.href && (
                    <Link
                      href={step.href}
                      className={`inline-flex items-center gap-1.5 mt-3 text-sm font-semibold ${step.color} hover:underline`}
                    >
                      {step.hrefLabel} <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Extras */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Additional Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {EXTRAS.map(ex => (
            <div key={ex.title} className="card p-4">
              <div className="text-2xl mb-2">{ex.emoji}</div>
              <div className="font-semibold text-gray-900 text-sm mb-1">{ex.title}</div>
              <p className="text-xs text-gray-500 leading-relaxed">{ex.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pb-4">
        <Link href="/profile" className="btn-primary inline-flex px-6 py-2.5">
          Get Started — Set Up Your Profile <ArrowRight size={15} />
        </Link>
        <p className="text-xs text-gray-400 mt-3">Start with your profile — everything else follows from there.</p>
      </div>
    </div>
  );
}
