'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Cpu,
  Terminal,
  Key,
  BarChart3,
  CreditCard,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const links = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Model Catalog', href: '/dashboard/models', icon: Cpu },
    { label: 'Playground', href: '/dashboard/playground', icon: Terminal },
    { label: 'API Keys', href: '/dashboard/keys', icon: Key },
    { label: 'Usage & Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { label: 'Billing & Plans', href: '/dashboard/billing', icon: CreditCard },
  ];

  if (user?.role === 'SUPER_ADMIN') {
    links.push({
      label: 'Super Admin',
      href: '/dashboard/admin',
      icon: ShieldAlert,
    });
  }

  return (
    <aside className="w-64 border-r border-border bg-card/60 backdrop-blur-md flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="h-16 px-6 border-b border-border flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm shadow-md shadow-primary/20">
          Y
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base tracking-tight leading-none">YOYO</span>
          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">Inference Platform</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">
          Developer Suite
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile card & logout */}
      <div className="p-4 border-t border-border bg-card/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col truncate pr-2">
            <span className="text-xs font-semibold truncate text-foreground">
              {user?.fullName || user?.email?.split('@')[0]}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-primary/10 text-primary border border-primary/20">
            {user?.role}
          </span>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-muted/40 hover:bg-red-500/10 hover:text-red-400 border border-border/60 text-xs font-medium text-muted-foreground transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
