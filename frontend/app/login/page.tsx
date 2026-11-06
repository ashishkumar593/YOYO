'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, Lock, Mail, AlertCircle, ShieldCheck, Terminal, Cpu } from 'lucide-react';
import { YoyoLogo } from '@/components/ui/logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

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
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign in to Platform Console</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Fastify Edge Gateway • H100 SXM5 GPU Cluster
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0C0E17]/90 border border-white/[0.08] backdrop-blur-xl p-8 rounded-2xl shadow-2xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Developer Quick-Fill Preset Pills */}
          <div className="mb-5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span>Dev Quick-Access:</span>
              </span>
              <span className="text-[10px] text-zinc-500">Click to fill</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('admin@yoyo.ai', 'Admin@Yoyo2026!')}
                className="flex-1 py-1 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-[11px] font-mono transition-all text-center"
              >
                Super Admin (Root)
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
                Email Address
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium font-sans"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.1] focus:border-cyan-400 focus:outline-none text-sm transition-all text-white placeholder-zinc-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50 shadow-md"
            >
              <span>{loading ? 'Authenticating with Gateway...' : 'Authenticate & Enter Console'}</span>
              <ArrowRight className="w-4 h-4 text-zinc-950" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.06] text-center text-xs text-zinc-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              Create Developer Account
            </Link>
          </div>
        </div>

        {/* Security / Parity Footer */}
        <div className="mt-6 text-center text-[11px] text-zinc-600 flex items-center justify-center gap-4 font-mono">
          <span>SHA-256 Auth</span>
          <span>•</span>
          <span>Fastify 5 Proxy</span>
          <span>•</span>
          <span>Zero Retention</span>
        </div>
      </div>
    </div>
  );
}
