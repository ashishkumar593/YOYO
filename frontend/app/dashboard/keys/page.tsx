'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [rateLimitRpm, setRateLimitRpm] = useState(60);
  const [rateLimitTpm, setRateLimitTpm] = useState(60000);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [errorText, setErrorText] = useState('');
  const { success, error: toastError, info } = useToast();

  const loadKeys = async () => {
    try {
      const data = await apiRequest('/api/keys');
      setKeys(data || []);
    } catch (err: any) {
      console.error('Failed to load keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    try {
      const res = await apiRequest('/api/keys', {
        method: 'POST',
        body: JSON.stringify({
          name: keyName,
          rateLimitRpm,
          rateLimitTpm,
        }),
      });

      setCreatedSecret(res.plaintextKey);
      setKeyName('');
      success('API Key generated successfully.');
      await loadKeys();
    } catch (err: any) {
      setErrorText(err.message || 'Failed to create key.');
      toastError(err.message || 'Key generation failed.');
    }
  };

  const handleRevoke = async (keyId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently revoke "${name}"? Applications using this key will immediately receive HTTP 401.`)) {
      return;
    }

    try {
      await apiRequest(`/api/keys/${keyId}`, { method: 'DELETE' });
      success(`API Key "${name}" revoked.`);
      await loadKeys();
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
            Create and manage cryptographically secured secret keys for calling YOYO endpoints.
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
                  <th className="px-6 py-3.5">Rate Limit</th>
                  <th className="px-6 py-3.5">Last Invoked</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Revoke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground">{k.name}</td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">
                      <span className="bg-muted px-2.5 py-1 rounded-lg border border-border font-medium">
                        {k.maskedKey}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">
                      <span className="text-foreground font-semibold">{k.rateLimitRpm}</span> RPM /{' '}
                      <span className="text-foreground font-semibold">{(k.rateLimitTpm / 1000).toFixed(0)}k</span> TPM
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRevoke(k.id, k.name)}
                        title="Revoke key"
                        className="p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
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

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 space-y-5">
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
                      placeholder="e.g. Production Agent, Cursor IDE"
                      className="w-full px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-sm focus:border-primary focus:outline-none text-foreground font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        RPM Limit
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="1000"
                        value={rateLimitRpm}
                        onChange={(e) => setRateLimitRpm(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        TPM Limit
                      </label>
                      <input
                        type="number"
                        min="10000"
                        max="1000000"
                        step="10000"
                        value={rateLimitTpm}
                        onChange={(e) => setRateLimitTpm(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-sm shadow-md shadow-primary/20"
                  >
                    Create Secret Key
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-lg">API Key Ready</h3>
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
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
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
