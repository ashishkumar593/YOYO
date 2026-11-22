'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSidebar } from '@/lib/sidebar-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Terminal,
  BookOpen,
  ChevronRight,
  Menu,
  Zap,
  Cpu,
} from 'lucide-react';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Developer Dashboard',
  '/dashboard/models': 'Model Catalog',
  '/dashboard/playground': 'Playground',
  '/dashboard/arena': 'Model Arena',
  '/dashboard/fine-tuning': 'Fine-Tuning Studio',
  '/dashboard/batches': 'Batch Inference',
  '/dashboard/keys': 'API Keys',
  '/dashboard/logs': 'Request Logs',
  '/dashboard/analytics': 'Usage & Analytics',
  '/dashboard/admin': 'Admin Dashboard',
  '/dashboard/security': 'Security & Audit',
  '/dashboard/team': 'Team & Workspaces',
  '/dashboard/billing': 'Billing & Ledger',
  '/dashboard/settings': 'Settings',
};

export function Navbar() {
  const { user } = useAuth();
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const currentTitle = ROUTE_TITLES[pathname] || 'Console';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  return (
    <header className="h-16 border-b border-border/80 bg-card/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200">
      {/* Left: Mobile Toggle & Dynamic Breadcrumbs */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 text-xs min-w-0">
        {/* Mobile Hamburger Menu Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open mobile menu"
          className="p-2 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border/70 md:hidden transition-colors shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Breadcrumb Path */}
        <div className="flex items-center space-x-1.5 text-muted-foreground font-mono truncate">
          <Link
            href={isAdmin ? '/dashboard/admin' : '/dashboard'}
            className="hover:text-foreground transition-colors font-medium hidden sm:inline-flex items-center gap-1 shrink-0"
          >
            {isAdmin ? (
              <span className="text-amber-500 dark:text-amber-400 font-bold">Admin</span>
            ) : (
              <span className="text-foreground font-medium">Console</span>
            )}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 hidden sm:inline-block shrink-0" />
          <span className="font-semibold text-foreground font-sans truncate">{currentTitle}</span>
        </div>

        {/* Region & Hardware Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/80 text-[11px] font-mono text-muted-foreground shrink-0">
          <Cpu className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
          <span>H100 SXM5</span>
          <span className="text-border">•</span>
          <span className="text-emerald-500 dark:text-emerald-400 font-semibold">us-east-1</span>
        </div>
      </div>

      {/* Right: Operational Status, Quotas, Docs, Theme Toggle & Credit */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Live System Status Pill */}
        <Link
          href="/status"
          className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 transition-all text-xs font-mono"
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
          className="hidden sm:flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted/60 transition-all font-medium"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
          <span>Playground</span>
        </Link>

        {/* Monthly Quota Indicator */}
        {user?.quota && (
          <div className="hidden 2xl:flex flex-col text-right pl-3.5 border-l border-border/70">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Quota Meter</span>
            <span className="text-xs font-mono font-medium text-foreground">
              {(Number(user.quota.currentMonthTokensUsed) / 1000).toFixed(0)}k /{' '}
              {(Number(user.quota.monthlyTokenLimit) / 1000000).toFixed(1)}M
            </span>
          </div>
        )}

        {/* Theme Toggle (Dark / Light Mode) */}
        <ThemeToggle />

        {/* Credit Balance */}
        <Link
          href="/dashboard/billing"
          className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-card border border-border hover:border-primary/40 text-xs font-semibold text-foreground transition-all shadow-sm"
          title="Account Credit Balance"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="font-mono text-xs">
            ${((user as any)?.creditBalance?.balanceUsd ?? 500.0).toFixed(2)}
          </span>
        </Link>
      </div>
    </header>
  );
}
