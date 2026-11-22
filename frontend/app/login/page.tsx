'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Terminal,
  ShieldAlert,
  Code2,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { YoyoLogo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthModal, setOauthModal] = useState<'google' | 'github' | null>(null);
  const [customOauthEmail, setCustomOauthEmail] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);

  const router = useRouter();
  const { login, oauthLogin } = useAuth();

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (
    provider: 'google' | 'github',
    targetEmail?: string,
    targetName?: string
  ) => {
    setError('');
    setOauthLoading(true);
    const chosenEmail =
      targetEmail ||
      customOauthEmail.trim() ||
      (provider === 'google' ? 'developer.alex@gmail.com' : 'octocat.dev@github.com');
    const chosenName =
      targetName ||
      (provider === 'google' ? 'Alex Developer (Google)' : 'Octocat Developer (GitHub)');

    try {
      await oauthLogin(provider, {
        email: chosenEmail,
        fullName: chosenName,
        avatarUrl:
          provider === 'github'
            ? 'https://avatars.githubusercontent.com/u/583231'
            : 'https://lh3.googleusercontent.com/a/default-user',
      });
      setOauthModal(null);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || `Failed to authenticate with ${provider}.`);
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground relative overflow-hidden transition-colors">
      {/* Precision Background Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.07] dark:opacity-[0.14]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navbar items */}
      <div className="fixed top-5 left-6 right-6 flex items-center justify-between z-20">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <Code2 className="w-4 h-4 text-primary" />
          <span>YOYO Developer Platform</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/login"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium border border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Admin Sign In &rarr;</span>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="w-full max-w-md relative z-10 pt-8 sm:pt-0">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="mb-3">
            <YoyoLogo size={42} showText={true} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Developer Sign In
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Fastify Edge Gateway • Foundation Model APIs &amp; SDKs
          </p>
        </div>

        {/* Card */}
        <div className="bg-card/90 border border-border/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Social Developer OAuth Logins */}
          <div className="space-y-2.5 mb-5">
            <button
              type="button"
              onClick={() => {
                setCustomOauthEmail('');
                setOauthModal('google');
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-border/90 bg-muted/30 hover:bg-muted font-medium text-xs text-foreground transition-all flex items-center justify-center shadow-sm group hover:border-border"
            >
              <svg className="w-4 h-4 mr-2.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCustomOauthEmail('');
                setOauthModal('github');
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-border/90 bg-muted/30 hover:bg-muted font-medium text-xs text-foreground transition-all flex items-center justify-center shadow-sm group hover:border-border"
            >
              <svg className="w-4 h-4 mr-2.5 shrink-0 fill-foreground" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>Continue with GitHub</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/80" />
            </div>
            <span className="relative px-3 bg-card text-[11px] font-mono text-muted-foreground uppercase">
              Or continue with developer email
            </span>
          </div>

          {/* Developer Quick-Fill Preset Pill */}
          <div className="mb-4 p-2.5 rounded-xl bg-muted/40 border border-border flex flex-col space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1 text-primary font-semibold">
                <Terminal className="w-3 h-3" />
                <span>Dev Sandbox Account:</span>
              </span>
              <span className="text-[10px]">Click to fill</span>
            </div>
            <button
              type="button"
              onClick={() => handleFillDemo('dev@yoyo.ai', 'Dev@Yoyo2026!')}
              className="w-full py-1.5 px-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-mono transition-all text-center font-bold flex items-center justify-center gap-2"
            >
              <span>dev@yoyo.ai</span>
              <span className="text-[10px] opacity-70">(Default Developer)</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                Developer Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none text-sm transition-all text-foreground placeholder-muted-foreground/60 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline transition-colors font-medium font-sans"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none text-sm transition-all text-foreground placeholder-muted-foreground/60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50 shadow-md"
            >
              <span>{loading ? 'Authenticating with Gateway...' : 'Authenticate & Enter Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 pt-5 border-t border-border/80 flex flex-col space-y-2.5 text-center text-xs text-muted-foreground">
            <div>
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="text-primary hover:underline font-semibold transition-colors"
              >
                Create Developer Account
              </Link>
            </div>
            <div>
              Platform Operator?{' '}
              <Link
                href="/admin/login"
                className="text-amber-500 hover:underline font-semibold transition-colors"
              >
                Sign in to Admin Console &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Security / Parity Footer */}
        <div className="mt-6 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-4 font-mono">
          <span>SHA-256 Auth</span>
          <span>•</span>
          <span>Fastify 5 Proxy</span>
          <span>•</span>
          <span>Zero Retention (ZDR)</span>
        </div>
      </div>

      {/* OAuth Fast Sign-in Modal / Selector */}
      {oauthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setOauthModal(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              {oauthModal === 'google' ? (
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  <Code2 className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-foreground capitalize">
                  Sign in with {oauthModal}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Instant developer onboarding &amp; token minting
                </p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <button
                type="button"
                disabled={oauthLoading}
                onClick={() =>
                  handleOAuthSignIn(
                    oauthModal,
                    oauthModal === 'google' ? 'developer.alex@gmail.com' : 'octocat.dev@github.com',
                    oauthModal === 'google' ? 'Alex Developer' : 'Octocat Developer'
                  )
                }
                className="w-full p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-foreground">
                    {oauthModal === 'google' ? 'Alex Developer' : 'Octocat Developer'}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {oauthModal === 'google' ? 'developer.alex@gmail.com' : 'octocat.dev@github.com'}
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <div className="relative text-center my-2">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">
                  Or use custom {oauthModal} email
                </span>
              </div>

              <div>
                <input
                  type="email"
                  value={customOauthEmail}
                  onChange={(e) => setCustomOauthEmail(e.target.value)}
                  placeholder={`your.name@${oauthModal === 'google' ? 'gmail.com' : 'github.com'}`}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder-muted-foreground/60 font-mono focus:border-primary focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={oauthLoading}
                onClick={() => handleOAuthSignIn(oauthModal)}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow"
              >
                <span>
                  {oauthLoading ? 'Authenticating...' : `Confirm & Authorize with ${oauthModal === 'google' ? 'Google' : 'GitHub'}`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
