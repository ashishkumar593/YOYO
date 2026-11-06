'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Lock,
  Layers,
  Sparkles,
  Zap,
  CheckSquare,
  Square,
  Globe,
  Terminal,
  Activity,
  Calendar,
  ExternalLink,
} from 'lucide-react';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [rateLimitRpm, setRateLimitRpm] = useState(60);
  const [rateLimitTpm, setRateLimitTpm] = useState(60000);
  const [expiresInDays, setExpiresInDays] = useState<number>(0); // 0 = never
  const [modelScopeMode, setModelScopeMode] = useState<'all' | 'restricted'>('all');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedMaskedId, setCopiedMaskedId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState('');
  const { success, error: toastError } = useToast();

  const loadData = async () => {
    try {
      const [keysData, modelsData] = await Promise.all([
        apiRequest('/api/keys'),
        apiRequest('/api/models/catalog'),
      ]);
      setKeys(keysData || []);
      setAvailableModels(modelsData || []);
    } catch (err: any) {
      console.error('Failed to load keys or models:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleModelSelection = (apiIdentifier: string) => {
    if (selectedModels.includes(apiIdentifier)) {
      setSelectedModels(selectedModels.filter((m) => m !== apiIdentifier));
    } else {
      setSelectedModels([...selectedModels, apiIdentifier]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (modelScopeMode === 'restricted' && selectedModels.length === 0) {
      setErrorText('Please select at least one model for restricted access, or choose All Models.');
      return;
    }

    try {
      const allowedModels = modelScopeMode === 'all' ? ['*'] : selectedModels;
      const expiresAt = expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null;

      const res = await apiRequest('/api/keys', {
        method: 'POST',
        body: JSON.stringify({
          name: keyName,
          rateLimitRpm,
          rateLimitTpm,
          allowedModels,
          expiresAt,
        }),
      });

      setCreatedSecret(res.plaintextKey);
      setKeyName('');
      setModelScopeMode('all');
      setSelectedModels([]);
      setExpiresInDays(0);
      success('API Key generated successfully.');
      await loadData();
    } catch (err: any) {
      setErrorText(err.message || 'Failed to create key.');
      toastError(err.message || 'Key generation failed.');
    }
  };

  const handleCopyMasked = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMaskedId(id);
    success('Masked key copied.');
    setTimeout(() => setCopiedMaskedId(null), 2000);
  };

  const handleRevoke = async (keyId: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently revoke "${name}"? Applications using this key will immediately receive HTTP 401.`
      )
    ) {
      return;
    }

    try {
      await apiRequest(`/api/keys/${keyId}`, { method: 'DELETE' });
      success(`API Key "${name}" revoked.`);
      await loadData();
    } catch (err: any) {
      toastError(err.message || 'Failed to revoke key.');
    }
  };

  const copySecret = () => {
    if (!createdSecret) return;
    navigator.clipboard.writeText(createdSecret);
    setCopiedKey(true);
    success('Secret copied to clipboard!');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight">API Key Management</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              SHA-256 HASHED
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage cryptographically secured secret keys with granular model scoping for YOYO endpoints.
          </p>
        </div>
        <button
          onClick={() => {
            setCreatedSecret(null);
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs flex items-center space-x-1.5 shadow-lg shadow-primary/20 transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create New API Key</span>
        </button>
      </div>

      {/* Security Advisory */}
      <div className="p-5 rounded-2xl bg-muted/40 border border-border flex items-start space-x-3.5 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Zero-Knowledge Storage Policy:</span> Full secrets are displayed once upon generation and never stored in plaintext. If lost, generate a new key and revoke the existing one.
        </div>
      </div>

      {/* Keys Table */}
      <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <span className="font-semibold text-sm">Active Secret Keys</span>
          <span className="text-xs text-muted-foreground font-mono">{keys.length} of 10 keys allocated</span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading active keys...</span>
          </div>
        ) : keys.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            <Key className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
            <p className="text-sm font-semibold text-foreground">No API keys generated yet.</p>
            <p className="text-xs mt-1 text-muted-foreground">Create a secret key to authenticate your SDKs and scripts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Secret Key (Masked)</th>
                  <th className="px-6 py-3.5">Model Scope</th>
                  <th className="px-6 py-3.5">Rate Limit</th>
                  <th className="px-6 py-3.5">Invocations</th>
                  <th className="px-6 py-3.5">Last Invoked</th>
                  <th className="px-6 py-3.5">Expires</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keys.map((k) => {
                  const allowed: string[] = Array.isArray(k.allowedModels) ? k.allowedModels : ['*'];
                  const isWildcard = allowed.includes('*');

                  return (
                    <tr key={k.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{k.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">ID: {k.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">
                        <div className="inline-flex items-center space-x-1.5 bg-muted/60 px-2.5 py-1 rounded-lg border border-border">
                          <span className="font-medium text-foreground">{k.maskedKey}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyMasked(k.id, k.maskedKey)}
                            title="Copy masked key identifier"
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                          >
                            {copiedMaskedId === k.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isWildcard ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            <Globe className="w-3 h-3" />
                            <span>All Models</span>
                          </span>
                        ) : (
                          <span
                            title={allowed.join(', ')}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold"
                          >
                            <Lock className="w-3 h-3" />
                            <span>{allowed.length} model{allowed.length > 1 ? 's' : ''}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">
                        <span className="text-foreground font-semibold">{k.rateLimitRpm}</span> RPM /{' '}
                        <span className="text-foreground font-semibold">{(k.rateLimitTpm / 1000).toFixed(0)}k</span> TPM
                      </td>
                      <td className="px-6 py-4 font-mono">
                        <div className="flex items-center space-x-1.5">
                          <Activity className={`w-3.5 h-3.5 ${k.totalRequests > 0 ? 'text-primary' : 'text-muted-foreground/50'}`} />
                          <span className="text-foreground font-semibold">
                            {(k.totalRequests || 0).toLocaleString()}
                          </span>
                          <span className="text-muted-foreground text-[10px]">reqs</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono text-[11px]">
                        {k.expiresAt ? (
                          <span className="inline-flex items-center space-x-1 text-amber-400">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(k.expiresAt).toLocaleDateString()}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Link
                            href={`/dashboard/logs?search=${encodeURIComponent(k.maskedKey)}`}
                            title={`Inspect live logs for ${k.name}`}
                            className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all flex items-center space-x-1"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-semibold hidden md:inline">Logs</span>
                          </Link>
                          <button
                            onClick={() => handleRevoke(k.id, k.name)}
                            title={`Revoke "${k.name}"`}
                            className="p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {!createdSecret ? (
              <>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-base">Generate API Key</h3>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>

                {errorText && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {errorText}
                  </div>
                )}

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Key Name / Description
                    </label>
                    <input
                      type="text"
                      required
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="e.g. Production Agent, Cursor IDE, LangChain Worker"
                      className="w-full px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-xs focus:border-primary focus:outline-none text-foreground font-medium"
                    />
                  </div>

                  {/* Model Permissions Scope */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Model Access Permissions
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setModelScopeMode('all')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          modelScopeMode === 'all'
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Globe className="w-4 h-4" />
                          <span className="text-xs font-bold">All Models (*)</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Key can call any active model in catalog
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModelScopeMode('restricted')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          modelScopeMode === 'restricted'
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Lock className="w-4 h-4" />
                          <span className="text-xs font-bold">Restricted Scope</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Limit key to select explicit model IDs
                        </p>
                      </button>
                    </div>

                    {modelScopeMode === 'restricted' && (
                      <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-2 max-h-40 overflow-y-auto">
                        <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                          Select Allowed Models ({selectedModels.length} selected):
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {availableModels.map((m) => {
                            const isChecked = selectedModels.includes(m.apiIdentifier);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => toggleModelSelection(m.apiIdentifier)}
                                className={`flex items-center justify-between p-2 rounded-lg border text-xs text-left transition-all ${
                                  isChecked
                                    ? 'border-primary/50 bg-primary/10 text-foreground font-semibold'
                                    : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <span className="font-mono text-[11px] truncate">{m.apiIdentifier}</span>
                                {isChecked ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rate Limits & Presets */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Rate Limit Tier Preset
                      </label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {rateLimitRpm} RPM &bull; {(rateLimitTpm / 1000).toFixed(0)}k TPM
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => { setRateLimitRpm(60); setRateLimitTpm(60000); }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          rateLimitRpm === 60 && rateLimitTpm === 60000
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="text-[11px] font-bold">Standard</div>
                        <div className="text-[9px] text-muted-foreground font-mono">60 RPM / 60k TPM</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRateLimitRpm(300); setRateLimitTpm(300000); }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          rateLimitRpm === 300 && rateLimitTpm === 300000
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="text-[11px] font-bold">Concurrency</div>
                        <div className="text-[9px] text-muted-foreground font-mono">300 RPM / 300k TPM</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRateLimitRpm(1000); setRateLimitTpm(2000000); }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          rateLimitRpm === 1000 && rateLimitTpm === 2000000
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="text-[11px] font-bold">Enterprise</div>
                        <div className="text-[9px] text-muted-foreground font-mono">1k RPM / 2M TPM</div>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Custom RPM
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="2000"
                          value={rateLimitRpm}
                          onChange={(e) => setRateLimitRpm(parseInt(e.target.value, 10) || 60)}
                          className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Custom TPM
                        </label>
                        <input
                          type="number"
                          min="10000"
                          max="20000000"
                          step="10000"
                          value={rateLimitTpm}
                          onChange={(e) => setRateLimitTpm(parseInt(e.target.value, 10) || 60000)}
                          className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expiration Settings */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Key Expiration
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Never', days: 0 },
                        { label: '30 Days', days: 30 },
                        { label: '90 Days', days: 90 },
                        { label: '1 Year', days: 365 },
                      ].map((exp) => (
                        <button
                          key={exp.days}
                          type="button"
                          onClick={() => setExpiresInDays(exp.days)}
                          className={`py-2 px-1 rounded-xl border text-center text-xs transition-all ${
                            expiresInDays === exp.days
                              ? 'border-primary bg-primary/10 text-primary font-bold'
                              : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {exp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-sm shadow-md shadow-primary/20 transition-all"
                  >
                    Generate Secret Key
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-lg">API Key Created</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Copy and store your secret key now. You will not be able to view it again.
                  </p>
                </div>

                <div className="p-3 bg-muted/70 rounded-xl border border-border flex items-center justify-between">
                  <code className="text-xs font-mono break-all text-primary font-bold pr-2">
                    {createdSecret}
                  </code>
                  <button
                    onClick={copySecret}
                    className="p-2.5 rounded-lg bg-primary text-primary-foreground font-semibold shrink-0 hover:bg-primary/90 transition-all text-xs flex items-center space-x-1"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>Instant cURL Verification:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const snippet = `curl https://api.yoyo.ai/v1/chat/completions \\\n  -H "Authorization: Bearer ${createdSecret}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "Hello YOYO"}], "max_tokens": 16}'`;
                        navigator.clipboard.writeText(snippet);
                        success('Verification cURL snippet copied!');
                      }}
                      className="text-primary hover:underline font-bold"
                    >
                      Copy Command
                    </button>
                  </div>
                  <pre className="p-3 bg-muted/30 rounded-xl border border-border text-[10px] font-mono text-foreground/90 overflow-x-auto whitespace-pre-wrap break-all select-all">
{`curl https://api.yoyo.ai/v1/chat/completions \\
  -H "Authorization: Bearer ${createdSecret}" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "Hello YOYO"}], "max_tokens": 16}'`}
                  </pre>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Keep this key confidential. If compromised, revoke it immediately from this console.
                  </span>
                </div>

                <button
                  onClick={() => {
                    setCreatedSecret(null);
                    setShowCreateModal(false);
                  }}
                  className="w-full py-3 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
