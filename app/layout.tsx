import type { Metadata } from 'next';
import Link from 'next/link';
import { Providers } from './providers';
import { NavUser } from '@/components/NavUser';
import './globals.css';

export const metadata: Metadata = {
  title: 'SkillBridge — Bridge the gap between your skills and your dream job',
  description: 'Bridge the gap between your skills and your dream job with AI-powered job search, resumes, and personalized training.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <Link href="/" className="flex items-center gap-2.5">
                  {/* SkillBridge suspension bridge mark */}
                  <svg width="36" height="27" viewBox="0 0 60 44" fill="none" aria-hidden="true">
                    <rect x="11" y="3" width="6" height="29" rx="1.5" fill="#00BFA5"/>
                    <rect x="43" y="3" width="6" height="29" rx="1.5" fill="#00BFA5"/>
                    <path d="M 0 22 L 14 3 Q 30 17 46 3 L 60 22" stroke="#00BFA5" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="6"    y1="12.5" x2="6"    y2="22" stroke="#00BFA5" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                    <line x1="21.5" y1="9.7"  x2="21.5" y2="22" stroke="#00BFA5" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                    <line x1="30"   y1="13.5" x2="30"   y2="22" stroke="#00BFA5" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                    <line x1="38.5" y1="9.7"  x2="38.5" y2="22" stroke="#00BFA5" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                    <line x1="54"   y1="12.5" x2="54"   y2="22" stroke="#00BFA5" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                    <rect x="0" y="20" width="60" height="5" rx="2.5" fill="#00BFA5"/>
                    <rect x="18" y="26" width="24" height="8" rx="2" fill="#F5A623"/>
                  </svg>
                  <span className="text-xl font-bold" style={{ color: '#0D1F3C' }}>
                    <span style={{ fontWeight: 200 }}>Skill</span><span style={{ color: '#00BFA5', fontWeight: 900, letterSpacing: '-0.03em' }}>Bridge</span>
                  </span>
                  <span className="hidden sm:block text-xs text-gray-400 font-medium mt-0.5">Bridge the gap to your dream job</span>
                </Link>
                <div className="flex items-center gap-1">
                  <nav className="flex items-center gap-1">
                    <Link href="/" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                      Fields
                    </Link>
                    <Link href="/profile" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                      Profile
                    </Link>
                    <Link href="/resumes" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                      Resumes
                    </Link>
                    <Link href="/progress" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                      Progress
                    </Link>
                    <Link href="/paste-job" className="px-3 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors">
                      Paste Job
                    </Link>
                    <Link href="/guide" className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                      Guide
                    </Link>
                  </nav>
                  <NavUser />
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
