'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import {
  ListFilter,
  Search,
  RefreshCw,
  Download,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Clock,
  Zap,
  Cpu,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Code,
  DollarSign,
  Activity,
  Layers,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface ApiRequestLog {
  id: string;
  endpoint: string;
  modelName: string;
  modelIdentifier: string;
  keyName: string;
  maskedKey: string;
  statusCode: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  ttftMs: number | null;
  ipAddress: string | null;
  errorCode: string | null;
  costUsd: number;
  createdAt: string;
}

function RequestLogsInner() {
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<ApiRequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | '2xx' | '4xx' | '5xx'>('ALL');
  const [modelFilter, setModelFilter] = useState('ALL');
  const [selectedRequest, setSelectedRequest] = useState<ApiRequestLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const { success, error: toastError } = useToast();
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with URL query parameters if provided
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);

    const m = searchParams.get('model');
    if (m) setModelFilter(m);

    const s = searchParams.get('status');
    if (s && ['2xx', '4xx', '5xx'].includes(s)) setStatusFilter(s as any);
  }, [searchParams]);

  const fetchLogs = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      let query = '/api/usage/requests?limit=100';
      if (statusFilter !== 'ALL') query += `&status=${statusFilter}`;
      if (modelFilter !== 'ALL') query += `&model=${encodeURIComponent(modelFilter)}`;

      const data = await apiRequest(query).catch(() => []);
      setRequests(data || []);
    } catch (err) {
      console.error('Failed to load request logs:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, modelFilter]);

  // Auto-polling setup
  useEffect(() => {
    if (autoRefresh) {
      pollTimerRef.current = setInterval(() => {
        fetchLogs(true);
      }, 5000);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [autoRefresh, statusFilter, modelFilter]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    success('Copied to clipboard.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCurlForRequest = (req: ApiRequestLog) => {
    return `curl https://api.yoyo.ai${req.endpoint} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_live_your_api_key_here" \\
  -d '{
    "model": "${req.modelIdentifier}",
    "messages": [
      {"role": "user", "content": "Sample replay prompt"}
    ]
  }'`;
  };

  const exportCsv = () => {
    if (requests.length === 0) return;
    const headers = [
      'Request ID',
      'Endpoint',
      'Model',
      'API Key',
      'Status Code',
      'Prompt Tokens',
      'Completion Tokens',
      'Total Tokens',
      'Latency (ms)',
      'TTFT (ms)',
      'Cost (USD)',
      'IP Address',
      'Timestamp',
    ];
    const rows = requests.map((r) => [
      `"${r.id}"`,
      `"${r.endpoint}"`,
      `"${r.modelIdentifier}"`,
      `"${r.keyName}"`,
      r.statusCode,
      r.promptTokens,
      r.completionTokens,
      r.totalTokens,
      r.latencyMs,
      r.ttftMs || 0,
      r.costUsd || 0,
      `"${r.ipAddress || ''}"`,
      `"${new Date(r.createdAt).toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `yoyo_request_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Exported request logs to CSV.');
  };

  const exportJson = () => {
    if (requests.length === 0) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(requests, null, 2)
    )}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', `yoyo_request_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Exported request logs to JSON.');
  };

  // Client search filter
  const filteredRequests = requests.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.modelIdentifier.toLowerCase().includes(q) ||
      r.modelName.toLowerCase().includes(q) ||
      r.keyName.toLowerCase().includes(q) ||
      r.maskedKey.toLowerCase().includes(q) ||
      r.statusCode.toString().includes(q)
    );
  });

  // Calculate high-level KPIs
  const totalCount = requests.length;
  const successCount = requests.filter((r) => r.statusCode >= 200 && r.statusCode < 300).length;
  const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : '100.0';
  const avgLatency =
    totalCount > 0
      ? Math.round(requests.reduce((acc, r) => acc + (r.latencyMs || 0), 0) / totalCount)
      : 0;
  const totalCost = requests.reduce((acc, r) => acc + (r.costUsd || 0), 0);

  // Distinct models for filter dropdown
  const uniqueModels = Array.from(new Set(requests.map((r) => r.modelIdentifier))).filter(Boolean);

  const getStatusBadge = (code: number) => {
    if (code >= 200 && code < 300) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          <span>{code} OK</span>
        </span>
      );
    }
    if (code === 429) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3" />
          <span>429 Rate Limited</span>
        </span>
      );
    }
    if (code >= 400 && code < 500) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3" />
          <span>{code} Error</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">
        <XCircle className="w-3 h-3" />
        <span>{code} Failure</span>
      </span>
    );
  };

  const formatRelativeTime = (dateStr: string) => {
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight">Request Logs & Invocations</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
              LIVE GATEWAY STREAM
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Inspect real-time API traffic, status codes, latency benchmarks, token distributions, and request costs.
          </p>
        </div>

        {/* Top Control Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold flex items-center space-x-2 transition-all ${
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
              }`}
            />
            <span>{autoRefresh ? 'Live Stream (5s)' : 'Stream Paused'}</span>
          </button>

          <button
            onClick={() => fetchLogs()}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all shadow-sm"
            title="Refresh logs now"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </button>

          {/* Export Dropdown */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={exportCsv}
              className="px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>CSV</span>
            </button>
            <button
              onClick={exportJson}
              className="px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Code className="w-3.5 h-3.5 text-purple-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Logged Invocations</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-foreground">
            {formatNumber(totalCount)}
          </div>
          <span className="text-[10px] text-muted-foreground">Recent window</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-emerald-400">
            {successRate}%
          </div>
          <span className="text-[10px] text-muted-foreground">{successCount} successful calls</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Avg Latency</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-indigo-400">
            {avgLatency}ms
          </div>
          <span className="text-[10px] text-muted-foreground">Fastify Edge Gateway</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Compute Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-emerald-400">
            ${totalCost < 0.0001 && totalCost > 0 ? '<$0.0001' : totalCost.toFixed(4)}
          </div>
          <span className="text-[10px] text-muted-foreground">Aggregated window</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Request ID, model, status, or API key..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:border-primary focus:outline-none transition-all font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center space-x-1 bg-muted/50 p-1 rounded-xl border border-border text-xs font-mono">
            {(['ALL', '2xx', '4xx', '5xx'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Model Filter */}
          {uniqueModels.length > 0 && (
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-muted/50 border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Models</option>
              {uniqueModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Model</th>
                <th className="py-3 px-4">Tokens</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Cost</th>
                <th className="py-3 px-4">API Key</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading real-time API logs...</span>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-muted-foreground">
                    <ListFilter className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-foreground">No matching request logs found</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Invocations made via <code className="text-primary">api.yoyo.ai/v1</code> or the Playground will stream here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4">{getStatusBadge(req.statusCode)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-foreground truncate max-w-[110px]">
                          {req.id.slice(0, 13)}...
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(req.id, req.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          title="Copy Request ID"
                        >
                          {copiedId === req.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-foreground font-semibold font-mono text-[11px] bg-muted px-2 py-0.5 rounded border border-border/60">
                        {req.modelIdentifier}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-foreground font-bold">{req.totalTokens.toLocaleString()}</span>
                      <span className="text-muted-foreground text-[10px] block">
                        {req.promptTokens} in / {req.completionTokens} out
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-foreground">{req.latencyMs}ms</span>
                      {req.ttftMs ? (
                        <span className="text-emerald-400 text-[10px] block font-semibold">
                          {req.ttftMs}ms TTFT
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">
                      ${(req.costUsd || 0).toFixed(6)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      <span>{req.keyName}</span>
                      <span className="block text-[9px] text-muted-foreground/60">{req.maskedKey}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
                      {formatRelativeTime(req.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(req);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-primary hover:text-primary-foreground text-xs font-semibold text-muted-foreground transition-all"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-card border border-border rounded-3xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base text-foreground font-mono">
                      Request Details
                    </h3>
                    {getStatusBadge(selectedRequest.statusCode)}
                  </div>
                  <code className="text-xs font-mono text-muted-foreground block mt-0.5">
                    {selectedRequest.id}
                  </code>
                </div>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                  Latency
                </span>
                <span className="text-base font-bold text-foreground">
                  {selectedRequest.latencyMs} ms
                </span>
                {selectedRequest.ttftMs && (
                  <span className="text-[10px] text-emerald-400 block">
                    TTFT: {selectedRequest.ttftMs}ms
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                  Tokens
                </span>
                <span className="text-base font-bold text-foreground">
                  {selectedRequest.totalTokens.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {selectedRequest.promptTokens} in / {selectedRequest.completionTokens} out
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                  Compute Cost
                </span>
                <span className="text-base font-bold text-emerald-400">
                  ${(selectedRequest.costUsd || 0).toFixed(6)}
                </span>
                <span className="text-[10px] text-muted-foreground block">USD Billing Ledger</span>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                  Model
                </span>
                <span className="text-sm font-bold text-foreground truncate block">
                  {selectedRequest.modelIdentifier}
                </span>
                <span className="text-[10px] text-muted-foreground block truncate">
                  {selectedRequest.modelName}
                </span>
              </div>
            </div>

            {/* Request Specs Table */}
            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">HTTP Endpoint</span>
                <span className="text-foreground font-semibold">
                  POST {selectedRequest.endpoint}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">API Key Used</span>
                <span className="text-foreground">
                  {selectedRequest.keyName}{' '}
                  <span className="text-muted-foreground">({selectedRequest.maskedKey})</span>
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Client IP Address</span>
                <span className="text-foreground">{selectedRequest.ipAddress || '127.0.0.1'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Timestamp (ISO)</span>
                <span className="text-foreground">
                  {new Date(selectedRequest.createdAt).toISOString()}
                </span>
              </div>

              {selectedRequest.errorCode && (
                <div className="flex items-center justify-between py-1 border-b border-red-500/20 text-red-400">
                  <span>Error Code</span>
                  <span className="font-bold">{selectedRequest.errorCode}</span>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(getCurlForRequest(selectedRequest));
                  setCopiedCurl(true);
                  success('cURL command copied to clipboard.');
                  setTimeout(() => setCopiedCurl(false), 2000);
                }}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold text-foreground transition-all flex items-center justify-center space-x-1.5 shadow-sm"
              >
                {copiedCurl ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-primary" />
                )}
                <span>{copiedCurl ? 'Copied cURL' : 'Copy cURL Request'}</span>
              </button>

              <div className="flex items-center space-x-2 w-full md:w-auto">
                <Link
                  href={`/dashboard/playground?model=${encodeURIComponent(
                    selectedRequest.modelIdentifier
                  )}`}
                  className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-primary/20 transition-all"
                >
                  <Terminal className="w-4 h-4" />
                  <span>Replay in Playground</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RequestLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center space-y-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading telemetry inspector...</span>
        </div>
      }
    >
      <RequestLogsInner />
    </Suspense>
  );
}

