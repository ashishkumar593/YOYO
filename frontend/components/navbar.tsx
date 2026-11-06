'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Terminal,
  BookOpen,
  ChevronRight,
  Activity,
  Server,
  Zap,
  CreditCard,
  Search,
  Cpu,
} from 'lucide-react';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/models': 'Model Catalog',
  '/dashboard/playground': 'Playground',
  '/dashboard/batches': 'Batch Inference',
  '/dashboard/keys': 'API Keys',
  '/dashboard/logs': 'Request Logs',
  '/dashboard/analytics': 'Usage & Analytics',
  '/dashboard/billing': 'Billing & Ledger',
  '/dashboard/settings': 'Settings',
  '/dashboard/admin': 'Super Admin Cluster',
};

export function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const currentTitle = ROUTE_TITLES[pathname] || 'Console';

  return (
    <header className="h-16 border-b border-border/70 bg-background/85 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Dynamic Developer Breadcrumbs & Cluster Pill */}
      <div className="flex items-center space-x-3 text-xs">
        <div className="flex items-center space-x-1.5 text-muted-foreground font-mono">
          <Link href="/dashboard" className="hover:text-foreground transition-colors font-medium">
            console
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="font-semibold text-foreground font-sans">{currentTitle}</span>
        </div>

        {/* Region & Hardware Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-muted/40 border border-border/80 text-[11px] font-mono text-muted-foreground">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span>H100 SXM5</span>
          <span className="text-border">•</span>
          <span className="text-emerald-400 font-semibold">us-east-1</span>
        </div>
      </div>

      {/* Right: Operational Status, Quotas, Docs & Shortcuts */}
      <div className="flex items-center space-x-3.5">
        {/* Live System Status Pill */}
        <Link
          href="/status"
          className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 transition-all text-xs font-mono"
          title="Inspect real-time system health"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium tracking-tight">0.42ms Gateway</span>
        </Link>

        {/* Docs Link */}
        <Link
          href="/docs"
          className="hidden md:flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted/60 transition-all font-medium"
        >
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span>API Docs</span>
        </Link>

        {/* Playground Quick Jump */}
        <Link
          href="/dashboard/playground"
          className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted/60 transition-all font-medium"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Playground</span>
        </Link>

        {/* Monthly Quota Indicator */}
        {user?.quota && (
          <div className="hidden xl:flex flex-col text-right pl-3.5 border-l border-border/70">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Quota Meter</span>
            <span className="text-xs font-mono font-medium text-foreground">
              {(Number(user.quota.currentMonthTokensUsed) / 1000).toFixed(0)}k /{' '}
              {(Number(user.quota.monthlyTokenLimit) / 1000000).toFixed(1)}M
            </span>
          </div>
        )}

        {/* Credit Balance */}
        <Link
          href="/dashboard/billing"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 text-xs font-semibold text-foreground transition-all shadow-sm"
          title="Account Credit Balance"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="font-mono text-xs">
            ${((user as any)?.creditBalance?.balanceUsd ?? 500.0).toFixed(2)}
          </span>
        </Link>
      </div>
    </header>
  );
}


