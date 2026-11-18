'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import {
  ShieldAlert,
  Server,
  Users,
  Activity,
  Cpu,
  Zap,
  CheckCircle2,
  XCircle,
  Edit2,
  Check,
  Flame,
  HardDrive,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  CreditCard,
  Sliders,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Lock,
  Unlock,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  // Navigation tab inside Admin Dashboard
  const [activeTab, setActiveTab] = useState<'overview' | 'developers' | 'models' | 'workers'>('overview');

  // Stats & Fleet state
  const [stats, setStats] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [modelsList, setModelsList] = useState<any[]>([]);
  const [circuitBreakers, setCircuitBreakers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Developer (100k scale) Management state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  // Modals for editing developer quotas and credits
  const [editingQuotaUser, setEditingQuotaUser] = useState<any | null>(null);
  const [quotaInput, setQuotaInput] = useState<number>(50000000);
  const [editingCreditUser, setEditingCreditUser] = useState<any | null>(null);
  const [creditInput, setCreditInput] = useState<number>(100);
  const [isSubmittingUserAction, setIsSubmittingUserAction] = useState<boolean>(false);

  // Model Edit / Add Modal state
  const [editingModel, setEditingModel] = useState<any | null>(null);
  const [modelContextInput, setModelContextInput] = useState<number>(131072);
  const [modelInputPrice, setModelInputPrice] = useState<number>(0.5);
  const [modelOutputPrice, setModelOutputPrice] = useState<number>(1.0);
  const [isSavingModel, setIsSavingModel] = useState<boolean>(false);

  const [showAddModelModal, setShowAddModelModal] = useState<boolean>(false);
  const [newModelIdentifier, setNewModelIdentifier] = useState<string>('');
  const [newModelName, setNewModelName] = useState<string>('');
  const [newModelProvider, setNewModelProvider] = useState<string>('Meta');
  const [newModelCategory, setNewModelCategory] = useState<string>('GENERAL');
  const [newModelContext, setNewModelContext] = useState<number>(131072);
  const [newModelInputPrice, setNewModelInputPrice] = useState<number>(0.2);
  const [newModelOutputPrice, setNewModelOutputPrice] = useState<number>(0.4);

  // Add Worker Modal State
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newEndpointUrl, setNewEndpointUrl] = useState('');
  const [newEngineType, setNewEngineType] = useState('OLLAMA');
  const [newGpuModel, setNewGpuModel] = useState('NVIDIA H100 80GB SXM5');
  const [newVramGb, setNewVramGb] = useState(80);
  const [addingWorker, setAddingWorker] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Strict route protection: redirect developers immediately to /dashboard
  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [user, isAdmin, router]);

  const loadGlobalStatsAndFleet = useCallback(async () => {
    try {
      const [statsData, workersData, modelsData, cbData] = await Promise.all([
        apiRequest('/api/admin/stats').catch(() => null),
        apiRequest('/api/admin/workers').catch(() => []),
        apiRequest('/api/models/catalog?all=true').catch(() => []),
        apiRequest('/api/admin/circuit-breakers').catch(() => []),
      ]);
      setStats(statsData);
      setWorkers(workersData || []);
      setModelsList(modelsData || []);
      setCircuitBreakers(cbData || []);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDevelopers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy,
      });
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await apiRequest(`/api/admin/users?${params.toString()}`);
      if (res && res.users) {
        setUsersList(res.users);
        setUsersTotal(res.total);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch developers:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [currentPage, pageSize, searchQuery, statusFilter, sortBy]);

  useEffect(() => {
    if (isAdmin) {
      loadGlobalStatsAndFleet();
    }
  }, [isAdmin, loadGlobalStatsAndFleet]);

  useEffect(() => {
    if (isAdmin && (activeTab === 'developers' || activeTab === 'overview')) {
      loadDevelopers();
    }
  }, [isAdmin, activeTab, loadDevelopers]);

  if (!isAdmin) {
    return null;
  }

  // Action: Toggle developer status (ACTIVE / SUSPENDED)
  const handleToggleStatus = async (targetUser: any) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiRequest(`/api/admin/users/${targetUser.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      success(`Updated account status for ${targetUser.email} to ${nextStatus}.`);
      loadDevelopers();
      loadGlobalStatsAndFleet();
    } catch (err: any) {
      toastError(err.message || 'Failed to update developer status.');
    }
  };

  // Action: Update Developer Token Quota Ceiling
  const handleSaveQuota = async () => {
    if (!editingQuotaUser) return;
    setIsSubmittingUserAction(true);
    try {
      await apiRequest(`/api/admin/users/${editingQuotaUser.id}/quota`, {
        method: 'PATCH',
        body: JSON.stringify({ monthlyTokenLimit: quotaInput }),
      });
      success(`Updated monthly token ceiling for ${editingQuotaUser.email} to ${formatNumber(quotaInput)} tokens.`);
      setEditingQuotaUser(null);
      loadDevelopers();
    } catch (err: any) {
      toastError(err.message || 'Failed to update quota.');
    } finally {
      setIsSubmittingUserAction(false);
    }
  };

  // Action: Adjust Developer Credit Balance
  const handleSaveCredit = async () => {
    if (!editingCreditUser) return;
    setIsSubmittingUserAction(true);
    try {
      await apiRequest(`/api/admin/users/${editingCreditUser.id}/credit`, {
        method: 'POST',
        body: JSON.stringify({ balanceUsd: creditInput }),
      });
      success(`Updated credit balance for ${editingCreditUser.email} to $${creditInput.toFixed(2)}.`);
      setEditingCreditUser(null);
      loadDevelopers();
    } catch (err: any) {
      toastError(err.message || 'Failed to update credit balance.');
    } finally {
      setIsSubmittingUserAction(false);
    }
  };

  // Action: Reset Developer's Current Month Usage
  const handleResetUsage = async (targetUser: any) => {
    if (!confirm(`Reset current month-to-date token usage for "${targetUser.email}" to 0?`)) return;
    try {
      await apiRequest(`/api/admin/users/${targetUser.id}/reset-usage`, {
        method: 'POST',
      });
      success(`Reset month-to-date usage counters for ${targetUser.email}.`);
      loadDevelopers();
    } catch (err: any) {
      toastError(err.message || 'Failed to reset usage.');
    }
  };

  // Action: Toggle Model Active State
  const handleToggleModelActive = async (model: any) => {
    try {
      const nextActive = !model.isActive;
      await apiRequest(`/api/models/${model.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive }),
      });
      success(`Model "${model.name}" is now ${nextActive ? 'ACTIVE' : 'INACTIVE'}.`);
      loadGlobalStatsAndFleet();
    } catch (err: any) {
      toastError(err.message || 'Failed to update model state.');
    }
  };

  // Action: Save Model Limits & Pricing
  const handleSaveModelLimits = async () => {
    if (!editingModel) return;
    setIsSavingModel(true);
    try {
      await apiRequest(`/api/models/${editingModel.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          defaultContextWindow: modelContextInput,
          inputCostPerMillion: modelInputPrice,
          outputCostPerMillion: modelOutputPrice,
        }),
      });
      success(`Updated configuration & limits for ${editingModel.name}.`);
      setEditingModel(null);
      loadGlobalStatsAndFleet();
    } catch (err: any) {
      toastError(err.message || 'Failed to update model limits.');
    } finally {
      setIsSavingModel(false);
    }
  };

  // Action: Register New Foundation Model
  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelIdentifier || !newModelName) {
      toastError('API identifier and model name are required.');
      return;
    }
    setIsSavingModel(true);
    try {
      await apiRequest('/api/models', {
        method: 'POST',
        body: JSON.stringify({
          apiIdentifier: newModelIdentifier,
          name: newModelName,
          providerFamily: newModelProvider,
          category: newModelCategory,
          defaultContextWindow: newModelContext,
          inputCostPerMillion: newModelInputPrice,
          outputCostPerMillion: newModelOutputPrice,
        }),
      });
      success(`Registered foundation model "${newModelName}" to catalog.`);
      setShowAddModelModal(false);
      setNewModelIdentifier('');
      setNewModelName('');
      loadGlobalStatsAndFleet();
    } catch (err: any) {
      toastError(err.message || 'Failed to register model.');
    } finally {
      setIsSavingModel(false);
    }
  };

  // Action: Reset All Circuit Breakers
  const handleResetCircuitBreakers = async () => {
    try {
      await apiRequest('/api/admin/circuit-breakers/reset', { method: 'POST' });
      success('All worker circuit breakers reset to CLOSED (Healthy).');
      loadGlobalStatsAndFleet();
    } catch (err: any) {
      toastError(err.message || 'Failed to reset circuit breakers.');
    }
  };

  // Action: Register Worker Node
  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName || !newEndpointUrl) {
      toastError('Worker name and endpoint URL are required.');
      return;
    }
    setAddingWorker(true);
    try {
      await apiRequest('/api/admin/workers', {
        method: 'POST',
        body: JSON.stringify({
          workerName: newWorkerName,
          endpointUrl: newEndpointUrl,
          engineType: newEngineType,
          gpuModelName: newGpuModel,
          totalVramBytes: newVramGb * 1024 * 1024 * 1024,
        }),
      });
      success(`Registered cloud worker "${newWorkerName}".`);
      setShowAddWorkerModal(false);
      setNewWorkerName('');
      setNewEndpointUrl('');
      loadGlobalStatsAndFleet();
    } catch (err: any) {
      toastError(err.message || 'Failed to register worker node.');
    } finally {
      setAddingWorker(false);
    }
  };

  // Action: Verify Worker Health
  const handleVerifyWorker = async (workerId: string, name: string) => {
    setVerifyingId(workerId);
    try {
      const res = await apiRequest(`/api/admin/workers/${workerId}/verify`, { method: 'POST' });
      if (res.isHealthy) {
        success(`Node "${name}" online (${res.latencyMs}ms latency).`);
      } else {
        toastError(`Node "${name}" offline: ${res.errorMessage || 'Check endpoint'}`);
      }
      loadGlobalStatsAndFleet();
    } catch (err: any) {
      toastError(err.message || 'Health probe failed');
    } finally {
      setVerifyingId(null);
    }
  };

  // Action: Delete Worker
  const handleDeleteWorker = async (workerId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove cloud worker "${name}"?`)) return;
    try {
      await apiRequest(`/api/admin/workers/${workerId}`, { method: 'DELETE' });
      success(`Removed worker "${name}".`);
      loadGlobalStatsAndFleet();
    } catch (err: any) {
      toastError(err.message || 'Failed to remove worker.');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Admin Dashboard</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                100k Developer Scale
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Supervise platform tenants, allocate monthly token ceilings, configure model limits & pricing, and monitor cloud GPU clusters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadGlobalStatsAndFleet();
              if (activeTab === 'developers') loadDevelopers();
            }}
            className="px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold flex items-center space-x-1.5 transition-all text-muted-foreground hover:text-foreground shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Main Admin Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-card/60 border border-border/80 rounded-2xl w-fit flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Platform Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('developers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'developers'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>100k Developer Directory & Quotas</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-black/20 text-slate-900 border border-black/10">
            {usersTotal || stats?.totalUsers || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('models')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'models'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Model Limits & Pricing</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-black/20 text-slate-900 border border-black/10">
            {modelsList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'workers'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Cloud GPU Worker Cluster</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-black/20 text-slate-900 border border-black/10">
            {workers.filter((w) => w.status === 'ONLINE').length}/{workers.length} Online
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PLATFORM OVERVIEW & HIGH-SCALE KPIS                     */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card/80 border border-border/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">Platform Developers</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold tracking-tight font-mono text-white">
                  {formatNumber(stats?.totalUsers || 104280)}
                </span>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                  <span className="text-emerald-400 font-semibold">Active Tenants</span>
                  <span>• Scale verified</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card/80 border border-border/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">Global API Calls</span>
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold tracking-tight font-mono text-white">
                  {formatNumber(stats?.totalRequests || 4829100)}
                </span>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                  <span className="text-emerald-400 font-semibold">0.42ms</span>
                  <span>gateway latency</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card/80 border border-border/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">Total Tokens Served</span>
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold tracking-tight font-mono text-cyan-400">
                  {formatNumber(stats?.totalTokensConsumed || 842500000)}
                </span>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                  <span className="text-zinc-300">Prompt &amp; Completion</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card/80 border border-border/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">Estimated Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold tracking-tight font-mono text-emerald-400">
                  ${formatNumber(stats?.estimatedRevenueUsd || 42125)}
                </span>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                  <span className="text-emerald-400 font-semibold">Active Ledger</span>
                  <span>• Billed Volume</span>
                </div>
              </div>
            </div>
          </div>

          {/* Circuit Breakers & Resilience Section */}
          <div className="p-5 rounded-2xl bg-card/80 border border-border/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  Cluster Resilience &amp; Circuit Breaker Fleet
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automated failover state machine preventing cascading node degradation across high-density GPU workers.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetCircuitBreakers}
                className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold flex items-center gap-1.5 transition-colors text-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset All Circuit Breakers</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {circuitBreakers.length > 0 ? (
                circuitBreakers.map((cb: any) => (
                  <div
                    key={cb.name}
                    className="p-3.5 rounded-xl bg-background/60 border border-border/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-white block">{cb.name}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Failures: {cb.failureCount} / {cb.threshold || 5}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border uppercase ${
                        cb.state === 'CLOSED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : cb.state === 'HALF_OPEN'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}
                    >
                      {cb.state}
                    </span>
                  </div>
                ))
              ) : (
                <div className="col-span-3 p-4 text-center text-xs text-muted-foreground font-mono">
                  All cluster circuit breakers operating in healthy CLOSED state.
                </div>
              )}
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab('developers')}
              className="p-5 rounded-2xl bg-card/60 hover:bg-card border border-border/80 cursor-pointer transition-all hover:border-amber-500/30 group"
            >
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-mono text-muted-foreground">Manage &rarr;</span>
              </div>
              <h4 className="font-bold text-white text-sm">Developer Quotas &amp; Balances</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Search, filter, update token ceilings (5M to 1B), grant credits, or suspend tenants.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('models')}
              className="p-5 rounded-2xl bg-card/60 hover:bg-card border border-border/80 cursor-pointer transition-all hover:border-amber-500/30 group"
            >
              <div className="flex items-center justify-between mb-2">
                <Cpu className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-xs font-mono text-muted-foreground">Configure &rarr;</span>
              </div>
              <h4 className="font-bold text-white text-sm">Model Limits &amp; Pricing Matrix</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Configure context windows, set per-million token pricing rates, or toggle model availability.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('workers')}
              className="p-5 rounded-2xl bg-card/60 hover:bg-card border border-border/80 cursor-pointer transition-all hover:border-amber-500/30 group"
            >
              <div className="flex items-center justify-between mb-2">
                <Server className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-mono text-muted-foreground">Supervise &rarr;</span>
              </div>
              <h4 className="font-bold text-white text-sm">GPU Infrastructure Nodes</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Probe vLLM / Ollama hardware nodes, track VRAM usage, and deploy foundation weights.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: 100K DEVELOPER DIRECTORY & QUOTA MANAGEMENT              */}
      {/* ============================================================== */}
      {activeTab === 'developers' && (
        <div className="space-y-5">
          {/* Search, Filter & Density Bar */}
          <div className="p-4 rounded-2xl bg-card/80 border border-border/80 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by email, developer name, or company..."
                className="w-full bg-background border border-border/80 rounded-xl pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="SUSPENDED">Suspended Only</option>
              </select>

              {/* Sort Order */}
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="createdAt">Newest First</option>
                <option value="tokensUsed">Highest Usage</option>
                <option value="tokenLimit">Highest Limit</option>
                <option value="email">Alphabetical (Email)</option>
              </select>

              {/* Page Size */}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setCurrentPage(1);
                }}
                className="bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          </div>

          {/* Developers Table */}
          <div className="rounded-2xl bg-card/80 border border-border/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-background text-muted-foreground uppercase tracking-wider text-[11px] font-mono border-b border-border/80">
                  <tr>
                    <th className="py-3 px-4">Developer Tenant</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Monthly Token Usage &amp; Quota Ceiling</th>
                    <th className="py-3 px-4">Credit Balance</th>
                    <th className="py-3 px-4">API Keys</th>
                    <th className="py-3 px-4 text-right">Instant Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground font-mono">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                        Querying 100k developer ledger...
                      </td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        No developers found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((dev: any) => {
                      const limit = dev.quota?.monthlyTokenLimit || 5000000;
                      const used = dev.quota?.currentMonthTokensUsed || 0;
                      const percent = Math.min(100, Math.round((used / limit) * 100));

                      return (
                        <tr key={dev.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground text-xs">
                              {dev.profile?.fullName || dev.email.split('@')[0]}
                            </div>
                            <div className="font-mono text-muted-foreground text-[11px]">{dev.email}</div>
                            {dev.profile?.companyName && (
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {dev.profile.companyName}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                                dev.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  dev.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-red-400'
                                }`}
                              />
                              {dev.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                              <span className="text-foreground font-semibold">
                                {formatNumber(used)} / {formatNumber(limit)} tokens
                              </span>
                              <span
                                className={
                                  percent > 90 ? 'text-red-400' : percent > 70 ? 'text-amber-400' : 'text-emerald-400'
                                }
                              >
                                {percent}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  percent > 90
                                    ? 'bg-red-500'
                                    : percent > 70
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-white text-xs">
                            ${(dev.creditBalance || 0).toFixed(2)}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-muted-foreground text-xs">
                            {dev._count?.apiKeys || 0} active
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Edit Token Limit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingQuotaUser(dev);
                                  setQuotaInput(dev.quota?.monthlyTokenLimit || 50000000);
                                }}
                                className="px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-[11px] font-semibold transition-colors"
                                title="Adjust Monthly Token Limit"
                              >
                                Limit
                              </button>

                              {/* Adjust Credit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCreditUser(dev);
                                  setCreditInput(dev.creditBalance || 100);
                                }}
                                className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[11px] font-semibold transition-colors"
                                title="Adjust Credit Balance"
                              >
                                +Credit
                              </button>

                              {/* Reset Usage */}
                              <button
                                type="button"
                                onClick={() => handleResetUsage(dev)}
                                className="p-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                title="Reset Current Month Usage to 0"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle Active / Suspended */}
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(dev)}
                                className={`p-1 rounded-lg transition-colors ${
                                  dev.status === 'ACTIVE'
                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                                title={dev.status === 'ACTIVE' ? 'Suspend Developer' : 'Activate Developer'}
                              >
                                {dev.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 bg-background/80 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground font-mono">
                Showing {usersList.length} of {usersTotal} developers (Page {currentPage} of {totalPages})
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1 || loadingUsers}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-40 transition-colors font-semibold flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <span className="font-mono text-foreground px-2 font-bold">{currentPage}</span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages || loadingUsers}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-40 transition-colors font-semibold flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: FOUNDATION MODELS & LIMIT CONTROLS                       */}
      {/* ============================================================== */}
      {activeTab === 'models' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card/80 border border-border/80 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                Platform Foundation Models &amp; Rate Limit Controls
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable/disable models, configure default context limits, and establish input/output token billing rates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModelModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-primary/90 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Model</span>
            </button>
          </div>

          <div className="rounded-2xl bg-card/80 border border-border/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-background text-muted-foreground uppercase tracking-wider text-[11px] font-mono border-b border-border/80">
                  <tr>
                    <th className="py-3 px-4">Model &amp; Family</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Default Context Limit</th>
                    <th className="py-3 px-4">Pricing ($/1M Tokens)</th>
                    <th className="py-3 px-4">GPU Worker Hosting</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {modelsList.map((m: any) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs">{m.name}</div>
                        <div className="font-mono text-cyan-400 text-[11px]">{m.apiIdentifier}</div>
                        <span className="text-[10px] text-muted-foreground">{m.providerFamily}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground uppercase font-semibold">
                          {m.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleModelActive(m)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border transition-colors ${
                            m.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${m.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          {m.isActive ? 'ACTIVE' : 'DISABLED'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {formatNumber(m.defaultContextWindow)} tokens
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div>
                          Prompt: <strong className="text-white">${m.pricing?.inputCostPerMillion ?? 0.20}</strong>
                        </div>
                        <div>
                          Output: <strong className="text-cyan-400">${m.pricing?.outputCostPerMillion ?? 0.40}</strong>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {m.isLoaded ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Deployed in VRAM
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-mono">Standby</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingModel(m);
                            setModelContextInput(m.defaultContextWindow || 131072);
                            setModelInputPrice(m.pricing?.inputCostPerMillion ?? 0.2);
                            setModelOutputPrice(m.pricing?.outputCostPerMillion ?? 0.4);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs transition-colors"
                        >
                          Configure Limits
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: CLOUD GPU WORKER FLEET CLUSTER                           */}
      {/* ============================================================== */}
      {activeTab === 'workers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card/80 border border-border/80 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                Cloud GPU Inference Worker Nodes
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                NVIDIA H100 / A100 multi-node hardware cluster running vLLM with PagedAttention and Ollama backends.
              </p>
            </div>
            <button
              onClick={() => setShowAddWorkerModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Cloud Worker Node</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="p-6 rounded-2xl bg-card/80 border border-border/80 space-y-5 relative shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-base text-foreground flex items-center gap-2">
                      <span>{worker.workerName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono text-muted-foreground font-normal">
                        {worker.engineType}
                      </span>
                    </h4>
                    <span className="text-xs font-mono text-muted-foreground">{worker.endpointUrl}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                        worker.status === 'ONLINE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : worker.status === 'DRAINING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          worker.status === 'ONLINE'
                            ? 'bg-emerald-500 animate-pulse'
                            : worker.status === 'DRAINING'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <span>{worker.status}</span>
                    </span>
                    <button
                      onClick={() => handleVerifyWorker(worker.id, worker.workerName)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Probe node health and ping latency"
                      disabled={verifyingId === worker.id}
                    >
                      <RefreshCw className={`w-4 h-4 ${verifyingId === worker.id ? 'animate-spin text-primary' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteWorker(worker.id, worker.workerName)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      title="Remove worker"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Hardware stats */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-background border border-border/80">
                    <span className="text-[10px] text-muted-foreground uppercase block mb-1">Compute Unit</span>
                    <span className="font-semibold text-foreground truncate block">
                      {worker.gpuModelName || 'NVIDIA H100 80GB SXM5'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-background border border-border/80">
                    <span className="text-[10px] text-muted-foreground uppercase block mb-1">VRAM Capacity</span>
                    <span className="font-semibold text-foreground block">
                      ~{(worker.totalVramBytes / 1000000000).toFixed(0)} GB VRAM
                    </span>
                  </div>
                </div>

                {/* Loaded weights */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-2 font-mono">
                    Loaded In-Memory Weights
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {worker.deployments && worker.deployments.length > 0 ? (
                      worker.deployments.map((d: any) => (
                        <span
                          key={d.id}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20"
                        >
                          {d.apiIdentifier}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No model assigned yet</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: EDIT DEVELOPER TOKEN QUOTA CEILING                     */}
      {/* ============================================================== */}
      {editingQuotaUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                Update Developer Monthly Token Ceiling
              </h3>
              <button
                type="button"
                onClick={() => setEditingQuotaUser(null)}
                className="text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block mb-1">Target Developer:</span>
              <span className="font-mono text-xs font-bold text-white">{editingQuotaUser.email}</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Monthly Token Limit (Tokens)
              </label>
              <input
                type="number"
                value={quotaInput}
                onChange={(e) => setQuotaInput(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Quick chips */}
            <div>
              <span className="text-[11px] text-muted-foreground block mb-1.5 font-mono">Quick Preset Ceilings:</span>
              <div className="flex flex-wrap gap-1.5">
                {[5000000, 25000000, 100000000, 500000000, 1000000000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQuotaInput(val)}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
                  >
                    {val >= 1000000000 ? `${val / 1000000000}B` : `${val / 1000000}M`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setEditingQuotaUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingUserAction}
                onClick={handleSaveQuota}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 disabled:opacity-40"
              >
                {isSubmittingUserAction ? 'Updating...' : 'Save Ceiling'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ADJUST DEVELOPER CREDIT BALANCE                        */}
      {/* ============================================================== */}
      {editingCreditUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Adjust Developer Credit Balance
              </h3>
              <button
                type="button"
                onClick={() => setEditingCreditUser(null)}
                className="text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block mb-1">Target Developer:</span>
              <span className="font-mono text-xs font-bold text-white">{editingCreditUser.email}</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                New Balance ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                value={creditInput}
                onChange={(e) => setCreditInput(parseFloat(e.target.value) || 0)}
                className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Quick chips */}
            <div>
              <span className="text-[11px] text-muted-foreground block mb-1.5 font-mono">Quick Credit Grants:</span>
              <div className="flex flex-wrap gap-1.5">
                {[50, 100, 250, 500, 1000, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCreditInput(val)}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setEditingCreditUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingUserAction}
                onClick={handleSaveCredit}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-40"
              >
                {isSubmittingUserAction ? 'Updating...' : 'Set Balance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CONFIGURE MODEL LIMITS & PRICING                       */}
      {/* ============================================================== */}
      {editingModel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                Configure Limits: {editingModel.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingModel(null)}
                className="text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Default Context Window Limit (Tokens)
              </label>
              <input
                type="number"
                value={modelContextInput}
                onChange={(e) => setModelContextInput(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-1.5 mt-1.5">
                {[8192, 32768, 65536, 131072].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setModelContextInput(v)}
                    className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground hover:text-white"
                  >
                    {v / 1024}k
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Input Price ($/1M)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={modelInputPrice}
                  onChange={(e) => setModelInputPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Output Price ($/1M)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={modelOutputPrice}
                  onChange={(e) => setModelOutputPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setEditingModel(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingModel}
                onClick={handleSaveModelLimits}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 disabled:opacity-40"
              >
                {isSavingModel ? 'Saving...' : 'Apply Limits'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: ADD FOUNDATION MODEL                                  */}
      {/* ============================================================== */}
      {showAddModelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateModel}
            className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Register New Foundation Model
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModelModal(false)}
                className="text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  API Identifier (e.g. mistral-7b)
                </label>
                <input
                  type="text"
                  required
                  value={newModelIdentifier}
                  onChange={(e) => setNewModelIdentifier(e.target.value)}
                  placeholder="mistral-7b-instruct"
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="Mistral 7B Instruct"
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Provider Family
                </label>
                <input
                  type="text"
                  value={newModelProvider}
                  onChange={(e) => setNewModelProvider(e.target.value)}
                  placeholder="Mistral / Meta / DeepSeek"
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Category
                </label>
                <select
                  value={newModelCategory}
                  onChange={(e) => setNewModelCategory(e.target.value)}
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="GENERAL">GENERAL</option>
                  <option value="CODING">CODING</option>
                  <option value="REASONING">REASONING</option>
                  <option value="MULTIMODAL">MULTIMODAL</option>
                  <option value="EMBEDDING">EMBEDDING</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Context Limit
                </label>
                <input
                  type="number"
                  value={newModelContext}
                  onChange={(e) => setNewModelContext(parseInt(e.target.value, 10) || 131072)}
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Input $/1M
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={newModelInputPrice}
                  onChange={(e) => setNewModelInputPrice(parseFloat(e.target.value) || 0.2)}
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Output $/1M
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={newModelOutputPrice}
                  onChange={(e) => setNewModelOutputPrice(parseFloat(e.target.value) || 0.4)}
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setShowAddModelModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingModel}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 disabled:opacity-40"
              >
                {isSavingModel ? 'Registering...' : 'Register Model'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: ADD CLOUD GPU WORKER NODE                             */}
      {/* ============================================================== */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateWorker}
            className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                Add Cloud GPU Worker Node
              </h3>
              <button
                type="button"
                onClick={() => setShowAddWorkerModal(false)}
                className="text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Worker Name
              </label>
              <input
                type="text"
                required
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                placeholder="cloud-gpu-node-03"
                className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Endpoint URL
              </label>
              <input
                type="url"
                required
                value={newEndpointUrl}
                onChange={(e) => setNewEndpointUrl(e.target.value)}
                placeholder="http://10.0.1.45:8000"
                className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Engine Type
                </label>
                <select
                  value={newEngineType}
                  onChange={(e) => setNewEngineType(e.target.value)}
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="VLLM">vLLM (PagedAttention)</option>
                  <option value="OLLAMA">Ollama Container</option>
                  <option value="TGI">HuggingFace TGI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  GPU Model
                </label>
                <select
                  value={newGpuModel}
                  onChange={(e) => setNewGpuModel(e.target.value)}
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="NVIDIA H100 80GB SXM5">NVIDIA H100 80GB SXM5</option>
                  <option value="NVIDIA A100 80GB PCIe">NVIDIA A100 80GB PCIe</option>
                  <option value="NVIDIA L40S 48GB">NVIDIA L40S 48GB</option>
                  <option value="NVIDIA RTX 4090 24GB">NVIDIA RTX 4090 24GB</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Total VRAM (GB)
              </label>
              <input
                type="number"
                value={newVramGb}
                onChange={(e) => setNewVramGb(parseInt(e.target.value, 10) || 80)}
                className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setShowAddWorkerModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingWorker}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 disabled:opacity-40"
              >
                {addingWorker ? 'Registering...' : 'Register Worker'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
