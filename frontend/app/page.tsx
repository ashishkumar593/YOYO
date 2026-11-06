'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Terminal,
  Cpu,
  Zap,
  ArrowRight,
  Layers,
  Copy,
  Check,
  Play,
  RotateCw,
  Radio,
  ChevronDown,
  Shield,
  Server,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  ExternalLink,
  Code2,
  Lock,
  Globe2,
} from 'lucide-react';
import { YoyoLogo } from '@/components/ui/logo';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'curl' | 'python' | 'ts' | 'openai' | 'stream'>('stream');
  const [copied, setCopied] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [ttft, setTtft] = useState<number | null>(null);
  const [tokenSpeed, setTokenSpeed] = useState<number | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [monthlyTokensMillions, setMonthlyTokensMillions] = useState<number>(50);

  // Sample live stream response
  const sampleStreamResponse =
    "Speculative decoding accelerates transformer inference by pairing a small draft model with a larger foundation model.\n\n1. Draft Phase: A fast model (such as Llama 3.3 8B) generates K candidate tokens in speculative succession.\n2. Parallel Verification: The target model (Llama 3.3 70B) executes a single parallel validation pass across all draft tokens.\n3. Acceptance: Verified tokens are accepted in parallel, delivering 2.5x higher throughput with identical mathematical output.";

  const handleRunStream = () => {
    if (isStreaming) return;
    setIsStreaming(true);
    setStreamText('');
    setTtft(null);
    setTokenSpeed(null);

    const startTime = performance.now();
    let currentIdx = 0;
    const words = sampleStreamResponse.split(' ');

    // TTFT simulation
    setTimeout(() => {
      setTtft(Math.round(performance.now() - startTime));

      const interval = setInterval(() => {
        if (currentIdx < words.length) {
          setStreamText((prev) => (prev ? prev + ' ' + words[currentIdx] : words[currentIdx]));
          currentIdx++;
          const elapsedSec = (performance.now() - startTime) / 1000;
          setTokenSpeed(Math.round((currentIdx * 1.35) / elapsedSec));
        } else {
          clearInterval(interval);
          setIsStreaming(false);
        }
      }, 30);
    }, 140);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeSnippets: Record<string, string> = {
    curl: `curl https://api.yoyo.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_live_your_api_key_here" \\
  -d '{
    "model": "llama-3.3-70b",
    "messages": [{"role": "user", "content": "Benchmark cloud matrix multiplication"}],
    "stream": true
  }'`,
    python: `# pip install yoyo-ai
from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_api_key_here")

# Zero cold-start streaming inference
response = client.chat.create(
    model="llama-3.3-70b",
    messages=[{"role": "user", "content": "Benchmark cloud matrix multiplication"}],
    stream=True,
    temperature=0.7,
)

for chunk in response:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)`,
    ts: `// npm install @yoyo-ai/sdk
import { Yoyo } from '@yoyo-ai/sdk';

const client = new Yoyo({
  apiKey: 'sk_live_your_api_key_here',
});

const stream = await client.chat.createStream({
  model: 'llama-3.3-70b',
  messages: [{ role: 'user', content: 'Benchmark cloud matrix multiplication' }],
  temperature: 0.7,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`,
    openai: `from openai import OpenAI

# Drop-in OpenAI client override
client = OpenAI(
    base_url="https://api.yoyo.ai/v1",
    api_key="sk_live_your_api_key_here"
)

stream = client.chat.completions.create(
    model="llama-3.3-70b",
    messages=[{"role": "user", "content": "Benchmark cloud matrix multiplication"}],
    stream=True
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)`,
  };

  const faqs = [
    {
      q: 'What models are hosted on YOYO Cloud?',
      a: 'We host leading open-weights models including Llama 3.3 (8B and 70B), DeepSeek R1 (reasoning), Qwen 2.5 Coder (code generation), Nomic Embed Text (embeddings), and BGE Reranker Large (cross-encoder semantic reranking). All models run on dedicated cloud GPU clusters (NVIDIA H100 and A100) optimized for high throughput.',
    },
    {
      q: 'Do I need to manage GPUs or download model weights myself?',
      a: 'No. YOYO provides fully managed cloud API access. We maintain the cloud GPU infrastructure, model weights, Docker containers, and high-speed networking. You simply generate an API key and make standard REST or streaming API calls.',
    },
    {
      q: 'Is it truly a drop-in replacement for OpenAI SDKs?',
      a: 'Yes. You simply change baseURL to https://api.yoyo.ai/v1 and pass your YOYO secret API key (sk_live_...). All official OpenAI SDK methods, LangChain, Cursor, and LlamaIndex integrations work without code modifications.',
    },
    {
      q: 'How does YOYO protect data privacy and compliance?',
      a: 'Unlike commercial closed APIs that may store or train on user interactions, YOYO enforces strict zero data retention (ZDR) for inference traffic. Every response includes the machine-verifiable x-yoyo-zero-data-retention: true audit header. Prompts and completions are processed in volatile GPU VRAM and never stored on disk or used for training.',
    },
    {
      q: 'How does API key security and rate limiting work?',
      a: 'API keys are generated in the sk_live_... format and hashed with SHA-256 before storage. Edge proxies verify keys with Redis sliding-window counters to enforce per-key RPM (requests per minute) and TPM (tokens per minute) rate limits with sub-millisecond overhead.',
    },
  ];

  // Calculated economics
  const proprietaryCost = Math.round(monthlyTokensMillions * 15); // ~$15 per million avg for proprietary APIs
  const yoyoCloudCost = Math.round(monthlyTokensMillions * 2.5); // Open-weights cloud pricing (~$2.50/M)
  const monthlySavings = Math.max(0, proprietaryCost - yoyoCloudCost);

  return (
    <div className="min-h-screen w-full bg-[#07080C] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden">
      {/* Background Precision Engineering Grid */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.14]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Radial Focus Glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[350px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-1/4 w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Announcement Bar */}
      <div className="w-full border-b border-white/[0.06] bg-[#0A0B10]/90 backdrop-blur-md px-4 py-2 text-center text-xs text-zinc-400 z-50">
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Llama 3.3 70B & DeepSeek R1 are now available on dedicated cloud GPUs.</span>
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-0.5 ml-1">
            Get Started <ArrowRight className="w-3 h-3" />
          </Link>
        </span>
      </div>

      {/* Main Header */}
      <header className="w-full border-b border-white/[0.08] bg-[#07080C]/80 backdrop-blur-xl sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <YoyoLogo size={32} showText={true} />
          </Link>
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <a href="#models" className="hover:text-white transition-colors">
              Models
            </a>
            <a href="#architecture" className="hover:text-white transition-colors">
              Infrastructure
            </a>
            <a href="#economics" className="hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
            <Link href="/dashboard/playground" className="hover:text-white transition-colors">
              Playground
            </Link>
            <Link href="/docs" className="hover:text-white transition-colors">
              Documentation
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg border border-white/[0.12] hover:border-white/30 text-xs font-medium text-zinc-300 hover:text-white transition-all bg-white/[0.02]"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-xs tracking-normal transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>Get API Key</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-950" />
          </Link>
        </div>
      </header>

      {/* Full-Screen Cockpit Hero Section */}
      <main className="flex-1 w-full px-4 lg:px-8 py-8 lg:py-14 max-w-[1700px] mx-auto flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Mission Control & Developer Specs */}
          <div className="lg:col-span-6 flex flex-col space-y-6">

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] text-white">
              Cloud AI Model APIs. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                Enterprise GPU Scale.
              </span>
            </h1>

            {/* Engineering Subtitle */}
            <p className="text-zinc-400 text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl font-normal">
              High-throughput OpenAI-compatible API gateway delivering hosted open-weights foundation models (<span className="text-zinc-200 font-semibold">Llama 3.3 70B</span>, <span className="text-zinc-200 font-semibold">DeepSeek R1</span>, <span className="text-zinc-200 font-semibold">Qwen 2.5 Coder</span>) across high-performance cloud GPU clusters. Sub-millisecond gateway routing, live streaming, and transparent token economics.
            </p>

            {/* Platform Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0C0D14]/80">
                <div className="text-xs font-medium text-zinc-400">Gateway Latency</div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-400 mt-1">0.42ms</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Fastify edge routing</div>
              </div>
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0C0D14]/80">
                <div className="text-xs font-medium text-zinc-400">Token Velocity</div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">164 t/s</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Cloud H100 SXM5</div>
              </div>
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0C0D14]/80">
                <div className="text-xs font-medium text-zinc-400">Data Retention</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-1">Zero (ZDR)</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Zero model training</div>
              </div>
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0C0D14]/80">
                <div className="text-xs font-medium text-zinc-400">Starter Tier</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-1">5M Tokens</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Monthly starter quota</div>
              </div>
            </div>

            {/* CTA Group */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href="/register"
                className="px-6 py-3 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-sm transition-all flex items-center gap-2 shadow-sm"
              >
                <span>Get API Key</span>
                <ArrowRight className="w-4 h-4 text-zinc-950" />
              </Link>
              <Link
                href="/dashboard/playground"
                className="px-5 py-3 rounded-xl border border-white/[0.14] hover:bg-white/[0.06] text-sm font-medium text-zinc-200 hover:text-white transition-all bg-white/[0.02] flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                <span>Open Playground</span>
              </Link>
            </div>

            {/* Terminal One-Liner Quickstart */}
            <div className="p-2.5 rounded-xl bg-[#090A0E] border border-white/[0.08] flex items-center justify-between font-mono text-xs text-zinc-400 max-w-xl">
              <div className="flex items-center gap-2 truncate">
                <span className="text-cyan-400 select-none">$</span>
                <span className="text-zinc-200 truncate">curl -s https://api.yoyo.ai/v1/models</span>
              </div>
              <button
                onClick={() => copyToClipboard('curl -s https://api.yoyo.ai/v1/models')}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-colors flex-shrink-0"
                title="Copy command"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Right Column: Live Interactive Developer Console & Stream Visualizer */}
          <div className="lg:col-span-6">
            <div className="rounded-xl border border-white/[0.12] bg-[#0A0B12] shadow-2xl overflow-hidden flex flex-col">
              
              {/* Terminal Window Header Bar */}
              <div className="px-4 py-3 bg-[#0D0F18] border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                  <span className="ml-2 font-mono text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                    POST https://api.yoyo.ai/v1/chat/completions
                  </span>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.06] text-xs font-sans overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('stream')}
                    className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap text-xs ${
                      activeTab === 'stream' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Live Demo
                  </button>
                  <button
                    onClick={() => setActiveTab('python')}
                    className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap text-xs ${
                      activeTab === 'python' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Python SDK
                  </button>
                  <button
                    onClick={() => setActiveTab('ts')}
                    className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap text-xs ${
                      activeTab === 'ts' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    TypeScript
                  </button>
                  <button
                    onClick={() => setActiveTab('openai')}
                    className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap text-xs ${
                      activeTab === 'openai' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    OpenAI SDK
                  </button>
                  <button
                    onClick={() => setActiveTab('curl')}
                    className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap text-xs ${
                      activeTab === 'curl' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    cURL
                  </button>
                </div>
              </div>

              {/* Console Body */}
              <div className="p-4 sm:p-5 text-xs min-h-[360px] flex flex-col justify-between bg-[#08090E]">
                {activeTab === 'stream' ? (
                  <div className="flex flex-col h-full justify-between space-y-4 font-sans">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 text-xs text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-[11px]">Model:</span>
                        <span className="text-cyan-300 font-bold font-mono">llama-3.3-70b</span>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-[11px]">
                        {ttft !== null && (
                          <span>
                            TTFT: <span className="text-emerald-400 font-semibold">{ttft}ms</span>
                          </span>
                        )}
                        {tokenSpeed !== null && (
                          <span>
                            Speed: <span className="text-cyan-400 font-semibold">{tokenSpeed} t/s</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stream Output Text Area */}
                    <div className="flex-1 bg-[#05060A] p-4 rounded-xl border border-white/[0.06] text-zinc-300 overflow-y-auto leading-relaxed h-[220px]">
                      {streamText ? (
                        <div>
                          <p className="whitespace-pre-line text-xs font-mono">{streamText}</p>
                          {isStreaming && <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center space-y-2">
                          <Terminal className="w-8 h-8 opacity-40 text-cyan-500" />
                          <p className="text-xs">Click &quot;Run Live Stream&quot; below to test real-time Server-Sent Events (SSE) token delivery.</p>
                        </div>
                      )}
                    </div>

                    {/* Stream Trigger Controls */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-zinc-500">
                        Protocol: <span className="text-zinc-300 font-medium">Server-Sent Events (SSE)</span>
                      </div>
                      <button
                        onClick={handleRunStream}
                        disabled={isStreaming}
                        className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        {isStreaming ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin text-black" />
                            <span>Streaming Tokens...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-black text-black" />
                            <span>Run Live Stream</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative font-mono">
                    <pre className="text-zinc-300 leading-relaxed overflow-x-auto p-2">
                      <code>{codeSnippets[activeTab]}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(codeSnippets[activeTab])}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-zinc-300 transition-colors"
                      title="Copy code"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Console Footer Meta */}
              <div className="px-4 py-2.5 bg-[#0C0D16] border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-500 font-sans">
                <span>NVIDIA H100 SXM5 & A100 80GB Cloud Pool</span>
                <span>Zero Data Retention</span>
              </div>
            </div>
          </div>

        </div>

        {/* Framework & Tool Ecosystem Strip */}
        <section className="mt-16 py-8 border-y border-white/[0.08] bg-[#0A0B10]/60">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 shrink-0">
              Compatible Frameworks:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 text-sm text-zinc-400 font-medium">
              <span className="hover:text-white transition-colors cursor-default">LangChain</span>
              <span className="hover:text-white transition-colors cursor-default">LlamaIndex</span>
              <span className="hover:text-white transition-colors cursor-default">Vercel AI SDK</span>
              <span className="hover:text-white transition-colors cursor-default">Cursor / Continue</span>
              <span className="hover:text-white transition-colors cursor-default">AutoGen & CrewAI</span>
              <span className="hover:text-white transition-colors cursor-default">OpenAI Python/TS SDK</span>
            </div>
          </div>
        </section>

        {/* Technical Architecture Topology Section */}
        <section id="architecture" className="mt-20 lg:mt-32 pt-6">
          <div className="flex flex-col space-y-3 mb-8">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Cloud Architecture</span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Decoupled Cloud Inference Pipeline
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl font-normal">
              Engineered for production scale: Edge API gateways handle authentication, rate-limiting, and SSE streaming while distributed cloud GPU worker nodes execute models in high-bandwidth memory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0A0B10] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-zinc-500 text-xs mb-3 font-semibold">
                  <span className="font-mono text-cyan-400">01</span>
                  <Terminal className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="font-bold text-white text-base">Client Application</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  OpenAI Python/TS SDKs, LangChain, or direct HTTP calls send requests using standard <code className="text-zinc-200 font-mono">sk_live_...</code> keys.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-xs font-medium text-cyan-400">
                Zero SDK rewriting
              </div>
            </div>

            <div className="p-5 rounded-xl border border-cyan-500/30 bg-[#0C0F1A] flex flex-col justify-between shadow-[0_0_20px_rgba(6,182,212,0.08)]">
              <div>
                <div className="flex items-center justify-between text-cyan-400 text-xs mb-3 font-semibold">
                  <span className="font-mono text-cyan-400">02</span>
                  <Zap className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="font-bold text-white text-base">Fastify Edge Gateway</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  SHA-256 hashed key verification with Redis sliding-window rate limiters. Token usage is estimated pre-execution to prevent context overflows.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-xs font-medium text-cyan-400">
                0.4ms average latency
              </div>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0A0B10] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-zinc-500 text-xs mb-3 font-semibold">
                  <span className="font-mono text-indigo-400">03</span>
                  <Layers className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="font-bold text-white text-base">Dynamic Worker Router</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Health checks query active GPU nodes to identify warm models, routing requests to the worker with the lowest queue depth.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-xs font-medium text-indigo-400">
                Least-connections load balancing
              </div>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0A0B10] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-zinc-500 text-xs mb-3 font-semibold">
                  <span className="font-mono text-emerald-400">04</span>
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="font-bold text-white text-base">Cloud GPU Runtimes</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Persistent Docker volumes store model weights across cloud GPU instances. NVIDIA Container Toolkit passes hardware directly for maximum throughput.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-xs font-medium text-emerald-400">
                H100 / A100 GPU Clusters
              </div>
            </div>
          </div>
        </section>

        {/* Verified Model Sizing Matrix Table */}
        <section id="models" className="mt-20 lg:mt-32 border-t border-white/[0.08] pt-12">
          <div className="flex flex-col space-y-3 mb-8">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Model Catalog</span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Hosted Open-Weights Models & Specifications
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl font-normal">
              Pre-warmed on cloud GPU clusters for sub-second response times and high token throughput.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#0A0B10]">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0D0E16] text-zinc-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Model Identifier</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Parameters</th>
                  <th className="py-3 px-4">Context Window</th>
                  <th className="py-3 px-4">Precision / Quant</th>
                  <th className="py-3 px-4">Cloud Hardware</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-cyan-400 flex items-center gap-2">
                    <span>llama-3.3-70b</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">Flagship</span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400">General LLM</td>
                  <td className="py-3.5 px-4">70 Billion</td>
                  <td className="py-3.5 px-4">128k Tokens</td>
                  <td className="py-3.5 px-4 text-purple-400">Q4_K_M / FP16</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">2x H100 80GB</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">Active</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">llama-3.3-8b</td>
                  <td className="py-3.5 px-4 text-zinc-400">Lightweight LLM</td>
                  <td className="py-3.5 px-4">8.0 Billion</td>
                  <td className="py-3.5 px-4">128k Tokens</td>
                  <td className="py-3.5 px-4 text-purple-400">FP16</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">1x A100 80GB</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">Active</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">qwen-2.5-coder-32b</td>
                  <td className="py-3.5 px-4 text-zinc-400">Coding Specialist</td>
                  <td className="py-3.5 px-4">32.5 Billion</td>
                  <td className="py-3.5 px-4">128k Tokens</td>
                  <td className="py-3.5 px-4 text-purple-400">FP16</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">1x H100 80GB</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">Active</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">deepseek-r1-8b</td>
                  <td className="py-3.5 px-4 text-zinc-400">Chain-of-Thought Reasoning</td>
                  <td className="py-3.5 px-4">8.2 Billion</td>
                  <td className="py-3.5 px-4">64k Tokens</td>
                  <td className="py-3.5 px-4 text-purple-400">FP16</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">1x A100 80GB</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">Active</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">nomic-embed-text</td>
                  <td className="py-3.5 px-4 text-zinc-400">Dense Embeddings</td>
                  <td className="py-3.5 px-4">137 Million</td>
                  <td className="py-3.5 px-4">8k Tokens</td>
                  <td className="py-3.5 px-4 text-purple-400">FP16</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">High-Memory Pool</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">Active</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">bge-reranker-large</td>
                  <td className="py-3.5 px-4 text-zinc-400">Cross-Encoder Reranker</td>
                  <td className="py-3.5 px-4">560 Million</td>
                  <td className="py-3.5 px-4">512 Tokens</td>
                  <td className="py-3.5 px-4 text-purple-400">FP16</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">High-Throughput Pool</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">Active</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Economics & Cost Calculator Section */}
        <section id="economics" className="mt-20 lg:mt-32 border-t border-white/[0.08] pt-12">
          <div className="flex flex-col space-y-3 mb-8">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Token Economics</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Open-Weights Cloud vs Closed API Tolls
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl font-normal leading-relaxed">
              Compare your monthly token costs between commercial closed APIs and running high-performance open-weights models on YOYO Cloud.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-2xl border border-white/[0.08] bg-[#0A0B12] p-6 lg:p-8">
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Target Monthly Consumption</span>
                  <span className="text-cyan-400 font-semibold font-mono text-sm">{monthlyTokensMillions} Million Tokens</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="500"
                  step="5"
                  value={monthlyTokensMillions}
                  onChange={(e) => setMonthlyTokensMillions(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[11px] text-zinc-500 font-medium">
                  <span>5M (Development)</span>
                  <span>100M (Growth)</span>
                  <span>500M+ (Enterprise)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/[0.03]">
                  <div className="text-xs text-red-400 font-medium">Commercial Closed APIs</div>
                  <div className="text-2xl font-bold font-mono text-white mt-2">${proprietaryCost.toLocaleString()}</div>
                  <div className="text-[11px] text-zinc-500 mt-1">Proprietary per-token billing</div>
                </div>
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03]">
                  <div className="text-xs text-emerald-400 font-medium">YOYO Cloud Inference</div>
                  <div className="text-2xl font-bold font-mono text-white mt-2">${yoyoCloudCost.toLocaleString()}</div>
                  <div className="text-[11px] text-zinc-500 mt-1">Open-weights cloud pricing</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-2xl border border-white/[0.08] bg-[#0d101c] flex flex-col justify-between space-y-5">
              <div>
                <span className="text-xs font-semibold text-cyan-400">Estimated Monthly Savings</span>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white mt-2">
                  ${monthlySavings.toLocaleString()} <span className="text-sm font-normal text-zinc-400">/ mo</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed">
                  Reduce token expenditures by up to 80% while retaining full model weights independence, zero training on your data, and dedicated cloud GPU performance.
                </p>
              </div>

              <Link
                href="/register"
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-medium text-xs text-center transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Get API Keys & Start Building</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-950" />
              </Link>
            </div>
          </div>
        </section>

        {/* 1-Line Drop-in Migration Callout */}
        <section id="spec" className="mt-20 lg:mt-32 rounded-2xl border border-white/[0.08] bg-[#0A0B12] p-6 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Drop-in Replacement</span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Migrate in 60 Seconds. Zero Code Rewrite.
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Simply set your <code className="text-cyan-400 bg-white/[0.06] px-1.5 py-0.5 rounded font-mono text-xs">baseURL</code> to <code className="text-zinc-200 bg-white/[0.06] px-1.5 py-0.5 rounded font-mono text-xs">https://api.yoyo.ai/v1</code> and supply your YOYO secret API key. All OpenAI SDK parameters (temperature, max_tokens, stop sequences, streaming) work natively.
            </p>
          </div>

          <div className="w-full lg:w-auto font-mono text-xs bg-[#05060A] p-5 rounded-xl border border-white/[0.08] text-zinc-300">
            <div className="text-zinc-500 mb-2 font-sans font-medium text-xs">TypeScript / JavaScript SDK Configuration</div>
            <div className="text-red-400/80 line-through">- baseURL: &apos;https://api.openai.com/v1&apos;</div>
            <div className="text-emerald-400 font-semibold">+ baseURL: &apos;https://api.yoyo.ai/v1&apos;</div>
            <div className="text-zinc-500 mt-3 mb-1 font-sans font-medium text-xs">Authorization</div>
            <div className="text-cyan-300 font-semibold">+ apiKey: &apos;sk_live_your_yoyo_key&apos;</div>
          </div>
        </section>

        {/* Developer FAQ Section */}
        <section id="faq" className="mt-20 lg:mt-32 border-t border-white/[0.08] pt-12">
          <div className="flex flex-col space-y-3 mb-8">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Technical FAQ</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Frequently Answered Questions
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl font-normal">
              Common architectural and operational questions about integrating with YOYO Cloud in production.
            </p>
          </div>

          <div className="space-y-3 max-w-4xl">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-white/[0.08] bg-[#0A0B10] overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between text-sm font-semibold text-zinc-200 hover:text-white transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-cyan-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-zinc-400 leading-relaxed border-t border-white/[0.04]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* Production Multi-Column Developer Footer */}
      <footer className="w-full border-t border-white/[0.08] bg-[#05060A] mt-24">
        {/* Upper Link Columns */}
        <div className="max-w-[1700px] mx-auto px-4 lg:px-8 py-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 text-xs">
          
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <YoyoLogo size={28} showText={true} />
            </div>
            <p className="text-zinc-500 text-xs font-sans max-w-sm leading-relaxed">
              Cloud AI model API platform. Host and serve open-weights LLMs across cloud GPU infrastructure with OpenAI drop-in endpoints, sub-millisecond Fastify edge routing, and multi-tenant key management.
            </p>
            <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
              <span>Global Cloud Inference Network</span>
            </div>
          </div>

          {/* Col 1: Platform */}
          <div className="space-y-3">
            <div className="text-zinc-200 font-semibold text-xs">Platform</div>
            <ul className="space-y-2.5 text-zinc-400">
              <li>
                <Link href="/dashboard/models" className="hover:text-cyan-400 transition-colors">
                  Cloud Model Catalog
                </Link>
              </li>
              <li>
                <Link href="/dashboard/playground" className="hover:text-cyan-400 transition-colors">
                  Interactive Playground
                </Link>
              </li>
              <li>
                <Link href="/dashboard/keys" className="hover:text-cyan-400 transition-colors">
                  API Key Manager
                </Link>
              </li>
              <li>
                <Link href="/dashboard/analytics" className="hover:text-cyan-400 transition-colors">
                  Usage & Analytics
                </Link>
              </li>
              <li>
                <Link href="/dashboard/admin" className="hover:text-cyan-400 transition-colors">
                  Cluster Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Developers */}
          <div className="space-y-3">
            <div className="text-zinc-200 font-semibold text-xs">Developers</div>
            <ul className="space-y-2.5 text-zinc-400">
              <li>
                <a href="#spec" className="hover:text-cyan-400 transition-colors">
                  OpenAI API Spec
                </a>
              </li>
              <li>
                <Link href="/dashboard/playground" className="hover:text-cyan-400 transition-colors">
                  Python SDK Client
                </Link>
              </li>
              <li>
                <Link href="/dashboard/playground" className="hover:text-cyan-400 transition-colors">
                  TypeScript SDK
                </Link>
              </li>
              <li>
                <a href="#architecture" className="hover:text-cyan-400 transition-colors">
                  Cloud Architecture
                </a>
              </li>
              <li>
                <a href="#economics" className="hover:text-cyan-400 transition-colors">
                  TCO Calculator
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Infrastructure */}
          <div className="space-y-3">
            <div className="text-zinc-200 font-semibold text-xs">Infrastructure</div>
            <ul className="space-y-2.5 text-zinc-400">
              <li className="text-zinc-500">Fastify Edge Gateway</li>
              <li className="text-zinc-500">NVIDIA H100 SXM5</li>
              <li className="text-zinc-500">NVIDIA A100 80GB</li>
              <li className="text-zinc-500">Redis 7 Token Buckets</li>
              <li className="text-zinc-500">PostgreSQL 16 Storage</li>
            </ul>
          </div>

        </div>

        {/* Lower Legal & Status Bar */}
        <div className="border-t border-white/[0.08] px-4 lg:px-8 py-6">
          <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <div>
              &copy; {new Date().getFullYear()} YOYO AI Platform. Enterprise Cloud Inference.
            </div>
            <div className="flex items-center gap-6">
              <Link href="/docs" className="hover:text-cyan-400 transition-colors">
                Documentation
              </Link>
              <span>&bull;</span>
              <Link href="/status" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>System Status</span>
              </Link>
              <span>&bull;</span>
              <Link href="/terms" className="hover:text-cyan-400 transition-colors">
                Terms of Service
              </Link>
              <span>&bull;</span>
              <Link href="/privacy" className="hover:text-cyan-400 transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
