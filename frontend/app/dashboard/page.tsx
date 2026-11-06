'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Activity,
  Cpu,
  Key,
  BarChart3,
  ArrowUpRight,
  Terminal,
  Zap,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Play,
  Layers,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [modelsCount, setModelsCount] = useState(6);
  const [loading, setLoading] = useState(true);
  const [copiedQuickCurl, setCopiedQuickCurl] = useState(false);
  const [activeTabCode, setActiveTabCode] = useState<'curl' | 'python' | 'ts'>('curl');

  useEffect(() => {
    async function loadData() {
      try {
        const [sumData, reqsData, catalogData] = await Promise.all([
          apiRequest('/api/usage/summary').catch(() => null),
          apiRequest('/api/usage/requests?limit=10').catch(() => []),
          apiRequest('/api/models/catalog').catch(() => []),
        ]);
        setSummary(sumData);
        setRecentRequests(reqsData || []);
        if (catalogData && catalogData.length) {
          setModelsCount(catalogData.length);
        }
      } catch (err) {
        console.error('Error loading dashboard overview:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalTokens = summary?.quota?.currentMonthTokensUsed || 0;
  const tokenLimit = summary?.quota?.monthlyTokenLimit || 5000000;
  const quotaPercent = Math.min(100, Math.round((totalTokens / tokenLimit) * 100));

  const quickCurlSnippet = `curl https://api.yoyo.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_live_your_api_key_here" \\
  -d '{
    "model": "llama-3.3-70b",
    "messages": [{"role": "user", "content": "Benchmark low-latency inference"}],
    "stream": true
  }'`;

  const quickPythonSnippet = `from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_api_key_here")
stream = client.chat.create(
    model="llama-3.3-70b",
    messages=[{"role": "user", "content": "Benchmark low-latency inference"}],
    stream=True
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)`;

  const quickTsSnippet = `import { Yoyo } from '@yoyo-ai/sdk';

const client = new Yoyo({ apiKey: 'sk_live_your_api_key_here' });
const stream = await client.chat.createStream({
  model: 'llama-3.3-70b',
  messages: [{ role: 'user', content: 'Benchmark low-latency inference' }]
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`;

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuickCurl(true);
    setTimeout(() => setCopiedQuickCurl(false), 2000);
  };

  const getActiveCode = () => {
    if (activeTabCode === 'python') return quickPythonSnippet;
    if (activeTabCode === 'ts') return quickTsSnippet;
    return quickCurlSnippet;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Platform Overview</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Active Cluster
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Gateway: <span className="text-zinc-300">api.yoyo.ai</span> • Architecture: <span className="text-zinc-300">vLLM + NVIDIA H100 SXM5</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard/keys"
            className="px-4 py-2 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold flex items-center space-x-1.5 transition-all text-foreground"
          >
            <Key className="w-3.5 h-3.5 text-primary" />
            <span>Generate Key</span>
          </Link>
          <Link
            href="/dashboard/playground"
            className="px-4 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-950" />
            <span>Open Playground</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card/80 border border-border/80 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Total Invocations</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight font-mono text-white">
              {formatNumber(summary?.totalRequests || 0)}
            </span>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center space-x-1 font-mono">
              <span className="text-emerald-400 font-semibold">+{summary?.requestsToday || 0}</span>
              <span>calls today</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card/80 border border-border/80 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Tokens Consumed</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight font-mono text-white">
              {formatNumber(totalTokens)}
            </span>
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">
              <span>{quotaPercent}% of {formatNumber(tokenLimit)}</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card/80 border border-border/80 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Cloud Model Pool</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight font-mono text-white">
              {modelsCount}
            </span>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center space-x-1 font-mono">
              <span className="text-cyan-400 font-medium">Warm Deployments</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card/80 border border-border/80 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Gateway Latency</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight font-mono text-white">
              0.42<span className="text-sm font-normal text-muted-foreground">ms</span>
            </span>
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">
              <span>Fastify Redis sliding-window</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Developer Command Strip */}
      <div className="p-5 rounded-2xl bg-[#090B12] border border-white/[0.08] flex flex-col space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Quick Inference Invocation
            </span>
          </div>

          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.06] text-xs font-mono">
            <button
              onClick={() => setActiveTabCode('curl')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                activeTabCode === 'curl' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              cURL
            </button>
            <button
              onClick={() => setActiveTabCode('python')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                activeTabCode === 'python' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setActiveTabCode('ts')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                activeTabCode === 'ts' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              TypeScript
            </button>
          </div>
        </div>

        <div className="relative rounded-xl bg-black/60 p-3.5 border border-white/[0.06] overflow-x-auto">
          <pre className="font-mono text-xs text-zinc-300 leading-relaxed">
            {getActiveCode()}
          </pre>
          <button
            onClick={() => copyCode(getActiveCode())}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] text-xs font-mono text-zinc-200 flex items-center gap-1.5 transition-all"
            title="Copy snippet"
          >
            {copiedQuickCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedQuickCurl ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Quota Progress Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-white">Monthly Developer Quota</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium">
              5,000,000 Free Tokens
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Quota automatically resets every 30 days. Need dedicated enterprise GPU nodes or uncapped concurrency?
          </p>
          <div className="w-full bg-muted rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/dashboard/billing"
            className="px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold transition-all text-foreground"
          >
            Top Up Credits
          </Link>
          <Link
            href="/dashboard/analytics"
            className="px-4 py-2.5 rounded-xl bg-card border border-border hover:bg-muted/80 text-xs font-semibold transition-all text-foreground"
          >
            Usage Velocity
          </Link>
        </div>
      </div>

      {/* Recent API Requests Stream */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-white">Live Request Telemetry</span>
          </div>
          <Link
            href="/dashboard/logs"
            className="text-xs text-primary hover:underline flex items-center space-x-1 font-medium font-mono"
          >
            <span>Inspect All Request Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Terminal className="w-8 h-8 mx-auto mb-3 opacity-40 text-cyan-400" />
            <p className="text-sm font-medium text-foreground">No requests recorded yet.</p>
            <p className="text-xs mt-1 font-mono">Run a request from your terminal or the interactive playground.</p>
            <Link
              href="/dashboard/playground"
              className="inline-block mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            >
              Launch Playground
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-mono">
                <tr>
                  <th className="px-6 py-3">Endpoint</th>
                  <th className="px-6 py-3">Model</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Prompt / Total Tokens</th>
                  <th className="px-6 py-3">Latency</th>
                  <th className="px-6 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/20 transition-colors font-mono">
                    <td className="px-6 py-3.5 text-zinc-400 font-medium">
                      {req.endpoint}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-white">
                      {req.modelIdentifier}
                    </td>
                    <td className="px-6 py-3.5">
                      {req.statusCode >= 200 && req.statusCode < 300 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {req.statusCode} OK
                        </span>
                      ) : req.statusCode === 429 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          429 Rate Limit
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          {req.statusCode} Error
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-zinc-400">
                      {req.promptTokens} / <span className="text-white font-semibold">{req.totalTokens}</span>
                    </td>
                    <td className="px-6 py-3.5 text-cyan-400 font-semibold">
                      {req.latencyMs}ms
                    </td>
                    <td className="px-6 py-3.5 text-zinc-500 text-[11px]">
                      {new Date(req.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
