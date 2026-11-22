'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { YoyoLogo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-600 transition-colors">
      <header className="border-b border-border/80 bg-background/80 backdrop-blur-md px-6 lg:px-12 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <YoyoLogo size={28} showText={true} />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Fault Interceptor
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 rounded-2xl border border-border/80 bg-card text-center space-y-6 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold font-mono text-foreground">Application Exception</h1>
            <p className="text-xs text-muted-foreground leading-relaxed font-mono">
              {error.message || 'An unexpected client error interrupted interface execution.'}
            </p>
            {error.digest && (
              <div className="text-[10px] font-mono text-muted-foreground/80">
                Digest: {error.digest}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={() => reset()}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5 shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Action</span>
            </button>
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-xs font-mono text-muted-foreground hover:text-foreground transition-all flex items-center space-x-1.5"
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
