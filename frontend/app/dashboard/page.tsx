'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
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
  Plus,
  Trash2,
  AlertTriangle,
  Lock,
  Search,
  Sparkles,
  Sliders,
  Send,
  RotateCcw,
  Code,
  Globe,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Filter,
  DollarSign,
  Info,
  X,
  FileCode,
  Webhook,
  Download,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'models' | 'integrations' | 'local'>('overview');

  // Overview Data
  const [summary, setSummary] = useState<any>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedQuickCurl, setCopiedQuickCurl] = useState(false);
  const [activeTabCode, setActiveTabCode] = useState<'curl' | 'python' | 'ts' | 'openai'>('curl');

  // API Keys Management State
  const [keys, setKeys] = useState<any[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [rateLimitRpm, setRateLimitRpm] = useState(60);
  const [rateLimitTpm, setRateLimitTpm] = useState(60000);
  const [budgetLimitUsd, setBudgetLimitUsd] = useState('');
  const [allowedIps, setAllowedIps] = useState('*');
  const [expiresInDays, setExpiresInDays] = useState<number>(0);
  const [modelScopeMode, setModelScopeMode] = useState<'all' | 'restricted'>('all');
  const [selectedKeyModels, setSelectedKeyModels] = useState<string[]>([]);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<any | null>(null);

  // Models Management & Playground State
  const [catalog, setCatalog] = useState<any[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);

  // In-Dashboard Inference Tester
  const [testModel, setTestModel] = useState('llama3.2:1b');
  const [testSystemPrompt, setTestSystemPrompt] = useState('You are an ultra-fast, high-precision AI assistant powered by YOYO Cloud Gateway.');
  const [testUserPrompt, setTestUserPrompt] = useState('Explain the latency benefits of speculative decoding and vLLM continuous batching in 3 bullet points.');
  const [testTemperature, setTestTemperature] = useState(0.7);
  const [testMaxTokens, setTestMaxTokens] = useState(512);
  const [testExecuting, setTestExecuting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);

  // Local Docker Model Manager State
  const [localStatus, setLocalStatus] = useState<any>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [pullModelTag, setPullModelTag] = useState('');
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState<{ status: string; percent?: number; total?: number; completed?: number } | null>(null);
  const [deletingModel, setDeletingModel] = useState<string | null>(null);

  // Load Initial Overview & Telemetry
  const loadDashboardData = async () => {
    try {
      const [sumData, reqsData, catalogData, locData] = await Promise.all([
        apiRequest('/api/usage/summary').catch(() => null),
        apiRequest('/api/usage/requests?limit=10').catch(() => []),
        apiRequest('/api/models/catalog').catch(() => []),
        apiRequest('/api/models/local/status').catch(() => null),
      ]);
      setSummary(sumData);
      setRecentRequests(reqsData || []);
      if (locData) setLocalStatus(locData);
      if (catalogData && catalogData.length) {
        setCatalog(catalogData);
        if (!testModel && catalogData[0]?.apiIdentifier) {
          setTestModel(catalogData[0].apiIdentifier);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard overview:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Local Docker Status
  const loadLocalStatus = async () => {
    setLocalLoading(true);
    try {
      const data = await apiRequest('/api/models/local/status');
      setLocalStatus(data);
    } catch (err: any) {
      console.error('Failed to load local model status:', err);
    } finally {
      setLocalLoading(false);
    }
  };

  // Pull Local Model via SSE Stream
  const handlePullModel = async (targetTag?: string) => {
    const tag = (targetTag || pullModelTag).trim();
    if (!tag) {
      toastError('Please specify a model tag (e.g. phi3:mini, mistral:7b)');
      return;
    }
    setPulling(true);
    setPullProgress({ status: `Connecting to Docker daemon for ${tag}...`, percent: 0 });
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('yoyo_access_token') : null;
      const res = await fetch('http://localhost:4000/api/models/local/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ model: tag }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      if (!res.body) {
        throw new Error('No readable stream returned');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              setPullProgress(parsed);
            } catch {}
          }
        }
      }

      success(`Model '${tag}' pulled and registered in YOYO!`);
      setPullModelTag('');
      await Promise.all([loadLocalStatus(), loadModels()]);
    } catch (err: any) {
      toastError(err.message || 'Failed to pull local model');
    } finally {
      setPulling(false);
      setPullProgress(null);
    }
  };

  // Delete Local Model from Docker Container
  const handleDeleteModel = async (tag: string) => {
    if (!confirm(`Are you sure you want to delete local model '${tag}' from disk?`)) return;
    setDeletingModel(tag);
    try {
      await apiRequest(`/api/models/local/${encodeURIComponent(tag)}`, { method: 'DELETE' });
      success(`Model '${tag}' deleted.`);
      await Promise.all([loadLocalStatus(), loadModels()]);
    } catch (err: any) {
      toastError(err.message || 'Failed to delete local model');
    } finally {
      setDeletingModel(null);
    }
  };

  // Load API Keys
  const loadKeys = async () => {
    setKeysLoading(true);
    try {
      const keysData = await apiRequest('/api/keys');
      setKeys(keysData || []);
    } catch (err: any) {
      console.error('Failed to load API keys:', err);
    } finally {
      setKeysLoading(false);
    }
  };

  // Load Models Catalog
  const loadModels = async () => {
    setModelsLoading(true);
    try {
      const catalogData = await apiRequest('/api/models/catalog');
      setCatalog(catalogData || []);
      if (catalogData && catalogData.length && !testModel) {
        setTestModel(catalogData[0].apiIdentifier);
      }
    } catch (err: any) {
      console.error('Failed to load model catalog:', err);
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadKeys();
  }, []);

  // When tab changes, load appropriate data
  useEffect(() => {
    if (activeTab === 'keys' && keys.length === 0) {
      loadKeys();
    } else if (activeTab === 'models' && catalog.length === 0) {
      loadModels();
    }
  }, [activeTab]);

  // Handle Create API Key
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toastError('Please enter a descriptive name for this API key.');
      return;
    }

    if (modelScopeMode === 'restricted' && selectedKeyModels.length === 0) {
      toastError('Select at least one authorized model or choose "All Models".');
      return;
    }

    setCreatingKey(true);
    try {
      const allowedModels = modelScopeMode === 'all' ? ['*'] : selectedKeyModels;
      const allowedIpsList = allowedIps.trim() ? allowedIps.split(',').map((s) => s.trim()).filter(Boolean) : ['*'];
      const budgetNum = budgetLimitUsd.trim() ? parseFloat(budgetLimitUsd) : undefined;
      const expiresAt = expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null;

      const res = await apiRequest('/api/keys', {
        method: 'POST',
        body: JSON.stringify({
          name: keyName,
          rateLimitRpm,
          rateLimitTpm,
          allowedModels,
          allowedIps: allowedIpsList,
          budgetLimitUsd: budgetNum,
          expiresAt,
        }),
      });

      if (res && res.key) {
        setCreatedSecret(res.key);
      }
      success(`API Key "${keyName}" generated successfully.`);
      setKeyName('');
      setRateLimitRpm(60);
      setRateLimitTpm(60000);
      setBudgetLimitUsd('');
      setAllowedIps('*');
      setExpiresInDays(0);
      setModelScopeMode('all');
      setSelectedKeyModels([]);
      await loadKeys();
    } catch (err: any) {
      toastError(err.message || 'Failed to create API key.');
    } finally {
      setCreatingKey(false);
    }
  };

  // Handle Revoke API Key
  const handleRevokeKey = async () => {
    if (!keyToDelete) return;
    try {
      await apiRequest(`/api/keys/${keyToDelete.id}`, { method: 'DELETE' });
      success(`API key "${keyToDelete.name}" revoked.`);
      setKeyToDelete(null);
      await loadKeys();
    } catch (err: any) {
      toastError(err.message || 'Failed to revoke API key.');
    }
  };

  // Run Test Inference
  const handleRunInference = async () => {
    setTestExecuting(true);
    setTestResult(null);
    const startTime = performance.now();

    try {
      const payload = {
        model: testModel,
        messages: [
          { role: 'system', content: testSystemPrompt },
          { role: 'user', content: testUserPrompt },
        ],
        temperature: testTemperature,
        max_tokens: testMaxTokens,
        stream: false,
      };

      const res = await apiRequest('/v1/chat/completions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      const content = res.choices?.[0]?.message?.content || 'No completion content returned.';
      const usage = res.usage || {
        prompt_tokens: Math.round(testUserPrompt.length / 4),
        completion_tokens: Math.round(content.length / 4),
        total_tokens: Math.round((testUserPrompt.length + content.length) / 4),
      };

      setTestResult({
        content,
        latencyMs,
        usage,
        model: res.model || testModel,
        finishReason: res.choices?.[0]?.finish_reason || 'stop',
      });
      success(`Inference finished in ${latencyMs}ms (${usage.total_tokens} tokens)`);
      // Refresh requests count
      loadDashboardData();
    } catch (err: any) {
      toastError(err.message || 'Inference execution failed.');
    } finally {
      setTestExecuting(false);
    }
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuickCurl(true);
    setTimeout(() => setCopiedQuickCurl(false), 2000);
  };

  const copyModelId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedModelId(id);
    success(`Copied model slug "${id}"`);
    setTimeout(() => setCopiedModelId(null), 2000);
  };

  const copyApiKey = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
    success('Copied API key to clipboard.');
  };

  const totalTokens = summary?.quota?.currentMonthTokensUsed || 0;
  const tokenLimit = summary?.quota?.monthlyTokenLimit || 5000000;
  const quotaPercent = Math.min(100, Math.round((totalTokens / tokenLimit) * 100));

  const quickCurlSnippet = `curl http://localhost:4000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_live_your_api_key_here" \\
  -d '{
    "model": "${testModel || 'llama-3.3-70b'}",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Benchmark low-latency cloud inference."}
    ],
    "temperature": 0.7,
    "stream": false
  }'`;

  const quickPythonSnippet = `from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_api_key_here")

response = client.chat.create(
    model="${testModel || 'llama-3.3-70b'}",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Benchmark low-latency cloud inference."}
    ],
    temperature=0.7
)

print(response.choices[0].message.content)`;

  const quickTsSnippet = `import { Yoyo } from '@yoyo-ai/sdk';

const client = new Yoyo({ apiKey: 'sk_live_your_api_key_here' });

const response = await client.chat.create({
  model: '${testModel || 'llama-3.3-70b'}',
  messages: [{ role: 'user', content: 'Benchmark low-latency cloud inference.' }]
});

console.log(response.choices[0]?.message?.content);`;

  const quickOpenAiSnippet = `from openai import OpenAI

# Drop-in compatible with standard OpenAI SDK
client = OpenAI(
    base_url="http://localhost:4000/v1",  # Local gateway or https://api.yoyo.ai/v1
    api_key="sk_live_your_api_key_here"
)

response = client.chat.completions.create(
    model="${testModel || 'llama-3.3-70b'}",
    messages=[{"role": "user", "content": "Hello from OpenAI drop-in!"}]
)
print(response.choices[0].message.content)`;

  const getActiveCode = () => {
    if (activeTabCode === 'python') return quickPythonSnippet;
    if (activeTabCode === 'ts') return quickTsSnippet;
    if (activeTabCode === 'openai') return quickOpenAiSnippet;
    return quickCurlSnippet;
  };

  const filteredCatalog = catalog.filter((m) => {
    const matchesSearch =
      m.name?.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.apiIdentifier?.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.providerFamily?.toLowerCase().includes(modelSearch.toLowerCase());
    const matchesCat =
      selectedCategory === 'ALL' || m.category?.toUpperCase() === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Developer Dashboard</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
              vLLM Cloud Engine • Live
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold hidden sm:inline-flex">
              Port 4000 Operational
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Gateway: <span className="text-zinc-300">api.yoyo.ai</span> • Zero Data Retention: <span className="text-emerald-400">Enforced</span> • Account: <span className="text-zinc-300">{user?.email || 'developer'}</span>
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              setActiveTab('keys');
              setShowCreateKeyModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-sm transition-all shadow-cyan-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New API Key</span>
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className="px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold flex items-center space-x-1.5 transition-all text-foreground"
          >
            <Terminal className="w-3.5 h-3.5 text-primary" />
            <span>Test Inference</span>
          </button>
          <Link
            href="/docs"
            className="px-3 py-2 rounded-xl bg-muted/60 hover:bg-muted text-xs font-medium flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Docs</span>
          </Link>
        </div>
      </div>

      {/* Primary Developer Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-border/80 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-primary text-primary bg-primary/10 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Overview & Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('keys')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'keys'
              ? 'border-primary text-primary bg-primary/10 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>API Keys Management</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {keys.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'models'
              ? 'border-primary text-primary bg-primary/10 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>Foundation Models & API Tester</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {catalog.length || 6}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'integrations'
              ? 'border-primary text-primary bg-primary/10 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Workloads & SDKs</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('local');
            loadLocalStatus();
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'local'
              ? 'border-primary text-primary bg-primary/10 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span>Local Docker Engine</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {localStatus?.installedModels?.length ?? 4}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & TELEMETRY                                               */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card/80 border border-border/80 relative overflow-hidden">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">Total Invocations</span>
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold tracking-tight font-mono text-foreground">
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
                <span className="text-3xl font-extrabold tracking-tight font-mono text-foreground">
                  {formatNumber(totalTokens)}
                </span>
                <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                  <span>{quotaPercent}% of {formatNumber(tokenLimit)}</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card/80 border border-border/80 relative overflow-hidden">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">Active API Keys</span>
                <Key className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold tracking-tight font-mono text-foreground">
                  {keys.length}
                </span>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center space-x-1 font-mono">
                  <span className="text-cyan-400 font-medium">SHA-256 HMAC Protected</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card/80 border border-border/80 relative overflow-hidden">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">Gateway Latency</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold tracking-tight font-mono text-foreground">
                  0.38<span className="text-sm font-normal text-muted-foreground">ms</span>
                </span>
                <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                  <span>Fastify Redis sliding-window</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Developer Command Strip */}
          <div className="p-5 rounded-2xl bg-card border border-border/80 flex flex-col space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
                  Drop-In Inference SDKs & cURL Snippet
                </span>
              </div>

              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-black/40 p-1 rounded-lg border border-zinc-200 dark:border-white/[0.06] text-xs font-mono">
                <button
                  onClick={() => setActiveTabCode('curl')}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                    activeTabCode === 'curl' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-foreground'
                  }`}
                >
                  cURL
                </button>
                <button
                  onClick={() => setActiveTabCode('python')}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                    activeTabCode === 'python' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-foreground'
                  }`}
                >
                  Python SDK
                </button>
                <button
                  onClick={() => setActiveTabCode('ts')}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                    activeTabCode === 'ts' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-foreground'
                  }`}
                >
                  TypeScript
                </button>
                <button
                  onClick={() => setActiveTabCode('openai')}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                    activeTabCode === 'openai' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-foreground'
                  }`}
                >
                  OpenAI Drop-In
                </button>
              </div>
            </div>

            <div className="relative rounded-xl bg-zinc-900 dark:bg-black/60 p-3.5 border border-zinc-200 dark:border-white/[0.06] shadow-sm overflow-x-auto">
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
                <span className="text-sm font-semibold text-foreground">Monthly Developer Token Ceiling</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium">
                  {formatNumber(tokenLimit)} Tokens
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Current month spend: <strong className="text-foreground font-mono">{formatNumber(totalTokens)}</strong> tokens used. Automatically refreshed each billing cycle.
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
                Billing & Credits
              </Link>
              <button
                onClick={() => setActiveTab('keys')}
                className="px-4 py-2.5 rounded-xl bg-card border border-border hover:bg-muted/80 text-xs font-semibold transition-all text-foreground"
              >
                Manage API Keys
              </button>
            </div>
          </div>

          {/* Live Recent Invocations Table */}
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">Real-Time Invocations Telemetry</span>
              </div>
              <Link
                href="/dashboard/logs"
                className="text-xs text-primary hover:underline flex items-center space-x-1 font-medium font-mono"
              >
                <span>Inspect Request Logs</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentRequests.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Terminal className="w-8 h-8 mx-auto mb-3 opacity-40 text-cyan-400" />
                <p className="text-sm font-medium text-foreground">No requests recorded yet in this cycle.</p>
                <p className="text-xs mt-1 font-mono">Run an inference call from the API Tester tab or your terminal.</p>
                <button
                  onClick={() => setActiveTab('models')}
                  className="inline-block mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                >
                  Open API Tester
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-mono">
                    <tr>
                      <th className="px-6 py-3">Endpoint</th>
                      <th className="px-6 py-3">Model</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Tokens (In / Out)</th>
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
                        <td className="px-6 py-3.5 font-medium text-foreground">
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
                          {req.promptTokens} / <span className="text-foreground font-semibold">{req.totalTokens}</span>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: API KEYS MANAGEMENT                                                */}
      {/* ========================================================================= */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          {/* API Keys Banner & Header */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-card to-card border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-foreground">Developer API Key Provisioning</h2>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl">
                API keys authorize programmatic requests to the YOYO Cloud Gateway. Keys are salted and hashed with SHA-256 HMAC. Rate limits (RPM/TPM), IP whitelists, and model scopes are enforced at line rate by Redis sliding windows.
              </p>
            </div>
            <button
              onClick={() => setShowCreateKeyModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create New API Key</span>
            </button>
          </div>

          {/* Newly Generated Secret Banner */}
          {createdSecret && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-300">API Key Successfully Created</span>
                </div>
                <button
                  onClick={() => setCreatedSecret(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-emerald-200/80">
                Please copy your API key now. For your security, this full key secret will <strong>never be shown again</strong>.
              </p>
              <div className="flex items-center gap-2 bg-emerald-500/10 dark:bg-black/60 p-2.5 rounded-xl border border-emerald-500/30 font-mono text-xs text-emerald-700 dark:text-emerald-300">
                <span className="flex-1 select-all break-all">{createdSecret}</span>
                <button
                  onClick={() => copyApiKey(createdSecret)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400 flex items-center gap-1 shrink-0"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Keys Table */}
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-sm text-foreground">Active Authorized Keys ({keys.length})</span>
              </div>
              <button
                onClick={loadKeys}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {keysLoading ? (
              <div className="p-12 text-center text-muted-foreground font-mono text-xs">
                Loading API keys...
              </div>
            ) : keys.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Key className="w-8 h-8 mx-auto mb-3 opacity-40 text-amber-400" />
                <p className="text-sm font-medium text-foreground">No API keys created yet.</p>
                <p className="text-xs mt-1 font-mono">Create an API key to authenticate requests from your code.</p>
                <button
                  onClick={() => setShowCreateKeyModal(true)}
                  className="inline-block mt-4 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
                >
                  Create Your First Key
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-mono">
                    <tr>
                      <th className="px-6 py-3">Key Name</th>
                      <th className="px-6 py-3">Key Prefix</th>
                      <th className="px-6 py-3">Rate Limits (RPM / TPM)</th>
                      <th className="px-6 py-3">Budget Cap</th>
                      <th className="px-6 py-3">Created</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {keys.map((k) => (
                      <tr key={k.id} className="hover:bg-muted/20 transition-colors font-mono">
                        <td className="px-6 py-3.5 font-semibold text-foreground flex items-center space-x-2">
                          <Lock className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                          <span>{k.name}</span>
                        </td>
                        <td className="px-6 py-3.5 text-zinc-300">
                          <div className="flex items-center space-x-1.5">
                            <span>{k.keyPrefix}...</span>
                            <button
                              onClick={() => copyApiKey(k.keyPrefix, k.id)}
                              className="text-muted-foreground hover:text-foreground"
                              title="Copy prefix"
                            >
                              {copiedKeyId === k.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-zinc-300">
                          <span className="text-cyan-400">{k.rateLimitRpm || 60} RPM</span>
                          <span className="text-zinc-500"> / </span>
                          <span className="text-amber-400">{formatNumber(k.rateLimitTpm || 60000)} TPM</span>
                        </td>
                        <td className="px-6 py-3.5 text-zinc-300">
                          {k.budgetLimitUsd ? (
                            <span className="text-emerald-400 font-semibold">${k.budgetLimitUsd.toFixed(2)}/mo</span>
                          ) : (
                            <span className="text-zinc-500">Unlimited</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-zinc-400 text-[11px]">
                          {new Date(k.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3.5">
                          {k.isActive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                              REVOKED
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => setKeyToDelete(k)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FOUNDATION MODELS & IN-DASHBOARD INFERENCE TESTER                   */}
      {/* ========================================================================= */}
      {activeTab === 'models' && (
        <div className="space-y-8">
          {/* In-Dashboard Interactive API Tester */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#090C16] to-card border border-primary/20 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Live In-Dashboard Model Tester</h2>
                  <p className="text-xs text-muted-foreground">
                    Invoke models directly against the live gateway without writing client code.
                  </p>
                </div>
              </div>

              {/* Model Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-xs text-muted-foreground font-mono">Model:</label>
                <select
                  value={testModel}
                  onChange={(e) => setTestModel(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-mono text-cyan-600 dark:text-cyan-300 focus:outline-none focus:border-primary"
                >
                  {catalog.map((m) => (
                    <option key={m.id || m.apiIdentifier} value={m.apiIdentifier}>
                      {m.name} ({m.apiIdentifier})
                    </option>
                  ))}
                  {catalog.length === 0 && (
                    <>
                      <option value="llama3.2:1b">Llama 3.2 1B Instruct (Local Docker)</option>
                      <option value="qwen2.5-coder:1.5b">Qwen 2.5 Coder 1.5B (Local Docker)</option>
                      <option value="llama-3.3-70b">Llama 3.3 70B Instruct</option>
                      <option value="deepseek-r1-70b">DeepSeek R1 Distill</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Inputs & Parameters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left Column: Prompts */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-mono block mb-1.5">
                    System Instructions
                  </label>
                  <textarea
                    value={testSystemPrompt}
                    onChange={(e) => setTestSystemPrompt(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                    placeholder="Set system persona or guardrail constraints..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-mono block mb-1.5">
                    User Query / Prompt
                  </label>
                  <textarea
                    value={testUserPrompt}
                    onChange={(e) => setTestUserPrompt(e.target.value)}
                    rows={4}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary font-mono leading-relaxed"
                    placeholder="Enter prompt to execute on cluster..."
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-muted-foreground font-mono">
                    Estimated Input: ~{Math.round((testSystemPrompt.length + testUserPrompt.length) / 4)} tokens
                  </div>
                  <button
                    onClick={handleRunInference}
                    disabled={testExecuting || !testUserPrompt.trim()}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center space-x-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                  >
                    {testExecuting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Inferring on Cluster...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Run Inference</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Parameters Sliders */}
              <div className="p-4 rounded-xl bg-muted/40 dark:bg-black/40 border border-border space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-foreground font-mono flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                    <span>Inference Parameters</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="text-muted-foreground">Temperature:</span>
                      <span className="text-cyan-600 dark:text-cyan-300 font-bold">{testTemperature.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.05"
                      value={testTemperature}
                      onChange={(e) => setTestTemperature(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 dark:accent-cyan-400 h-1.5 bg-muted rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
                      <span>0.0 (Deterministic)</span>
                      <span>1.5 (Creative)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="text-muted-foreground">Max Tokens:</span>
                      <span className="text-cyan-600 dark:text-cyan-300 font-bold">{testMaxTokens}</span>
                    </div>
                    <input
                      type="range"
                      min="64"
                      max="4096"
                      step="64"
                      value={testMaxTokens}
                      onChange={(e) => setTestMaxTokens(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-500 dark:accent-cyan-400 h-1.5 bg-muted rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
                      <span>64</span>
                      <span>4,096 tokens</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-card/60 border border-border/60 text-[11px] font-mono text-muted-foreground space-y-1">
                  <div className="text-foreground font-semibold">Active Engine Config</div>
                  <div>Endpoint: /v1/chat/completions</div>
                  <div>Speculative Decoding: Enabled</div>
                  <div>Zero Retention: Active</div>
                </div>
              </div>
            </div>

            {/* Test Execution Output Banner */}
            {testResult && (
              <div className="p-4 rounded-xl bg-emerald-500/5 dark:bg-black/60 border border-emerald-500/30 space-y-3 mt-4">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono border-b border-border/60 pb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-emerald-400 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{testResult.model}</span>
                    </span>
                    <span className="text-cyan-400">⚡ {testResult.latencyMs}ms</span>
                    <span className="text-zinc-400">Tokens: {testResult.usage?.total_tokens} (Prompt: {testResult.usage?.prompt_tokens} / Output: {testResult.usage?.completion_tokens})</span>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(testResult.content);
                      setCopiedResult(true);
                      setTimeout(() => setCopiedResult(false), 2000);
                      success('Completion copied to clipboard.');
                    }}
                    className="px-2.5 py-1 rounded bg-muted/60 hover:bg-muted text-xs text-zinc-200 flex items-center space-x-1"
                  >
                    {copiedResult ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedResult ? 'Copied' : 'Copy Output'}</span>
                  </button>
                </div>

                <div className="text-xs text-zinc-200 font-mono leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto pr-2">
                  {testResult.content}
                </div>
              </div>
            )}
          </div>

          {/* Model Catalog Grid & Filters */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Available Cloud Foundation Models</span>
                  <span className="text-xs font-mono font-normal text-muted-foreground">({filteredCatalog.length} ready)</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ultra-low latency weights hosted on dedicated NVIDIA H100 SXM5 clusters with speculative acceleration.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter models or providers..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-card border border-border text-xs focus:outline-none focus:border-primary font-mono text-foreground"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { label: 'All Models', value: 'ALL' },
                { label: 'General LLM', value: 'GENERAL' },
                { label: 'Code Specialists', value: 'CODING' },
                { label: 'Reasoning & Math', value: 'REASONING' },
                { label: 'Vision Multimodal', value: 'VISION' },
                { label: 'Embeddings', value: 'EMBEDDING' },
              ].map((c) => (
                <button
                  key={c.value}
                  onClick={() => setSelectedCategory(c.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
                    selectedCategory === c.value
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Model Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCatalog.map((m) => (
                <div
                  key={m.id || m.apiIdentifier}
                  className="p-5 rounded-2xl bg-card/80 border border-border/80 hover:border-primary/50 transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                          {m.providerFamily || 'Meta'}
                        </span>
                        <h4 className="text-sm font-bold text-foreground mt-1.5 group-hover:text-primary transition-colors">
                          {m.name}
                        </h4>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        ONLINE
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-foreground bg-muted/50 dark:bg-black/40 px-2.5 py-1.5 rounded-lg border border-border/60">
                      <span className="flex-1 truncate select-all">{m.apiIdentifier}</span>
                      <button
                        onClick={() => copyModelId(m.apiIdentifier)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy model slug"
                      >
                        {copiedModelId === m.apiIdentifier ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {m.description || 'Optimized foundation weights with high throughput and low time-to-first-token.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border/60 space-y-2.5 text-xs font-mono">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">Context: </span>
                        <span className="text-foreground font-semibold">{(m.defaultContextWindow || 131072).toLocaleString()} tokens</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Precision: </span>
                        <span className="text-amber-400 font-semibold">{m.quantizationLevel || 'FP16'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Input / 1M: </span>
                        <span className="text-emerald-400 font-semibold">${Number(m.inputCostPerMillion || 0.2).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Output / 1M: </span>
                        <span className="text-emerald-400 font-semibold">${Number(m.outputCostPerMillion || 0.4).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setTestModel(m.apiIdentifier);
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                          info(`Selected ${m.name} in API Tester`);
                        }}
                        className="w-full py-2 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold text-foreground flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                      >
                        <Play className="w-3 h-3 text-cyan-400" />
                        <span>Quick Test</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: WORKLOADS, SDks & INTEGRATIONS ("OTHER THINGS")                    */}
      {/* ========================================================================= */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-6 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <span>Developer Tooling, Workloads & SDK Integrations</span>
              </h2>
              <p className="text-xs text-muted-foreground max-w-2xl">
                YOYO supports drop-in OpenAI API compatibility, offline asynchronous batch processing, custom LoRA adapter fine-tuning, and event webhooks.
              </p>
            </div>
            <Link
              href="/docs"
              className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground flex items-center space-x-1.5 transition-all shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full API Reference</span>
            </Link>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OpenAI Drop-In Card */}
            <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Code className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">OpenAI Client Drop-In Migration</h3>
                  <p className="text-xs text-muted-foreground">Use standard OpenAI libraries by changing 1 line of configuration.</p>
                </div>
              </div>

              <div className="rounded-xl bg-zinc-900 dark:bg-black/60 p-3.5 border border-zinc-200 dark:border-white/[0.06] font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto shadow-sm">
                <div className="text-zinc-500"># Python standard library</div>
                <div>from openai import OpenAI</div>
                <div className="mt-1">client = OpenAI(</div>
                <div className="text-cyan-300 pl-4">base_url="http://localhost:4000/v1",</div>
                <div className="text-amber-300 pl-4">api_key="sk_live_your_key"</div>
                <div>)</div>
              </div>

              <p className="text-xs text-muted-foreground">
                Supports chat completions, streaming SSE chunks, tool calling, embeddings, and JSON schema constraints.
              </p>
            </div>

            {/* Async Batch Workloads Card */}
            <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Asynchronous Batch Inference</h3>
                    <p className="text-xs text-muted-foreground">Upload JSONL files for off-peak execution.</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  50% DISCOUNT
                </span>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <p>Run large-scale evaluation, data labeling, or embeddings in bulk with a 24-hour turnaround window at half the standard pricing.</p>
                <div className="p-3 rounded-xl bg-card border border-border/80 flex items-center justify-between font-mono">
                  <span>Batch Queue Status:</span>
                  <span className="text-emerald-400 font-semibold">Active & Accepting Jobs</span>
                </div>
              </div>

              <Link
                href="/dashboard/batches"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-primary hover:underline font-mono"
              >
                <span>Go to Batch Processing Workspace</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Custom LoRA Adapters Card */}
            <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Fine-Tuned LoRA Adapters</h3>
                  <p className="text-xs text-muted-foreground">Hot-swap custom weight deltas without dedicated GPUs.</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                YOYO attaches PEFT / LoRA adapters to active base models on-the-fly during inference using vLLM continuous batching multi-LoRA routing.
              </p>

              <Link
                href="/dashboard/fine-tuning"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-primary hover:underline font-mono"
              >
                <span>Manage Fine-Tuning & Weights</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Developer Webhooks & Async Notifications */}
            <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Webhook className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Event Webhooks & Alerts</h3>
                  <p className="text-xs text-muted-foreground">Receive real-time HTTP callbacks on batch completions.</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure webhook URLs to receive HMAC-SHA256 signed payloads whenever batch jobs finish, quota threshold alerts trigger, or fine-tuning models finish training.
              </p>

              <Link
                href="/dashboard/settings"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-primary hover:underline font-mono"
              >
                <span>Configure Webhook Endpoints</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LOCAL DOCKER ENGINE & MODEL PULLER                                 */}
      {/* ========================================================================= */}
      {activeTab === 'local' && (
        <div className="space-y-6">
          {/* Header & Status Card */}
          <div className="p-6 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <span>Local Docker AI Engine (Zero OpenAI Keys)</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                        localStatus?.online
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {localStatus?.online ? 'CONTAINER HEALTHY' : 'OFFLINE'}
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    Endpoint: <span className="text-zinc-300">{localStatus?.endpoint || 'http://localhost:11434'}</span> •
                    Weights Volume: <span className="text-cyan-400 font-bold">F:\My Project\YOYO\data\ollama</span> •
                    Installed Models: <span className="text-foreground font-bold">{localStatus?.totalModels ?? 0}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => loadLocalStatus()}
                disabled={localLoading}
                className="px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold flex items-center space-x-1.5 text-foreground transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${localLoading ? 'animate-spin text-primary' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>

          {/* Pull New Model Interactive Box */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-card/90 to-card/40 border border-border/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-foreground">Pull & Register New Local Model</h3>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                Pulls directly into Docker container mounted on drive F:\
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                placeholder="Enter Ollama model tag (e.g. phi3:mini, mistral:7b, tinyllama, starcoder2:3b)"
                value={pullModelTag}
                disabled={pulling}
                onChange={(e) => setPullModelTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !pulling && handlePullModel()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => handlePullModel()}
                disabled={pulling || !pullModelTag.trim()}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm shadow-cyan-600/30 shrink-0"
              >
                {pulling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Pulling Model...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Pull Model</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Model Preset Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-muted-foreground font-mono">Popular Models:</span>
              {[
                { tag: 'llama3.2:3b', desc: 'Llama 3.2 3B' },
                { tag: 'phi3:mini', desc: 'Phi-3 Mini 3.8B' },
                { tag: 'tinyllama', desc: 'TinyLlama 1.1B' },
                { tag: 'qwen2.5-coder:7b', desc: 'Qwen 2.5 Coder 7B' },
                { tag: 'mistral:7b', desc: 'Mistral 7B' },
                { tag: 'starcoder2:3b', desc: 'StarCoder2 3B' },
              ].map((p) => (
                <button
                  key={p.tag}
                  type="button"
                  disabled={pulling}
                  onClick={() => {
                    setPullModelTag(p.tag);
                    handlePullModel(p.tag);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-cyan-500/10 border border-border/80 hover:border-cyan-500/30 text-[11px] font-mono text-zinc-300 hover:text-cyan-400 transition-all flex items-center space-x-1"
                >
                  <span>+</span>
                  <span>{p.tag}</span>
                </button>
              ))}
            </div>

            {/* Live SSE Download Progress Meter */}
            {pulling && pullProgress && (
              <div className="p-4 rounded-xl bg-cyan-500/5 dark:bg-black/60 border border-cyan-500/30 space-y-2.5 animate-pulse">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-300">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{pullProgress.status}</span>
                  </div>
                  <span className="text-foreground font-bold">{pullProgress.percent ?? 0}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, pullProgress.percent || 10)}%` }}
                  />
                </div>
                {pullProgress.total && pullProgress.completed && (
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>
                      {Math.round(pullProgress.completed / (1024 * 1024))} MB /{' '}
                      {Math.round(pullProgress.total / (1024 * 1024))} MB
                    </span>
                    <span>Saving to F:\My Project\YOYO\data\ollama</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Installed Models Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>Installed Models on Disk (F:\ Drive)</span>
              </h3>
              <span className="text-xs text-muted-foreground font-mono">
                {localStatus?.installedModels?.length || 0} local weights ready
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(localStatus?.installedModels || []).map((m: any) => (
                <div
                  key={m.name}
                  className="p-5 rounded-2xl bg-card border border-border/80 flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        {m.family || 'LOCAL DOCKER'}
                      </span>
                      <span className="text-[11px] font-mono text-cyan-300 font-bold">
                        {m.sizeMb} MB
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-foreground group-hover:text-emerald-400 transition-colors font-mono">
                      {m.name}
                    </h4>

                    <div className="space-y-1 text-[11px] font-mono text-muted-foreground">
                      <div>Parameters: <span className="text-foreground">{m.parameterSize || 'N/A'}</span></div>
                      <div>Quantization: <span className="text-amber-400">{m.quantizationLevel || 'GGUF'}</span></div>
                      {m.digest && <div>Digest: <span className="text-zinc-400">{m.digest}</span></div>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTestModel(m.name);
                        setActiveTab('models');
                        info(`Selected ${m.name} for In-Dashboard API testing.`);
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center space-x-1 transition-all"
                    >
                      <Play className="w-3 h-3" />
                      <span>Test</span>
                    </button>
                    <button
                      onClick={() => handleDeleteModel(m.name)}
                      disabled={deletingModel === m.name}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-all"
                      title="Delete local weights"
                    >
                      {deletingModel === m.name ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Running Models in Memory / VRAM */}
          {localStatus?.runningModels && localStatus.runningModels.length > 0 && (
            <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Activity className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono">
                    Active Models Resident in Memory / VRAM
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Kept alive in GPU memory for instantaneous zero-latency inference
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {localStatus.runningModels.map((rm: any) => (
                  <div
                    key={rm.name}
                    className="p-3.5 rounded-xl bg-card/60 border border-border text-xs font-mono space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-foreground font-bold">
                      <span>{rm.name}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        HOT
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Context: <span className="text-zinc-200">{rm.contextLength} tokens</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Memory Allocated: <span className="text-cyan-400">{rm.sizeMb} MB</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE API KEY                                                     */}
      {/* ========================================================================= */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border/80 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-foreground">Provision New Developer API Key</h3>
              </div>
              <button
                onClick={() => setShowCreateKeyModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-4 text-xs">
              <div>
                <label className="text-muted-foreground font-mono block mb-1">
                  Key Description / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Agent, Staging Backend"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              {/* Rate Limits Presets */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-mono block">
                  Rate Limit Ceiling
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Standard', rpm: 60, tpm: 60000 },
                    { label: 'Burst', rpm: 300, tpm: 300000 },
                    { label: 'High Throughput', rpm: 1200, tpm: 1000000 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setRateLimitRpm(p.rpm);
                        setRateLimitTpm(p.tpm);
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        rateLimitRpm === p.rpm
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-600 dark:text-amber-400 font-bold'
                          : 'bg-card border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="font-bold text-[11px]">{p.label}</div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{p.rpm} RPM</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Access Scope */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-mono block">
                  Authorized Models
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModelScopeMode('all')}
                    className={`flex-1 py-2 rounded-xl border text-center font-mono text-xs ${
                      modelScopeMode === 'all'
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'bg-card border-border text-muted-foreground'
                    }`}
                  >
                    All Cloud Models (*)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModelScopeMode('restricted')}
                    className={`flex-1 py-2 rounded-xl border text-center font-mono text-xs ${
                      modelScopeMode === 'restricted'
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'bg-card border-border text-muted-foreground'
                    }`}
                  >
                    Restrict Specific Models
                  </button>
                </div>

                {modelScopeMode === 'restricted' && (
                  <div className="p-2.5 rounded-xl bg-muted/40 dark:bg-black/40 border border-border max-h-32 overflow-y-auto space-y-1.5">
                    {catalog.map((m) => {
                      const isSelected = selectedKeyModels.includes(m.apiIdentifier);
                      return (
                        <label
                          key={m.id || m.apiIdentifier}
                          className="flex items-center space-x-2 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedKeyModels(selectedKeyModels.filter((id) => id !== m.apiIdentifier));
                              } else {
                                setSelectedKeyModels([...selectedKeyModels, m.apiIdentifier]);
                              }
                            }}
                            className="rounded accent-amber-500"
                          />
                          <span>{m.name} ({m.apiIdentifier})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* IP Whitelist & Expiration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground font-mono block mb-1">
                    Allowed IPs (Default: *)
                  </label>
                  <input
                    type="text"
                    placeholder="* or 192.168.1.1, 10.0.0.0/24"
                    value={allowedIps}
                    onChange={(e) => setAllowedIps(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-foreground font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground font-mono block mb-1">
                    Expiration Period
                  </label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-foreground font-mono text-xs"
                  >
                    <option value={0}>Never Expire</option>
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowCreateKeyModal(false)}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingKey}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center space-x-1.5 transition-all disabled:opacity-50"
                >
                  {creatingKey ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Create Key</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REVOKE API KEY CONFIRMATION                                       */}
      {/* ========================================================================= */}
      {keyToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-foreground">Revoke API Key Authorization</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently revoke API key <strong className="text-foreground">"{keyToDelete.name}"</strong>? Any active microservices or workloads using this key will immediately receive HTTP 401 Unauthorized.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setKeyToDelete(null)}
                className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeKey}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
