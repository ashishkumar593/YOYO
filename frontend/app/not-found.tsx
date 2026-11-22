'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Terminal, Cpu, BookOpen, Activity } from 'lucide-react';
import { YoyoLogo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-600 relative overflow-hidden transition-colors">
      {/* Background Engineering Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.06] dark:opacity-[0.12]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Focus Glow */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="border-b border-border/80 bg-background/80 backdrop-blur-md px-6 lg:px-12 py-4 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center">
          <YoyoLogo size={28} showText={true} />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Center 404 Terminal Cockpit */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-xl text-center space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 font-mono text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>HTTP 404 — ROUTE NOT FOUND</span>
            </div>
            <h1 className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-foreground">
              404<span className="text-cyan-500">.</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              The requested resource or endpoint does not exist on the YOYO edge router or cloud inference gateway.
            </p>
          </div>

          {/* Quick Navigation Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <Link
              href="/dashboard"
              className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30 transition-all group shadow-sm"
            >
              <Cpu className="w-4 h-4 text-cyan-500 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-foreground">Console</div>
              <div className="text-[10px] text-muted-foreground font-mono">Overview</div>
            </Link>

            <Link
              href="/dashboard/playground"
              className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30 transition-all group shadow-sm"
            >
              <Terminal className="w-4 h-4 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-foreground">Playground</div>
              <div className="text-[10px] text-muted-foreground font-mono">Test models</div>
            </Link>

            <Link
              href="/docs"
              className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30 transition-all group shadow-sm"
            >
              <BookOpen className="w-4 h-4 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-foreground">API Docs</div>
              <div className="text-[10px] text-muted-foreground font-mono">Endpoints</div>
            </Link>

            <Link
              href="/status"
              className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30 transition-all group shadow-sm"
            >
              <Activity className="w-4 h-4 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-foreground">Status</div>
              <div className="text-[10px] text-muted-foreground font-mono">99.99% SLA</div>
            </Link>
          </div>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md"
            >
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
