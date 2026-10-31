import Link from 'next/link';
import { Cpu, Terminal, ShieldCheck, Zap, ArrowRight, Server, Key, BarChart3, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="border-b border-border/60 backdrop-blur-md sticky top-0 z-50 bg-background/80 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-foreground text-lg shadow-lg shadow-primary/20">
            Y
          </div>
          <span className="font-bold text-xl tracking-tight">YOYO</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
            AI Platform
          </span>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <a href="#models" className="text-muted-foreground hover:text-foreground transition-colors">Models</a>
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Architecture</a>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 text-xs tracking-wide uppercase"
          >
            Get API Key
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-muted/60 border border-border text-xs text-muted-foreground mb-8">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>OpenAI-Compatible Drop-In API & Self-Hosted GPU Workers</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight">
          Production AI Model API <br />
          <span className="bg-gradient-to-r from-blue-400 via-primary to-indigo-400 bg-clip-text text-transparent">
            On Your Own Infrastructure
          </span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Host, scale, and access open-source foundation models (Llama 3.3, Qwen 2.5, DeepSeek R1) with sub-millisecond gateway routing, dedicated GPU workers, and zero cloud lock-in.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all flex items-center space-x-2 shadow-lg shadow-primary/25 text-sm"
          >
            <span>Start Free (5M Monthly Tokens)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="px-6 py-3.5 rounded-xl bg-card border border-border hover:bg-muted/50 transition-all font-medium text-foreground text-sm"
          >
            Open Developer Console
          </Link>
        </div>

        {/* Drop-in OpenAI Code Snippet */}
        <div className="mt-16 w-full max-w-2xl text-left rounded-2xl bg-card border border-border/80 shadow-2xl overflow-hidden font-mono text-xs">
          <div className="bg-muted/60 px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-muted-foreground">python-openai-sdk.py</span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">100% Drop-In Compatible</span>
          </div>
          <div className="p-5 text-muted-foreground space-y-1 overflow-x-auto">
            <p><span className="text-purple-400">from</span> openai <span className="text-purple-400">import</span> OpenAI</p>
            <p className="pt-2">client = OpenAI(</p>
            <p className="pl-4">base_url=<span className="text-emerald-300">&quot;http://localhost:4000/v1&quot;</span>,</p>
            <p className="pl-4">api_key=<span className="text-emerald-300">&quot;sk_live_a7f9c2d1_...&quot;</span></p>
            <p>)</p>
            <p className="pt-2">response = client.chat.completions.create(</p>
            <p className="pl-4">model=<span className="text-emerald-300">&quot;llama3.3:8b&quot;</span>,</p>
            <p className="pl-4">messages=[{'{'}&quot;role&quot;: &quot;user&quot;, &quot;content&quot;: &quot;Hello YOYO!&quot;{'}'}],</p>
            <p className="pl-4">stream=<span className="text-amber-400">True</span></p>
            <p>)</p>
          </div>
        </div>

        {/* Feature Grid */}
        <div id="features" className="mt-28 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 rounded-2xl bg-card border border-border/60 hover:border-border transition-all">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg">Fastify Sub-ms Gateway</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Ultra-low latency dispatch with in-memory Redis sliding-window token bucket limiters and SHA-256 API key digests.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border/60 hover:border-border transition-all">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg">Ollama GPU Workers</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Containerized inference fleet with NVIDIA Container Toolkit passthrough, content-addressable layer caching, and dynamic model swapping.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border/60 hover:border-border transition-all">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg">OpenAI Parity</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Native support for <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/v1/chat/completions</code> (JSON & SSE streaming) and <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/v1/embeddings</code>.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-6 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} YOYO AI Model API Platform. Self-Hosted & Production Ready.</p>
      </footer>
    </div>
  );
}

