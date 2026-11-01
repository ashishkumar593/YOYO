'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { YoyoLogo } from '@/components/ui/logo';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#07080C] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <header className="border-b border-white/[0.08] bg-[#0A0B10]/90 backdrop-blur-md px-6 lg:px-12 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <YoyoLogo size={28} showText={true} />
        </Link>
        <Link
          href="/"
          className="text-xs font-mono text-zinc-400 hover:text-white transition-colors flex items-center space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">// LEGAL & GOVERNANCE</span>
          <h1 className="text-3xl font-black text-white mt-1">Terms of Service</h1>
          <p className="text-zinc-400 text-xs font-mono mt-1">Last updated: October 2026</p>
        </div>

        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed font-normal border-t border-white/[0.08] pt-6">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">1. API Access & Provisioning</h2>
            <p>
              By generating an API key or using YOYO API services, you agree to access foundation model inference endpoints in compliance with applicable law and ethical safety standards. You are solely responsible for maintaining the confidentiality of your <code className="text-cyan-400 font-mono">sk_live_...</code> API keys and all activity conducted through them.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">2. Permitted Use & Safety Guardrails</h2>
            <p>
              You agree not to use the API endpoints to generate harmful, illegal, or abusive material, conduct denial-of-service attempts against cloud GPU nodes, or attempt to circumvent per-key rate limits (RPM / TPM).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">3. Service Level & Availability</h2>
            <p>
              YOYO provides high-availability cloud GPU clusters with redundant routing. While we target 99.99% uptime, we do not guarantee uninterrupted execution during scheduled hardware maintenance or upstream cloud provider outages.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">4. Account Termination</h2>
            <p>
              We reserve the right to suspend or revoke API access for accounts that violate rate limit quotas, attempt unauthorized cluster intrusions, or fail to resolve billing chargebacks.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

