'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Cpu,
  Terminal,
  Key,
  ListFilter,
  Layers,
  BarChart3,
  CreditCard,
  ShieldAlert,
  Settings,
  BookOpen,
  Activity,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { YoyoLogo } from '@/components/ui/logo';

interface SidebarLink {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  live?: boolean;
}

interface SidebarSection {
  group: string;
  links: SidebarLink[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const sections: SidebarSection[] = [
    {
      group: 'Inference Engine',
      links: [
        { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Model Catalog', href: '/dashboard/models', icon: Cpu },
        { label: 'Playground', href: '/dashboard/playground', icon: Terminal },
        { label: 'Batch Inference', href: '/dashboard/batches', icon: Layers, badge: '50% Off' },
      ],
    },
    {
      group: 'Developer Suite',
      links: [
        { label: 'API Keys', href: '/dashboard/keys', icon: Key },
        { label: 'Request Logs', href: '/dashboard/logs', icon: ListFilter },
        { label: 'Telemetry & Velocity', href: '/dashboard/analytics', icon: BarChart3 },
      ],
    },
    {
      group: 'Enterprise & Setup',
      links: [
        { label: 'Billing & Ledger', href: '/dashboard/billing', icon: CreditCard },
        { label: 'System Status', href: '/status', icon: Activity, live: true },
        { label: 'API Documentation', href: '/docs', icon: BookOpen },
        { label: 'Platform Settings', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ];

  if (user?.role === 'SUPER_ADMIN') {
    sections.push({
      group: 'GPU Infrastructure',
      links: [
        {
          label: 'Super Admin Supervisor',
          href: '/dashboard/admin',
          icon: ShieldAlert,
        },
      ],
    });
  }

  return (
    <aside className="w-64 border-r border-border/80 bg-[#0A0C14]/90 backdrop-blur-xl flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-border/80 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <YoyoLogo size={28} showText={true} />
        </Link>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/60">
          v1.0.0
        </span>
      </div>

      {/* Grouped Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.group} className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 font-mono">
              {section.group}
            </div>
            {section.links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
                    <span className="truncate">{link.label}</span>
                  </div>

                  {link.badge && (
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono",
                      isActive ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    )}>
                      {link.badge}
                    </span>
                  )}

                  {link.live && (
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User profile card & logout */}
      <div className="p-3.5 border-t border-border/80 bg-card/30">
        <div className="flex items-center justify-between mb-2.5 p-2 rounded-xl bg-muted/30 border border-border/40">
          <div className="flex flex-col truncate pr-2">
            <span className="text-xs font-semibold truncate text-foreground">
              {user?.fullName || user?.email?.split('@')[0]}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono truncate">{user?.email}</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
            {user?.role === 'SUPER_ADMIN' ? 'ROOT' : 'DEV'}
          </span>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
