'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { BarChart3, Activity, Zap, Cpu, Calendar, TrendingUp } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sumData, reqsData] = await Promise.all([
          apiRequest('/api/usage/summary').catch(() => null),
          apiRequest('/api/usage/requests?limit=50').catch(() => []),
        ]);
        setSummary(sumData);
        setRequests(reqsData || []);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const modelUsage = summary?.modelUsage || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usage & Token Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Detailed metrics on your foundation model invocations, token distributions, and system latency.
        </p>
      </div>

      {/* Top metrics summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Monthly Tokens</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight font-mono">
            {formatNumber(summary?.quota?.currentMonthTokensUsed || 0)}
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            Limit: {formatNumber(summary?.quota?.monthlyTokenLimit || 5000000)} tokens
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Invocations</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight font-mono">
            {formatNumber(summary?.totalRequests || 0)}
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            {summary?.requestsToday || 0} executed today
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated Compute Savings</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight font-mono text-emerald-400">
            ~88%
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            vs proprietary cloud model API pricing
          </p>
        </div>
      </div>

      {/* Model-wise usage breakdown */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Model-Wise Consumption Breakdown</span>
          </div>
        </div>

        {modelUsage.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No per-model usage recorded yet. Calls from the playground will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-3">Model</th>
                  <th className="px-6 py-3">Identifier</th>
                  <th className="px-6 py-3">Requests</th>
                  <th className="px-6 py-3">Prompt Tokens</th>
                  <th className="px-6 py-3">Completion Tokens</th>
                  <th className="px-6 py-3">Total Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {modelUsage.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="px-6 py-4 font-sans font-semibold text-foreground">
                      {item.modelName}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{item.apiIdentifier}</td>
                    <td className="px-6 py-4 text-foreground">{item.requestCount}</td>
                    <td className="px-6 py-4 text-muted-foreground">{formatNumber(item.promptTokens)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{formatNumber(item.completionTokens)}</td>
                    <td className="px-6 py-4 text-primary font-bold">{formatNumber(item.totalTokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical requests log */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Detailed Request Audit Ledger</span>
          </div>
          <span className="text-xs text-muted-foreground">{requests.length} events</span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Model</th>
                <th className="px-6 py-3">Key</th>
                <th className="px-6 py-3">Tokens</th>
                <th className="px-6 py-3">Latency</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-[11px]">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-6 py-3 text-muted-foreground">{r.id.slice(0, 8)}</td>
                  <td className="px-6 py-3 text-foreground font-sans font-medium">{r.modelIdentifier}</td>
                  <td className="px-6 py-3 text-muted-foreground">{r.keyName}</td>
                  <td className="px-6 py-3 text-primary font-bold">{r.totalTokens}</td>
                  <td className="px-6 py-3 text-muted-foreground">{r.latencyMs}ms</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                      {r.statusCode}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {new Date(r.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

