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

  // Simulated live terminal stream
  const sampleStreamResponse =
    "YOYO Cloud Gateway online. Routing request to cluster-us-east-01 (NVIDIA H100 SXM5 / CUDA 13). Llama-3.3-70B resident in high-bandwidth memory. TTFT initialized in 18ms. Processing prompt: 'Analyze distributed memory coherence in cloud-hosted multi-GPU inference clusters.'\n\nOptimal throughput is achieved by decoupling the Fastify edge proxy from the inference workers using non-blocking SSE streaming and zero-copy JSON chunk serialization.";

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
      a: 'We host leading open-weights models including Llama 3.3 (8B and 70B), DeepSeek R1 (reasoning model), Qwen 2.5 Coder (code generation), and Nomic Embed Text. All models run on dedicated cloud GPU clusters (NVIDIA H100 and A100) optimized for high throughput.',
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
      a: 'Unlike commercial closed APIs that may store or train on user interactions, YOYO enforces strict zero data retention (ZDR) for inference traffic. Your prompts and completion payloads are never logged or stored for model training.',
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

      {/* Top Global Cloud Telemetry Bar */}
      <div className="w-full border-b border-white/[0.08] bg-[#0A0B10]/90 backdrop-blur-md px-4 lg:px-8 py-1.5 flex items-center justify-between text-[11px] font-mono text-zinc-400 z-50">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            GLOBAL CLOUD CLUSTER: ONLINE
          </span>
          <span className="text-zinc-600">|</span>
          <span className="hidden sm:inline-block text-zinc-400">
            REGIONS: <span className="text-zinc-200">US-EAST // EU-WEST // AP-SOUTH</span>
          </span>
          <span className="hidden md:inline-block text-zinc-600">|</span>
          <span className="hidden md:inline-block text-zinc-400">
            HARDWARE: <span className="text-cyan-400">NVIDIA H100 SXM5 & A100 80GB</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-400">EDGE RTT: <span className="text-emerald-400 font-bold">0.42ms</span></span>
          <span className="text-zinc-600 hidden sm:inline-block">|</span>
          <span className="text-zinc-400 hidden sm:inline-block">GLOBAL SLA: <span className="text-zinc-200">99.99%</span></span>
        </div>
      </div>

      {/* Main Full-Width Header */}
      <header className="w-full border-b border-white/[0.08] bg-[#07080C]/80 backdrop-blur-xl sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <YoyoLogo size={32} showText={true} />
          </Link>
          <nav className="hidden lg:flex items-center gap-6 text-xs font-mono tracking-wider text-zinc-400 uppercase">
            <a href="#models" className="hover:text-cyan-400 transition-colors">
              // Models
            </a>
            <a href="#architecture" className="hover:text-cyan-400 transition-colors">
              // Cloud Infrastructure
            </a>
            <a href="#economics" className="hover:text-cyan-400 transition-colors">
              // Economics
            </a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">
              // FAQ
            </a>
            <Link href="/dashboard/playground" className="hover:text-cyan-400 transition-colors">
              // Playground
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded border border-white/[0.12] hover:border-white/30 text-xs font-mono text-zinc-300 hover:text-white transition-all bg-white/[0.02]"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-1.5 rounded bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.35)] flex items-center gap-1.5"
          >
            <span>Get Cloud API Key</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
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

            {/* Hardware Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="p-3 rounded border border-white/[0.08] bg-[#0C0D14]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Gateway Latency</div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-cyan-400 mt-1">0.42ms</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Fastify edge routing</div>
              </div>
              <div className="p-3 rounded border border-white/[0.08] bg-[#0C0D14]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Token Velocity</div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 mt-1">164 t/s</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Cloud H100 SXM5</div>
              </div>
              <div className="p-3 rounded border border-white/[0.08] bg-[#0C0D14]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Data Retention</div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-purple-400 mt-1">Zero (ZDR)</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Zero model training</div>
              </div>
              <div className="p-3 rounded border border-white/[0.08] bg-[#0C0D14]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Developer Tier</div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-amber-400 mt-1">5M Free</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Monthly starter quota</div>
              </div>
            </div>

            {/* CTA Group */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href="/register"
                className="px-6 py-3 rounded bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                <span>Get Cloud API Key</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </Link>
              <Link
                href="/dashboard/playground"
                className="px-5 py-3 rounded border border-white/[0.14] hover:border-white/30 text-xs font-mono text-zinc-200 hover:text-white transition-all bg-white/[0.03] flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                <span>Open Cloud Playground</span>
              </Link>
            </div>

            {/* Terminal One-Liner Quickstart */}
            <div className="p-2.5 rounded bg-[#090A0E] border border-white/[0.08] flex items-center justify-between font-mono text-xs text-zinc-400 max-w-xl">
              <div className="flex items-center gap-2 truncate">
                <span className="text-cyan-400 select-none">$</span>
                <span className="text-zinc-200 truncate">curl -s https://api.yoyo.ai/v1/models</span>
              </div>
              <button
                onClick={() => copyToClipboard('curl -s https://api.yoyo.ai/v1/models')}
                className="p-1.5 rounded hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-colors flex-shrink-0"
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
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded border border-white/[0.06] text-[11px] font-mono overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('stream')}
                    className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                      activeTab === 'stream' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Live Demo
                  </button>
                  <button
                    onClick={() => setActiveTab('python')}
                    className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                      activeTab === 'python' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Python SDK
                  </button>
                  <button
                    onClick={() => setActiveTab('ts')}
                    className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                      activeTab === 'ts' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    TypeScript SDK
                  </button>
                  <button
                    onClick={() => setActiveTab('openai')}
                    className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                      activeTab === 'openai' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    OpenAI SDK
                  </button>
                  <button
                    onClick={() => setActiveTab('curl')}
                    className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                      activeTab === 'curl' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    cURL
                  </button>
                </div>
              </div>

              {/* Console Body */}
              <div className="p-4 sm:p-5 font-mono text-xs min-h-[360px] flex flex-col justify-between bg-[#08090E]">
                {activeTab === 'stream' ? (
                  <div className="flex flex-col h-full justify-between space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">TARGET MODEL:</span>
                        <span className="text-cyan-300 font-bold">llama-3.3-70b</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {ttft !== null && (
                          <span>
                            TTFT: <span className="text-emerald-400 font-bold">{ttft}ms</span>
                          </span>
                        )}
                        {tokenSpeed !== null && (
                          <span>
                            SPEED: <span className="text-cyan-400 font-bold">{tokenSpeed} t/s</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stream Output Text Area */}
                    <div className="flex-1 bg-[#05060A] p-3.5 rounded border border-white/[0.06] text-zinc-300 overflow-y-auto leading-relaxed h-[220px]">
                      {streamText ? (
                        <div>
                          <span>{streamText}</span>
                          {isStreaming && <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center space-y-2">
                          <Terminal className="w-8 h-8 opacity-40 text-cyan-500" />
                          <p>Click &apos;Trigger Cloud Inference&apos; below to simulate real-time SSE token delivery from cluster-us-east-01.</p>
                        </div>
                      )}
                    </div>

                    {/* Stream Trigger Controls */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-[10px] text-zinc-500">
                        PROTOCOL: <span className="text-zinc-300">Server-Sent Events (SSE) Streaming</span>
                      </div>
                      <button
                        onClick={handleRunStream}
                        disabled={isStreaming}
                        className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                      >
                        {isStreaming ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin text-black" />
                            <span>Streaming Tokens...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-black text-black" />
                            <span>Trigger Cloud Inference</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <pre className="text-zinc-300 leading-relaxed overflow-x-auto p-2">
                      <code>{codeSnippets[activeTab]}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(codeSnippets[activeTab])}
                      className="absolute top-2 right-2 p-1.5 rounded bg-white/[0.08] hover:bg-white/[0.14] text-zinc-300 transition-colors"
                      title="Copy code"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Console Footer Meta */}
              <div className="px-4 py-2 bg-[#0C0D16] border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>INFRASTRUCTURE: CLOUD DEDICATED GPU NODES</span>
                <span>SECURITY: SHA-256 PREFIX INDEXED AUTH</span>
              </div>
            </div>
          </div>

        </div>

        {/* Framework & Tool Ecosystem Strip */}
        <section className="mt-16 py-8 border-y border-white/[0.08] bg-[#0A0B10]/60">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-semibold shrink-0">
              FIRST-CLASS ECOSYSTEM COMPATIBILITY:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 text-sm font-mono text-zinc-400 font-medium">
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
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">// CLOUD ARCHITECTURE</span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Decoupled Cloud Inference Pipeline
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl font-normal">
              Engineered for production scale: Edge API gateways handle authentication, rate-limiting, and SSE streaming while distributed cloud GPU worker nodes execute models in high-bandwidth memory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-lg border border-white/[0.08] bg-[#0A0B10] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-zinc-500 font-mono text-xs mb-3">
                  <span>STAGE 01</span>
                  <Terminal className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="font-bold text-white text-base">Client Application</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  OpenAI Python/TS SDKs, LangChain, or direct HTTP calls send requests using standard <code className="text-zinc-200">sk_live_...</code> keys.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-cyan-400">
                Zero SDK rewriting
              </div>
            </div>

            <div className="p-5 rounded-lg border border-cyan-500/30 bg-[#0C0F1A] flex flex-col justify-between shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <div>
                <div className="flex items-center justify-between text-cyan-400 font-mono text-xs mb-3">
                  <span>STAGE 02</span>
                  <Zap className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="font-bold text-white text-base">Fastify Edge Gateway</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  SHA-256 hashed key verification with Redis sliding-window rate limiters. Token usage is estimated pre-execution to prevent context overflows.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-cyan-400">
                0.4ms average latency
              </div>
            </div>

            <div className="p-5 rounded-lg border border-white/[0.08] bg-[#0A0B10] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-zinc-500 font-mono text-xs mb-3">
                  <span>STAGE 03</span>
                  <Layers className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="font-bold text-white text-base">Dynamic Worker Router</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Health checks query active GPU nodes to identify warm models, routing requests to the worker with the lowest queue depth.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-indigo-400">
                Least-connections load balancing
              </div>
            </div>

            <div className="p-5 rounded-lg border border-white/[0.08] bg-[#0A0B10] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-zinc-500 font-mono text-xs mb-3">
                  <span>STAGE 04</span>
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="font-bold text-white text-base">Cloud GPU Runtimes</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Persistent Docker volumes store model weights across cloud GPU instances. NVIDIA Container Toolkit passes hardware directly for maximum throughput.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-emerald-400">
                H100 / A100 GPU Clusters
              </div>
            </div>
          </div>
        </section>

        {/* Verified Model Sizing Matrix Table */}
        <section id="models" className="mt-20 lg:mt-32 border-t border-white/[0.08] pt-12">
          <div className="flex flex-col space-y-3 mb-8">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">// CLOUD MODEL CATALOG</span>
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
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">READY // ONLINE</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">llama-3.3-8b</td>
                  <td className="py-3.5 px-4 text-zinc-400">Lightweight LLM</td>
                  <td className="py-3.5 px-4">8.0 Billion</td>
                  <td className="py-3.5 px-4">128k Tokens</td>
                  <td className="py-3.5 px-4 text-purple-400">FP16</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">1x A100 80GB</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">READY // ONLINE</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">qwen-2.5-coder-32b</td>
                  <td className="py-3.5 px-4 text-zinc-400">Coding Specialist</td>
                  <td className="py-3.5 px-4">32.5 Billion</td>
                  <td className="py-3.5 px-4">128k Tokens</td>
                  <td className="py-3.5 px-4 text-purple-400">FP16</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">1x H100 80GB</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">READY // ONLINE</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">deepseek-r1-8b</td>
                  <td className="py-3.5 px-4 text-zinc-400">Chain-of-Thought Reasoning</td>
                  <td className="py-3.5 px-4">8.2 Billion</td>
                  <td className="py-3.5 px-4">64k Tokens</td>
                  <td className="py-3.5 px-4 text-purple-400">FP16</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">1x A100 80GB</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">READY // ONLINE</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">nomic-embed-text</td>
                  <td className="py-3.5 px-4 text-zinc-400">Dense Embeddings</td>
                  <td className="py-3.5 px-4">137 Million</td>
                  <td className="py-3.5 px-4">8k Tokens</td>
                  <td className="py-3.5 px-4 text-purple-400">FP16</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">High-Memory Pool</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">READY // ONLINE</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Economics & Cost Calculator Section */}
        <section id="economics" className="mt-20 lg:mt-32 border-t border-white/[0.08] pt-12">
          <div className="flex flex-col space-y-3 mb-8">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">// TOKEN ECONOMICS</span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Open-Weights Cloud vs Closed API Tolls
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl font-normal">
              Compare your monthly token costs between commercial closed APIs and running high-performance open-weights models on YOYO Cloud.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-xl border border-white/[0.12] bg-[#0A0B12] p-6 lg:p-8">
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-zinc-400 uppercase">Monthly Consumption Target</span>
                  <span className="text-cyan-400 font-bold text-sm">{monthlyTokensMillions} Million Tokens</span>
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
                <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                  <span>5M (Dev)</span>
                  <span>100M (Growth)</span>
                  <span>500M+ (Enterprise)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded border border-red-500/20 bg-red-500/[0.04]">
                  <div className="text-[11px] font-mono text-red-400 uppercase font-semibold">Commercial Closed APIs</div>
                  <div className="text-2xl font-bold font-mono text-white mt-2">${proprietaryCost.toLocaleString()}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-1">Proprietary per-token pricing</div>
                </div>
                <div className="p-4 rounded border border-emerald-500/20 bg-emerald-500/[0.04]">
                  <div className="text-[11px] font-mono text-emerald-400 uppercase font-semibold">YOYO Cloud Inference</div>
                  <div className="text-2xl font-bold font-mono text-white mt-2">${yoyoCloudCost.toLocaleString()}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-1">Open-weights cloud pricing</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-lg border border-cyan-500/30 bg-[#080E1C] flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest font-bold">Estimated Monthly Savings</span>
                <div className="text-3xl sm:text-4xl font-black font-mono text-cyan-400 mt-2">
                  ${monthlySavings.toLocaleString()} / mo
                </div>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Reduce token expenditures by up to 80% while retaining full model weights independence, zero training on your data, and dedicated cloud GPU performance.
                </p>
              </div>

              <Link
                href="/register"
                className="w-full py-2.5 rounded bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                <span>Deploy with Cloud API Key</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </Link>
            </div>
          </div>
        </section>

        {/* 1-Line Drop-in Migration Callout */}
        <section id="spec" className="mt-20 lg:mt-32 rounded-xl border border-white/[0.12] bg-[#0A0B12] p-6 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">// DROP-IN REPLACEMENT</span>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Migrate in 60 Seconds. No Code Rewrite.
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Simply change your <code className="text-cyan-400 bg-white/[0.06] px-1.5 py-0.5 rounded font-mono">baseURL</code> to <code className="text-white bg-white/[0.06] px-1.5 py-0.5 rounded font-mono">https://api.yoyo.ai/v1</code> and insert your YOYO secret API key. All OpenAI SDK parameters (temperature, max_tokens, stop sequences, streaming) work natively.
            </p>
          </div>

          <div className="w-full lg:w-auto font-mono text-xs bg-[#05060A] p-4 rounded-lg border border-white/[0.08] text-zinc-300">
            <div className="text-zinc-500 mb-2">// TypeScript / JavaScript SDK Migration</div>
            <div className="text-red-400 line-through opacity-70">- baseURL: &apos;https://api.openai.com/v1&apos;</div>
            <div className="text-emerald-400 font-bold">+ baseURL: &apos;https://api.yoyo.ai/v1&apos;</div>
            <div className="text-zinc-400 mt-2">// Authorization</div>
            <div className="text-cyan-300 font-bold">+ apiKey: &apos;sk_live_your_yoyo_key&apos;</div>
          </div>
        </section>

        {/* Developer FAQ Section */}
        <section id="faq" className="mt-20 lg:mt-32 border-t border-white/[0.08] pt-12">
          <div className="flex flex-col space-y-3 mb-8">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">// TECHNICAL FAQ</span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
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
        <div className="max-w-[1700px] mx-auto px-4 lg:px-8 py-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 text-xs font-mono">
          
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <YoyoLogo size={28} showText={true} />
            </div>
            <p className="text-zinc-500 text-xs font-sans max-w-sm leading-relaxed">
              Cloud AI model API platform. Host and serve open-weights LLMs across cloud GPU infrastructure with OpenAI drop-in endpoints, sub-millisecond Fastify edge routing, and multi-tenant key management.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>All Cloud Gateways Operational (0.42ms RTT)</span>
            </div>
          </div>

          {/* Col 1: Platform */}
          <div className="space-y-3">
            <div className="text-white font-bold tracking-wider uppercase text-[11px]">Platform</div>
            <ul className="space-y-2 text-zinc-400">
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
            <div className="text-white font-bold tracking-wider uppercase text-[11px]">Developers</div>
            <ul className="space-y-2 text-zinc-400">
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
                  Cloud Architecture Docs
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
            <div className="text-white font-bold tracking-wider uppercase text-[11px]">Cloud GPU Pools</div>
            <ul className="space-y-2 text-zinc-400">
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
          <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-mono text-zinc-500">
            <div>
              &copy; {new Date().getFullYear()} YOYO AI Platform. Enterprise Cloud Inference.
            </div>
            <div className="flex items-center gap-6">
              <Link href="/docs" className="hover:text-cyan-400 transition-colors">
                Documentation
              </Link>
              <span>&bull;</span>
              <Link href="/status" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>System Status</span>
              </Link>
              <span>&bull;</span>
              <Link href="/terms" className="hover:text-cyan-400 transition-colors">
                Terms of Service
              </Link>
              <span>&bull;</span>
              <Link href="/privacy" className="hover:text-cyan-400 transition-colors">
                Zero Data Retention Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
