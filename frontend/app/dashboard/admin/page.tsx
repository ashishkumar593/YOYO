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
      success(`User ${targetUser.email} is now ${nextStatus}.`);
      await loadAdminData();
    } catch (err: any) {
      toastError(err.message || 'Status update failed.');
    }
  };

  const handleUpdateQuota = async (userId: string) => {
    try {
      await apiRequest(`/api/admin/users/${userId}/quota`, {
        method: 'PATCH',
        body: JSON.stringify({ monthlyTokenLimit: newLimit }),
      });
      setEditingUserId(null);
      success('User quota ceiling updated.');
      await loadAdminData();
    } catch (err: any) {
      toastError(err.message || 'Quota update failed.');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center font-bold shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-6 h-6" />
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
            <span className="font-semibold text-sm">GPU Inference Worker Nodes</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{workers.length} nodes connected</span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className="p-6 rounded-2xl bg-muted/30 border border-border space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-base text-foreground">{worker.workerName}</h4>
                  <span className="text-xs font-mono text-muted-foreground">{worker.endpointUrl}</span>
                </div>
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{worker.status}</span>
                </span>
              </div>

              {/* Hardware stats */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">Compute Unit</span>
                  <span className="font-semibold text-foreground truncate block">
                    {worker.gpuModelName || 'NVIDIA RTX 4090'}
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
                  {worker.deployments?.map((d: any) => (
                    <span
                      key={d.id}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20"
                    >
                      {d.apiIdentifier}
                    </span>
                  ))}
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
    </div>
  );
}
