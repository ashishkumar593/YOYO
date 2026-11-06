'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import {
  User,
  Shield,
  Key,
  Bell,
  Smartphone,
  Trash2,
  Check,
  AlertTriangle,
  Lock,
  Building,
  Mail,
  LogOut,
  Save,
  Webhook,
  Send,
  Copy,
  Eye,
  EyeOff,
  Plus,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'sessions' | 'notifications' | 'webhooks'>('profile');

  // Profile State
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Notifications State
  const [usageAlerts, setUsageAlerts] = useState(true);
  const [rateLimitAlerts, setRateLimitAlerts] = useState(true);

  // Webhooks State
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookDesc, setWebhookDesc] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['*']);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<{ [id: string]: boolean }>({});
  const [testingPingId, setTestingPingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.profile) {
      setFullName(user.profile.fullName || '');
      setCompanyName(user.profile.companyName || '');
    }
  }, [user]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await apiRequest('/api/auth/sessions');
      setSessions(data || []);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadWebhooks = async () => {
    setLoadingWebhooks(true);
    try {
      const data = await apiRequest('/api/webhooks');
      setWebhooks(data || []);
    } catch (err: any) {
      console.error('Failed to load webhooks:', err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') {
      loadSessions();
    } else if (activeTab === 'webhooks') {
      loadWebhooks();
    }
  }, [activeTab]);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.startsWith('http://') && !webhookUrl.startsWith('https://')) {
      toastError('URL must start with https:// or http://');
      return;
    }
    setCreatingWebhook(true);
    try {
      await apiRequest('/api/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          url: webhookUrl.trim(),
          description: webhookDesc.trim() || undefined,
          events: webhookEvents,
        }),
      });
      success('Webhook endpoint created with HMAC secret!');
      setWebhookUrl('');
      setWebhookDesc('');
      setWebhookEvents(['*']);
      loadWebhooks();
    } catch (err: any) {
      toastError(err.message || 'Failed to create webhook endpoint.');
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await apiRequest(`/api/webhooks/${id}`, { method: 'DELETE' });
      success('Webhook endpoint deleted.');
      loadWebhooks();
    } catch (err: any) {
      toastError(err.message || 'Failed to delete webhook.');
    }
  };

  const handleTestPing = async (id: string) => {
    setTestingPingId(id);
    try {
      const res = await apiRequest(`/api/webhooks/${id}/test`, { method: 'POST' });
      if (res?.success) {
        success(`Test ping delivered! HTTP ${res.statusCode} in ${res.durationMs}ms`);
      } else {
        toastError(`Ping failed: HTTP ${res?.statusCode || 500} - ${res?.error || 'Unreachable'}`);
      }
      loadWebhooks();
    } catch (err: any) {
      toastError(err.message || 'Failed to trigger test ping.');
    } finally {
      setTestingPingId(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiRequest('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          companyName,
          notificationPreferences: {
            usage_alerts: usageAlerts,
            rate_limit_alerts: rateLimitAlerts,
          },
        }),
      });
      success('Profile updated successfully.');
    } catch (err: any) {
      toastError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toastError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toastError('New password must be at least 8 characters.');
      return;
    }

    setSavingPassword(true);
    try {
      await apiRequest('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      success('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toastError(err.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await apiRequest(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      success('Session terminated.');
      loadSessions();
    } catch (err: any) {
      toastError(err.message || 'Failed to revoke session.');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your personal credentials, active sessions, and usage notifications.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'profile'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'security'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security & Password</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'sessions'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Active Sessions</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'notifications'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'webhooks'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Webhook className="w-4 h-4" />
          <span>Webhooks</span>
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <h3 className="font-semibold text-base">Personal Information</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
              <div className="flex items-center space-x-2">
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-muted-foreground text-xs font-mono cursor-not-allowed"
                />
                <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold shrink-0">
                  Verified
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">Primary login identifier cannot be changed directly.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Full Name</label>
              <input
                type="text"
                placeholder="Ada Lovelace"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Company / Organization</label>
              <input
                type="text"
                placeholder="Acme AI Labs"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/25 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingProfile ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-2xl">
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <h3 className="font-semibold text-base">Change Password</h3>
            <p className="text-xs text-muted-foreground">
              Ensure your account is using a strong password with at least 8 characters.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/25 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{savingPassword ? 'Updating...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Active Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-6 max-w-3xl">
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Active Login Sessions</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Devices and locations where your account is currently signed in.
                </p>
              </div>
            </div>

            <div className="divide-y divide-border pt-2">
              {sessions.length > 0 ? (
                sessions.map((s) => (
                  <div key={s.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          {s.userAgent || 'Web Browser (Unknown)'}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          IP: {s.ipAddress || '127.0.0.1'} &bull; Signed in: {new Date(s.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      className="px-3 py-1.5 rounded-lg border border-border hover:bg-red-500/10 hover:text-red-400 text-xs font-semibold text-muted-foreground transition-all"
                    >
                      Revoke
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  {loadingSessions ? 'Loading sessions...' : 'Current session is active.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 max-w-2xl">
          <div className="p-6 rounded-3xl bg-card border border-border space-y-5">
            <h3 className="font-semibold text-base">Notification Preferences</h3>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <div className="text-xs font-semibold text-foreground">Usage Limit Threshold Alerts</div>
                <div className="text-[11px] text-muted-foreground">Receive an email when reaching 80% and 100% of your monthly token limit.</div>
              </div>
              <input
                type="checkbox"
                checked={usageAlerts}
                onChange={(e) => setUsageAlerts(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-xs font-semibold text-foreground">Rate Limit Alerts</div>
                <div className="text-[11px] text-muted-foreground">Get notified if your API keys encounter consecutive 429 throttling errors.</div>
              </div>
              <input
                type="checkbox"
                checked={rateLimitAlerts}
                onChange={(e) => setRateLimitAlerts(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/25"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Preferences</span>
            </button>
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6 max-w-4xl">
          {/* Create Webhook Box */}
          <form onSubmit={handleCreateWebhook} className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Webhook className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Register Webhook Endpoint</h3>
                <p className="text-xs text-muted-foreground">
                  Events are delivered as HTTP POST requests signed with HMAC-SHA256 headers (`X-Yoyo-Signature`).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Endpoint URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourdomain.com/webhooks/yoyo"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Production batch & billing event listener"
                  value={webhookDesc}
                  onChange={(e) => setWebhookDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-foreground">Subscribed Events</label>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { id: '*', label: 'All Events (*)' },
                  { id: 'batch.completed', label: 'batch.completed' },
                  { id: 'batch.failed', label: 'batch.failed' },
                  { id: 'usage.threshold_reached', label: 'usage.threshold_reached' },
                  { id: 'key.created', label: 'key.created' },
                ].map((ev) => {
                  const isChecked = webhookEvents.includes(ev.id);
                  return (
                    <button
                      type="button"
                      key={ev.id}
                      onClick={() => {
                        if (ev.id === '*') {
                          setWebhookEvents(['*']);
                        } else {
                          const withoutWild = webhookEvents.filter((x) => x !== '*');
                          if (isChecked) {
                            const next = withoutWild.filter((x) => x !== ev.id);
                            setWebhookEvents(next.length === 0 ? ['*'] : next);
                          } else {
                            setWebhookEvents([...withoutWild, ev.id]);
                          }
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                        isChecked
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {ev.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={creatingWebhook}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{creatingWebhook ? 'Creating...' : 'Add Endpoint'}</span>
              </button>
            </div>
          </form>

          {/* Webhook Endpoints List */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <h3 className="font-semibold text-base">Active Endpoints</h3>

            {loadingWebhooks ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Loading endpoints...</div>
            ) : webhooks.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No webhook endpoints registered yet. Register an endpoint above to receive event alerts.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {webhooks.map((wh) => {
                  const isRevealed = revealedSecrets[wh.id];
                  return (
                    <div key={wh.id} className="py-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-foreground">{wh.url}</span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                                wh.isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {wh.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          {wh.description && (
                            <p className="text-xs text-muted-foreground">{wh.description}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleTestPing(wh.id)}
                            disabled={testingPingId === wh.id}
                            className="px-3 py-1.5 rounded-lg border border-border hover:bg-primary/10 hover:border-primary/30 text-xs font-semibold text-muted-foreground hover:text-primary transition-all flex items-center space-x-1.5"
                          >
                            <Send className="w-3 h-3" />
                            <span>{testingPingId === wh.id ? 'Sending...' : 'Test Ping'}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteWebhook(wh.id)}
                            className="p-1.5 rounded-lg border border-border hover:bg-red-500/10 hover:text-red-400 text-muted-foreground transition-all"
                            title="Delete Endpoint"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Secret Row */}
                      <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-muted/40 border border-border text-xs">
                        <span className="text-muted-foreground shrink-0 font-medium text-[11px]">Signing Secret:</span>
                        <span className="font-mono text-muted-foreground truncate select-all">
                          {isRevealed ? wh.secret : '••••••••••••••••••••••••••••••••••••••••'}
                        </span>
                        <div className="flex items-center space-x-1 shrink-0 ml-auto">
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedSecrets((prev) => ({ ...prev, [wh.id]: !prev[wh.id] }))
                            }
                            className="p-1 hover:text-foreground text-muted-foreground"
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(wh.secret);
                              success('Secret copied to clipboard.');
                            }}
                            className="p-1 hover:text-foreground text-muted-foreground"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Events Badges */}
                      <div className="flex items-center space-x-2 text-[10px]">
                        <span className="text-muted-foreground">Events:</span>
                        {(wh.events || []).map((ev: string) => (
                          <span
                            key={ev}
                            className="px-2 py-0.5 rounded bg-muted font-mono text-muted-foreground border border-border"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="p-6 rounded-3xl bg-red-500/[0.04] border border-red-500/20 space-y-3 max-w-2xl">
        <h3 className="text-sm font-bold text-red-400 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Danger Zone</span>
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Deleting your account permanently revokes all API keys, destroys your historical token telemetry records, and removes all model deployments. This action is irreversible.
        </p>
        <button
          onClick={() => alert('Please contact administrator support to initiate account termination.')}
          className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-bold"
        >
          Request Account Deletion
        </button>
      </div>
    </div>
  );
}

