'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { YoyoLogo } from '@/components/ui/logo';

export default function PrivacyPage() {
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
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Privacy & Data Governance</span>
          <h1 className="text-3xl font-black text-white mt-1">Zero Data Retention Policy</h1>
          <p className="text-zinc-400 text-xs font-mono mt-1">Last updated: October 2026</p>
        </div>

        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed font-normal border-t border-white/[0.08] pt-6">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">1. Zero Prompt Training Guarantee</h2>
            <p>
              We firmly guarantee that <strong>prompts, completion payloads, and embedding inputs sent to YOYO endpoints are NEVER used to train or fine-tune open-weights models</strong>, nor are they shared with third-party vendors.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">2. Ephemeral In-Memory Inference</h2>
            <p>
              Inference requests are processed entirely in ephemeral GPU memory (VRAM) and streamed back to your application over Server-Sent Events (SSE). Once the final chunk is emitted, prompt buffers are immediately cleared from memory.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">3. Token Telemetry & Logging</h2>
            <p>
              For quota enforcement and billing calculations, we log only non-sensitive numeric metadata: prompt token count, completion token count, latency in milliseconds, and status code. We never persist raw prompt text in our telemetry database.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">4. Cryptographic Key Storage</h2>
            <p>
              API keys are hashed using one-way SHA-256 algorithms with salt before being stored in PostgreSQL. Raw API key secrets cannot be decrypted or retrieved by anyone, including system administrators.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">5. Machine-Verifiable Audit Header</h2>
            <p>
              Every response emitted by the Fastify Edge Gateway carries the explicit enterprise audit compliance header: <code className="text-cyan-400 font-mono">x-yoyo-zero-data-retention: true</code>, allowing automated compliance tools, proxy monitors, and SOC2 auditors to mathematically verify that volatile zero-retention routing was maintained.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

