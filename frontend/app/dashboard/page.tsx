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
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [modelsCount, setModelsCount] = useState(4);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Developer Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, {user?.fullName || user?.email}. Real-time metrics for your model workloads.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard/keys"
            className="px-4 py-2 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Manage Keys</span>
          </Link>
          <Link
            href="/dashboard/playground"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs flex items-center space-x-1.5 shadow-md shadow-primary/20 transition-all"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Open Playground</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total API Calls</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold tracking-tight">
              {formatNumber(summary?.totalRequests || 0)}
            </span>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center space-x-1">
              <span className="text-emerald-400 font-medium">+{summary?.requestsToday || 0}</span>
              <span>calls today</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Tokens Consumed</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold tracking-tight font-mono">
              {formatNumber(totalTokens)}
            </span>
            <div className="text-[11px] text-muted-foreground mt-1">
              <span>{quotaPercent}% of {formatNumber(tokenLimit)} monthly</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Online Models</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold tracking-tight">
              {modelsCount}
            </span>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Cloud GPU Ready</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">API Latency (p95)</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold tracking-tight font-mono">
              18<span className="text-sm font-normal text-muted-foreground">ms</span>
            </span>
            <div className="text-[11px] text-muted-foreground mt-1">
              <span>Gateway processing overhead</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quota Progress Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold">Free Developer Tier Quota</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium">
              5,000,000 Tokens / Mo
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your quota renews monthly. Zero credit card required. Upgrade to enterprise dedicated GPU clusters anytime.
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
            href="/dashboard/analytics"
            className="px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold transition-all text-foreground"
          >
            View Detailed Analytics
          </Link>
        </div>
      </div>

      {/* Recent API Requests Stream */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Recent API Invocations</span>
          </div>
          <Link
            href="/dashboard/logs"
            className="text-xs text-primary hover:underline flex items-center space-x-1 font-medium"
          >
            <span>View All Request Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Terminal className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No requests recorded yet.</p>
            <p className="text-xs mt-1">Make a call from the playground or using your API key to see telemetry.</p>
            <Link
              href="/dashboard/playground"
              className="inline-block mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            >
              Test in Playground
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
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
                  <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-muted-foreground font-medium">
                      {req.endpoint}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-foreground">
                      {req.modelIdentifier}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {req.statusCode} OK
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-muted-foreground">
                      {req.promptTokens} / <span className="text-foreground font-semibold">{req.totalTokens}</span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-muted-foreground">
                      {req.latencyMs}ms
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground font-mono text-[11px]">
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

