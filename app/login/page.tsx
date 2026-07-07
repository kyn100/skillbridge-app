'use client';
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, LogIn } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('error');
    if (e) setUrlError(e);
  }, []);

  async function handleOAuth(provider: string) {
    setOauthLoading(provider);
    setUrlError(null);
    await signIn(provider, { callbackUrl: '/' });
    // signIn redirects on success; if we get here the call failed
    setOauthLoading(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🎯</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to continue your career journey</p>
        </div>

        <div className="card p-8">
          {/* OAuth buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border-2 border-gray-200 rounded-xl font-medium text-sm text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-60"
            >
              {oauthLoading === 'google' ? <Loader2 size={18} className="animate-spin text-gray-400" /> : <GoogleIcon />}
              Continue with Google
            </button>
            <button
              onClick={() => handleOAuth('github')}
              disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border-2 border-gray-900 rounded-xl font-medium text-sm text-white bg-gray-900 hover:bg-gray-800 transition-all disabled:opacity-60"
            >
              {oauthLoading === 'github' ? <Loader2 size={18} className="animate-spin" /> : <GitHubIcon />}
              Continue with GitHub
            </button>
          </div>

          {/* OAuth / URL error banner */}
          {urlError && (
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mb-4">
              {urlError === 'Configuration'
                ? 'OAuth credentials are not set up yet. Please sign in with email below, or add GOOGLE_CLIENT_ID / GITHUB_CLIENT_ID to .env.local and restart the server.'
                : urlError === 'OAuthCallback' || urlError === 'OAuthSignin'
                ? 'Google sign-in failed. Make sure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correctly set in .env.local, and the redirect URI http://localhost:3006/api/auth/callback/google is added in Google Cloud Console.'
                : urlError === 'AccessDenied'
                ? 'Access was denied. Please try again or use a different sign-in method.'
                : `Sign-in error: ${urlError}. Please try again.`}
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or sign in with email</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input w-full"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input w-full"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !!oauthLoading} className="btn-primary w-full justify-center py-2.5">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
