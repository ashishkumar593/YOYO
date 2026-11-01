'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { YoyoLogo } from '@/components/ui/logo';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application exception:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#07080C] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <header className="border-b border-white/[0.08] bg-[#0A0B10]/90 backdrop-blur-md px-6 lg:px-12 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <YoyoLogo size={28} showText={true} />
        </Link>
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
          Fault Interceptor
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 rounded-2xl border border-white/[0.08] bg-[#0A0B10] text-center space-y-6 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold font-mono text-white">Application Exception</h1>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              {error.message || 'An unexpected client error interrupted interface execution.'}
            </p>
            {error.digest && (
              <div className="text-[10px] font-mono text-zinc-600">
                Digest: {error.digest}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={() => reset()}
              className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Action</span>
            </button>
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl border border-white/[0.1] hover:border-white/30 text-xs font-mono text-zinc-300 hover:text-white transition-all bg-white/[0.02] flex items-center space-x-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

