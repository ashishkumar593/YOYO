import Link from 'next/link';
import {
  Cpu,
  Terminal,
  ShieldCheck,
  Zap,
  ArrowRight,
  Server,
  Key,
  BarChart3,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground relative selection:bg-primary/30">
      {/* Ambient background glow orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute top-[10%] right-[10%] w-[350px] h-[300px] bg-indigo-500/15 rounded-full blur-[100px]" />
      </div>

      {/* Top Header */}
      <header className="border-b border-border/60 backdrop-blur-xl sticky top-0 z-50 bg-background/80 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full transition-all">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-blue-500/25">
            Y
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight leading-none">YOYO</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wider">
                Ultra Pro
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">Self-Hosted Inference Engine</span>
          </div>
        </div>

        <nav className="flex items-center space-x-6 text-sm font-medium">
          <a href="#models" className="text-muted-foreground hover:text-foreground transition-colors hidden md:inline-block">
            Models
          </a>
          <a href="#benchmarks" className="text-muted-foreground hover:text-foreground transition-colors hidden md:inline-block">
            Economics
          </a>
          <a href="#architecture" className="text-muted-foreground hover:text-foreground transition-colors hidden md:inline-block">
            Architecture
          </a>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 text-xs tracking-wide uppercase"
          >
            Get Free API Key
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 pt-24 pb-20 flex flex-col items-center text-center">
        {/* Pulsing Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-card/80 border border-border/80 text-xs text-muted-foreground mb-8 backdrop-blur-md shadow-inner">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-foreground">OpenAI Drop-In Compatible</span>
          <span className="text-muted-foreground/60">•</span>
          <span>Fastify Gateway & Ollama GPU Workers</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight max-w-5xl leading-[1.08]">
          Enterprise AI Inference <br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            On Your Infrastructure
          </span>
        </h1>

        <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed font-normal">
          Deploy, route, and consume open-weights foundation models (<span className="text-foreground font-semibold">Llama 3.3 70B</span>, <span className="text-foreground font-semibold">Qwen 2.5 Coder</span>, <span className="text-foreground font-semibold">DeepSeek R1</span>) with sub-millisecond gateway latency, dedicated GPU pools, and 100% data residency.
        </p>

        {/* Action Buttons */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center space-x-2 shadow-xl shadow-blue-500/25 text-sm transform hover:-translate-y-0.5"
          >
            <span>Start Free (5M Monthly Tokens)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:bg-muted/50 transition-all font-semibold text-foreground text-sm shadow-sm"
          >
            Live Console
          </Link>
        </div>

        {/* Stats Row */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl text-center">
          <div className="p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm">
            <span className="text-3xl font-extrabold text-foreground font-mono">&lt; 18ms</span>
            <span className="text-xs text-muted-foreground block mt-1">Gateway Overhead</span>
          </div>
          <div className="p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">100%</span>
            <span className="text-xs text-muted-foreground block mt-1">OpenAI SDK Parity</span>
          </div>
          <div className="p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm">
            <span className="text-3xl font-extrabold text-primary font-mono">~85%</span>
            <span className="text-xs text-muted-foreground block mt-1">Cost Reduction</span>
          </div>
          <div className="p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm">
            <span className="text-3xl font-extrabold text-indigo-400 font-mono">0 Log</span>
            <span className="text-xs text-muted-foreground block mt-1">Cloud Data Privacy</span>
          </div>
        </div>

        {/* Drop-in OpenAI Code Snippet */}
        <div className="mt-20 w-full max-w-3xl text-left rounded-2xl bg-card/80 border border-border shadow-2xl backdrop-blur-xl overflow-hidden font-mono text-xs">
          <div className="bg-muted/60 px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-muted-foreground ml-2 text-[11px]">quickstart-openai.py</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              100% Drop-in Compatible
            </span>
          </div>
          <div className="p-6 text-muted-foreground space-y-1.5 overflow-x-auto leading-relaxed">
            <p><span className="text-purple-400">from</span> openai <span className="text-purple-400">import</span> OpenAI</p>
            <p className="pt-2">client = OpenAI(</p>
            <p className="pl-4">base_url=<span className="text-emerald-300">&quot;http://localhost:4000/v1&quot;</span>,</p>
            <p className="pl-4">api_key=<span className="text-emerald-300">&quot;sk_live_a7f9c2d1_...&quot;</span></p>
            <p>)</p>
            <p className="pt-2">response = client.chat.completions.create(</p>
            <p className="pl-4">model=<span className="text-cyan-300">&quot;llama3.3:8b&quot;</span>,</p>
            <p className="pl-4">messages=[{'{'}&quot;role&quot;: &quot;user&quot;, &quot;content&quot;: &quot;Explain quantum computing in 2 sentences.&quot;{'}'}],</p>
            <p className="pl-4">stream=<span className="text-amber-400">True</span></p>
            <p>)</p>
            <p className="pt-2"><span className="text-purple-400">for</span> chunk <span className="text-purple-400">in</span> response:</p>
            <p className="pl-4">print(chunk.choices[0].delta.content <span className="text-purple-400">or</span> <span className="text-emerald-300">&quot;&quot;</span>, end=<span className="text-emerald-300">&quot;&quot;</span>, flush=<span className="text-amber-400">True</span>)</p>
          </div>
        </div>

        {/* Feature Grid */}
        <div id="features" className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-8 rounded-3xl bg-card/60 border border-border/80 glass-panel-hover flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-foreground">Fastify Gateway</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Asynchronous Fastify routing layer with in-memory Redis token bucket rate limiters and SHA-256 key digests delivering sub-millisecond dispatch.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/40 flex items-center space-x-2 text-xs font-mono text-blue-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>&lt; 1ms Authentication</span>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-card/60 border border-border/80 glass-panel-hover flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-foreground">Ollama GPU Workers</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Dedicated containerized inference nodes with NVIDIA Container Toolkit passthrough, content-addressable layer caching, and dynamic model swapping.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/40 flex items-center space-x-2 text-xs font-mono text-indigo-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Multi-Worker Fleet</span>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-card/60 border border-border/80 glass-panel-hover flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-foreground">Zero Cloud Lock-in</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Your data stays exclusively inside your Docker networks. Zero telemetry sent to external vendors, proprietary clouds, or public endpoints.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/40 flex items-center space-x-2 text-xs font-mono text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Data Sovereignty</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10 px-6 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-foreground">YOYO</span>
            <span>— Production-Grade AI Model API Platform</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/dashboard/playground" className="hover:text-foreground transition-colors">Playground</Link>
            <Link href="/dashboard/models" className="hover:text-foreground transition-colors">Model Catalog</Link>
            <Link href="/dashboard/billing" className="hover:text-foreground transition-colors">Pricing</Link>
            <a href="http://localhost:4000/v1/health" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">System Health</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
