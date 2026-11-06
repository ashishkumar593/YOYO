'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, Lock, Mail, User, AlertCircle, CheckCircle2, Zap, Shield } from 'lucide-react';
import { YoyoLogo } from '@/components/ui/logo';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(email, password, fullName);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#07080C] text-zinc-100 relative overflow-hidden">
      {/* Precision Background Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.12]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="mb-4">
            <YoyoLogo size={42} showText={true} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create Developer Account</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Get instant access to open-weights APIs with 5M free tokens
          </p>
        </div>

        {/* Benefits Strip */}
        <div className="mb-4 grid grid-cols-3 gap-2 text-center text-[10px] font-mono text-zinc-400">
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-emerald-400 font-bold block">5M Tokens</span>
            <span>Monthly Free</span>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-cyan-400 font-bold block">0.4ms Edge</span>
            <span>Fastify Route</span>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-amber-400 font-bold block">No Card</span>
            <span>Instant Setup</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#0C0E17]/90 border border-white/[0.08] backdrop-blur-xl p-8 rounded-2xl shadow-2xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.1] focus:border-cyan-400 focus:outline-none text-sm transition-all text-white placeholder-zinc-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
                Work / Developer Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.1] focus:border-cyan-400 focus:outline-none text-sm transition-all text-white placeholder-zinc-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
                Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.1] focus:border-cyan-400 focus:outline-none text-sm transition-all text-white placeholder-zinc-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50 shadow-md"
            >
              <span>{loading ? 'Provisioning Developer Keys...' : 'Create Developer Account'}</span>
              <ArrowRight className="w-4 h-4 text-zinc-950" />
            </button>

            <p className="text-[11px] text-zinc-500 text-center pt-2 leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-cyan-400 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-cyan-400 hover:underline">
                Zero-Retention Privacy Policy
              </Link>.
            </p>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.06] text-center text-xs text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              Sign In to Console
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
