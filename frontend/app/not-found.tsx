'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Terminal, Cpu, Compass, BookOpen, Activity } from 'lucide-react';
import { YoyoLogo } from '@/components/ui/logo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#07080C] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-hidden">
      {/* Background Engineering Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.12]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Focus Glow */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="border-b border-white/[0.08] bg-[#0A0B10]/90 backdrop-blur-md px-6 lg:px-12 py-4 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center">
          <YoyoLogo size={28} showText={true} />
        </Link>
        <Link
          href="/"
          className="text-xs font-mono text-zinc-400 hover:text-white transition-colors flex items-center space-x-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </Link>
      </header>

      {/* Center 404 Terminal Cockpit */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-xl text-center space-y-8">
          
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>HTTP 404 — ROUTE NOT FOUND</span>
            </div>
            <h1 className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-white">
              404<span className="text-cyan-400">.</span>
            </h1>
            <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
              The requested resource or endpoint does not exist on the YOYO edge router or cloud inference gateway.
            </p>
          </div>

          {/* Quick Navigation Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <Link
              href="/dashboard"
              className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0A0B10] hover:border-cyan-500/40 hover:bg-[#0D0F18] transition-all group"
            >
              <Cpu className="w-4 h-4 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">Console</div>
              <div className="text-[10px] text-zinc-500 font-mono">Overview</div>
            </Link>

            <Link
              href="/dashboard/playground"
              className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0A0B10] hover:border-cyan-500/40 hover:bg-[#0D0F18] transition-all group"
            >
              <Terminal className="w-4 h-4 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">Playground</div>
              <div className="text-[10px] text-zinc-500 font-mono">Test models</div>
            </Link>

            <Link
              href="/docs"
              className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0A0B10] hover:border-cyan-500/40 hover:bg-[#0D0F18] transition-all group"
            >
              <BookOpen className="w-4 h-4 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">API Docs</div>
              <div className="text-[10px] text-zinc-500 font-mono">Endpoints</div>
            </Link>

            <Link
              href="/status"
              className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0A0B10] hover:border-cyan-500/40 hover:bg-[#0D0F18] transition-all group"
            >
              <Activity className="w-4 h-4 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">Status</div>
              <div className="text-[10px] text-zinc-500 font-mono">99.99% SLA</div>
            </Link>
          </div>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <span>Back to Home</span>
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}

