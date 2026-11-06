'use client';

import React, { useEffect, useState } from 'react';
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
  Globe,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export default function SuperAdminPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState<number>(5000000);
  const [loading, setLoading] = useState(true);

  // Add Worker Modal State
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newEndpointUrl, setNewEndpointUrl] = useState('');
  const [newEngineType, setNewEngineType] = useState('OLLAMA');
  const [newGpuModel, setNewGpuModel] = useState('NVIDIA H100 80GB SXM5');
  const [newVramGb, setNewVramGb] = useState(80);
  const [addingWorker, setAddingWorker] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const loadAdminData = async () => {
    try {
      const [statsData, workersData, usersData] = await Promise.all([
        apiRequest('/api/admin/stats').catch(() => null),
        apiRequest('/api/admin/workers').catch(() => []),
        apiRequest('/api/admin/users?limit=20').catch(() => ({ users: [] })),
      ]);
      setStats(statsData);
      setWorkers(workersData || []);
      setUsersList(usersData?.users || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-xs max-w-sm mt-1">Super Admin privileges required to supervise infrastructure nodes.</p>
      </div>
    );
  }

  const handleToggleStatus = async (targetUser: any) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiRequest(`/api/admin/users/${targetUser.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      success(`Updated status for ${targetUser.email} to ${nextStatus}.`);
      loadAdminData();
    } catch (err: any) {
      toastError(err.message || 'Failed to update user status.');
    }
  };

  const handleUpdateQuota = async (userId: string) => {
    try {
      await apiRequest(`/api/admin/users/${userId}/quota`, {
        method: 'PATCH',
        body: JSON.stringify({ monthlyTokenLimit: newLimit }),
      });
      success('Updated monthly token ceiling.');
      setEditingUserId(null);
      loadAdminData();
    } catch (err: any) {
      toastError(err.message || 'Failed to update quota.');
    }
  };

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
      loadAdminData();
    } catch (err: any) {
      toastError(err.message || 'Failed to register worker node.');
    } finally {
      setAddingWorker(false);
    }
  };

  const handleDeleteWorker = async (workerId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove cloud worker "${name}"?`)) return;

    try {
      await apiRequest(`/api/admin/workers/${workerId}`, {
        method: 'DELETE',
      });
      success(`Removed worker "${name}".`);
      loadAdminData();
    } catch (err: any) {
      toastError(err.message || 'Failed to remove worker node.');
    }
  };

  const handleVerifyWorker = async (workerId: string, name: string) => {
    setVerifyingId(workerId);
    try {
      const res = await apiRequest(`/api/admin/workers/${workerId}/verify`, {
        method: 'POST',
      });
      if (res.isHealthy) {
        success(`Node "${name}" verified online (${res.latencyMs}ms latency).`);
      } else {
        toastError(`Node "${name}" unreachable: ${res.errorMessage || 'Check endpoint'}`);
      }
      loadAdminData();
    } catch (err: any) {
      toastError(err.message || 'Health check failed');
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight">Super Admin Control Center</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold uppercase">
                Cluster Superuser
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live GPU cluster operations, inference workers health, and tenant quota controls.
            </p>
          </div>
        </div>

        <button
          onClick={loadAdminData}
          className="px-4 py-2 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold flex items-center space-x-1.5 transition-all text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Global Cluster Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-6 rounded-3xl bg-card border border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform Tenants</span>
          <div className="mt-3 text-3xl font-black font-mono text-foreground">{stats?.totalUsers || 0}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Active registered developers</span>
        </div>

        <div className="p-6 rounded-3xl bg-card border border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Global API Calls</span>
          <div className="mt-3 text-3xl font-black font-mono text-foreground">{formatNumber(stats?.totalRequests || 0)}</div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Delivered across all workers</span>
        </div>

        <div className="p-6 rounded-3xl bg-card border border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Tokens Served</span>
          <div className="mt-3 text-3xl font-black font-mono text-primary">
            {formatNumber(stats?.totalTokensConsumed || 0)}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Cumulative inference tokens</span>
        </div>

        <div className="p-6 rounded-3xl bg-card border border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Keys</span>
          <div className="mt-3 text-3xl font-black font-mono text-indigo-400">{stats?.activeApiKeys || 0}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Live authentication digests</span>
        </div>
      </div>

      {/* GPU Worker Pool Hardware Visualizer */}
      <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Cloud GPU Inference Worker Nodes</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">{workers.length} nodes active</span>
            <button
              onClick={() => setShowAddWorkerModal(true)}
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Cloud Worker</span>
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className="p-6 rounded-2xl bg-muted/30 border border-border space-y-5 relative group"
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
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">Compute Unit</span>
                  <span className="font-semibold text-foreground truncate block">
                    {worker.gpuModelName || 'NVIDIA H100 80GB SXM5'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">VRAM Capacity</span>
                  <span className="font-semibold text-foreground block">
                    ~{(worker.totalVramBytes / 1000000000).toFixed(0)} GB VRAM
                  </span>
                </div>
              </div>

              {/* Loaded weights */}
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-2">
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

      {/* Tenant / User Quotas Table */}
      <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Tenant Management & Quota Limits</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-3.5">Developer</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Token Ceiling / Used</th>
                <th className="px-6 py-3.5">Keys / Calls</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{u.profile?.fullName || 'Developer'}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-muted text-muted-foreground">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{u.status}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 font-mono">
                    {editingUserId === u.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={newLimit}
                          onChange={(e) => setNewLimit(parseInt(e.target.value, 10))}
                          className="w-28 px-2 py-1 rounded bg-muted border border-border text-xs text-foreground"
                        />
                        <button
                          onClick={() => handleUpdateQuota(u.id)}
                          className="p-1 rounded bg-primary text-primary-foreground text-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>
                          {formatNumber(u.quota?.currentMonthTokensUsed || 0)} /{' '}
                          <span className="font-bold text-foreground">
                            {formatNumber(u.quota?.monthlyTokenLimit || 5000000)}
                          </span>
                        </span>
                        <button
                          onClick={() => {
                            setEditingUserId(u.id);
                            setNewLimit(u.quota?.monthlyTokenLimit || 5000000);
                          }}
                          className="text-muted-foreground hover:text-foreground p-1"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-muted-foreground">
                    {u._count?.apiKeys || 0} keys / {u._count?.apiRequests || 0} calls
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                    >
                      {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Worker Modal */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Connect Cloud GPU Worker</h3>
              </div>
              <button
                onClick={() => setShowAddWorkerModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Worker Node Name</label>
                <input
                  type="text"
                  placeholder="e.g. runpod-h100-node-01"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Worker Endpoint URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://xxx-11434.proxy.runpod.net or http://10.0.0.5:11434"
                  value={newEndpointUrl}
                  onChange={(e) => setNewEndpointUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Inference Engine</label>
                  <select
                    value={newEngineType}
                    onChange={(e) => setNewEngineType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-muted/60 border border-border text-foreground font-mono"
                  >
                    <option value="OLLAMA">Ollama</option>
                    <option value="VLLM">vLLM</option>
                    <option value="LLAMA_CPP">llama.cpp</option>
                    <option value="TGI">HuggingFace TGI</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">VRAM Capacity (GB)</label>
                  <input
                    type="number"
                    value={newVramGb}
                    onChange={(e) => setNewVramGb(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-muted/60 border border-border text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">GPU Model Specification</label>
                <input
                  type="text"
                  placeholder="e.g. NVIDIA H100 80GB SXM5"
                  value={newGpuModel}
                  onChange={(e) => setNewGpuModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-foreground font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingWorker}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/25 disabled:opacity-50"
                >
                  {addingWorker ? 'Connecting...' : 'Connect Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
