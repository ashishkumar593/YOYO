'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Zap, BookOpen, Terminal } from 'lucide-react';

export function Navbar() {
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <span className="text-xs font-medium text-muted-foreground">API Gateway Status:</span>
        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Operational</span>
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/playground"
          className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-all"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Playground</span>
        </Link>

        <Link
          href="/status"
          className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-all"
        >
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span>System Status</span>
        </Link>

        {user?.quota && (
          <div className="hidden md:flex flex-col text-right pl-4 border-l border-border">
            <span className="text-[10px] text-muted-foreground">Monthly Quota</span>
            <span className="text-xs font-mono font-medium text-foreground">
              {(Number(user.quota.currentMonthTokensUsed) / 1000).toFixed(0)}k /{' '}
              {(Number(user.quota.monthlyTokenLimit) / 1000000).toFixed(1)}M tokens
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

