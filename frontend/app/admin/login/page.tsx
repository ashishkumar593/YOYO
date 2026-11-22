'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldAlert,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Server,
  Terminal,
  ChevronLeft,
  KeyRound,
} from 'lucide-react';
import { YoyoLogo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleFillAdmin = () => {
    setEmail('admin@yoyo.ai');
    setPassword('Admin@Yoyo2026!');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      const userRole = res?.user?.role;

      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        // Immediate token revocation for unauthorized role
        localStorage.removeItem('yoyo_access_token');
        localStorage.removeItem('yoyo_refresh_token');
        throw new Error(
          'Access Denied: Account lacks Platform Operator or Administrator privileges. Please sign in through the Developer Portal.'
        );
      }

      router.push('/dashboard/admin');
    } catch (err: any) {
      setError(err.message || 'Operator authentication failed.');
    } finally {
      setLoading(false);
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
      {/* Elevated Admin Amber Glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[320px] bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation Bar with Back & ThemeToggle */}
      <div className="fixed top-5 left-6 right-6 flex items-center justify-between z-20">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Switch to Developer Portal</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10 pt-8 sm:pt-0">
        {/* Brand & Security Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="mb-3">
            <YoyoLogo size={42} showText={true} />
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Root Operator &amp; Cluster Supervisor</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Platform Operator Sign In
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs font-mono">
            Restricted to infrastructure operators, cluster supervisors, and platform administrators.
          </p>
        </div>

        {/* Admin Card */}
        <div className="bg-card/90 border border-amber-500/20 dark:border-amber-500/30 backdrop-blur-xl p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          {/* Top Amber Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Quick-Access Helper */}
          <div className="mb-5 p-3 rounded-xl bg-muted/40 border border-border/80 flex flex-col space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1 text-amber-500 font-semibold">
                <KeyRound className="w-3 h-3" />
                <span>Super Admin Preset:</span>
              </span>
              <span className="text-[10px]">Click to populate</span>
            </div>
            <button
              type="button"
              onClick={handleFillAdmin}
              className="w-full py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-mono transition-all text-center font-bold flex items-center justify-center gap-2"
            >
              <span>admin@yoyo.ai</span>
              <span className="text-[10px] opacity-70">(Master Operator)</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                Operator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yoyo.ai"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:border-amber-500 focus:outline-none text-sm transition-all text-foreground placeholder-muted-foreground/60 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                  Operator Master Key / Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:border-amber-500 focus:outline-none text-sm transition-all text-foreground placeholder-muted-foreground/60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 text-slate-950 font-bold transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50 shadow-md"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{loading ? 'Verifying Operator Clearance...' : 'Authenticate Operator'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border/80 text-center text-xs text-muted-foreground">
            Building applications with YOYO?{' '}
            <Link
              href="/login"
              className="text-amber-500 hover:underline font-semibold transition-colors"
            >
              Sign in via Developer Portal &rarr;
            </Link>
          </div>
        </div>

        {/* Security Perimeter Footer */}
        <div className="mt-6 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-4 font-mono">
          <span className="flex items-center gap-1">
            <Server className="w-3 h-3 text-emerald-500" />
            <span>Node Supervisor</span>
          </span>
          <span>•</span>
          <span>Role Clearance: ADMIN+</span>
          <span>•</span>
          <span>Audit Logged</span>
        </div>
      </div>
    </div>
  );
}
