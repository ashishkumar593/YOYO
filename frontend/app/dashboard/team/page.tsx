'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import {
  Users,
  Building,
  Plus,
  Shield,
  Trash2,
  FolderGit2,
  Check,
  ChevronDown,
  Mail,
  UserPlus,
  ShieldCheck,
  CreditCard,
  Code,
  Crown,
  KeyRound,
} from 'lucide-react';

interface Member {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'BILLING_VIEWER';
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      fullName?: string;
    };
  };
}

interface Project {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  userRole?: string;
  memberCount?: number;
  projectCount?: number;
  members?: Member[];
  projects?: Project[];
  createdAt: string;
}

export default function TeamPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'OWNER' | 'ADMIN' | 'DEVELOPER' | 'BILLING_VIEWER'>('DEVELOPER');

  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectSlug, setProjectSlug] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error: toastError } = useToast();

  const loadOrganizations = async () => {
    try {
      const orgs: Organization[] = await apiRequest('/api/organizations').catch(() => []);
      setOrganizations(orgs);
      if (orgs.length > 0) {
        // Select first org or current active
        const selectedId = activeOrg ? activeOrg.id : orgs[0].id;
        await loadOrgDetails(selectedId);
      } else {
        setActiveOrg(null);
      }
    } catch (err: any) {
      console.error('Failed to load organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrgDetails = async (orgId: string) => {
    try {
      const fullOrg = await apiRequest(`/api/organizations/${orgId}`);
      setActiveOrg(fullOrg);
    } catch (err: any) {
      toastError(err.message || 'Failed to load organization details');
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await apiRequest('/api/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: newOrgName.trim(),
          ...(newOrgSlug.trim() ? { slug: newOrgSlug.trim() } : {}),
        }),
      });
      success(`Organization '${created.name}' created!`);
      setNewOrgName('');
      setNewOrgSlug('');
      setShowCreateOrgModal(false);
      await loadOrganizations();
      await loadOrgDetails(created.id);
    } catch (err: any) {
      toastError(err.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || !inviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      await apiRequest(`/api/organizations/${activeOrg.id}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });
      success(`Invited '${inviteEmail}' to ${activeOrg.name}`);
      setInviteEmail('');
      setShowInviteModal(false);
      await loadOrgDetails(activeOrg.id);
    } catch (err: any) {
      toastError(err.message || 'Failed to invite member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    if (!activeOrg) return;
    try {
      await apiRequest(`/api/organizations/${activeOrg.id}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      success('Member role updated.');
      await loadOrgDetails(activeOrg.id);
    } catch (err: any) {
      toastError(err.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!activeOrg) return;
    if (!confirm(`Are you sure you want to remove ${memberEmail} from ${activeOrg.name}?`)) {
      return;
    }

    try {
      await apiRequest(`/api/organizations/${activeOrg.id}/members/${memberId}`, {
        method: 'DELETE',
      });
      success(`Removed ${memberEmail} from organization.`);
      await loadOrgDetails(activeOrg.id);
    } catch (err: any) {
      toastError(err.message || 'Failed to remove member');
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || !projectName.trim()) return;

    setIsSubmitting(true);
    try {
      await apiRequest(`/api/organizations/${activeOrg.id}/projects`, {
        method: 'POST',
        body: JSON.stringify({
          name: projectName.trim(),
          ...(projectSlug.trim() ? { slug: projectSlug.trim() } : {}),
        }),
      });
      success(`Project '${projectName}' created!`);
      setProjectName('');
      setProjectSlug('');
      setShowCreateProjectModal(false);
      await loadOrgDetails(activeOrg.id);
    } catch (err: any) {
      toastError(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Crown className="w-3 h-3 text-purple-400" />
            <span>OWNER</span>
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ShieldCheck className="w-3 h-3 text-blue-400" />
            <span>ADMIN</span>
          </span>
        );
      case 'BILLING_VIEWER':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <CreditCard className="w-3 h-3 text-amber-400" />
            <span>BILLING</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Code className="w-3 h-3 text-emerald-400" />
            <span>DEVELOPER</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Workspace Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team & Enterprise Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Role-based access control, project isolation, and shared team billing across cloud inference.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {organizations.length > 0 && (
            <div className="relative">
              <select
                value={activeOrg?.id || ''}
                onChange={(e) => loadOrgDetails(e.target.value)}
                className="bg-card text-foreground font-semibold border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary cursor-pointer pr-8 appearance-none shadow-sm"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    🏢 {org.name} ({org.userRole})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-3.5 pointer-events-none" />
            </div>
          )}

          <button
            onClick={() => setShowCreateOrgModal(true)}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs flex items-center space-x-1.5 shadow-md shadow-primary/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Organization</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm font-mono text-muted-foreground">
          Loading workspace memberships...
        </div>
      ) : !activeOrg ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
            <Building className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-foreground">No Organization Found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            You are currently working in your Personal Workspace. Create an organization to invite teammates, enforce spend quotas, and isolate projects.
          </p>
          <button
            onClick={() => setShowCreateOrgModal(true)}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Organization</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Org Banner */}
          <div className="p-6 rounded-3xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg font-mono">
                {activeOrg.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold text-foreground">{activeOrg.name}</h2>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    slug: {activeOrg.slug}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your Role: <strong className="text-foreground">{activeOrg.userRole}</strong> • Created on{' '}
                  {new Date(activeOrg.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {(activeOrg.userRole === 'OWNER' || activeOrg.userRole === 'ADMIN') && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite Teammate</span>
                </button>
              )}
              {activeOrg.userRole !== 'BILLING_VIEWER' && (
                <button
                  onClick={() => setShowCreateProjectModal(true)}
                  className="px-4 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground font-semibold text-xs flex items-center space-x-1.5 transition-all"
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-primary" />
                  <span>New Project</span>
                </button>
              )}
            </div>
          </div>

          {/* Members Table */}
          <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Team Members ({activeOrg.members?.length || 0})</span>
              </div>
              <span className="text-xs text-muted-foreground">Manage RBAC roles and workspace permissions</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="px-6 py-3">Member</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Joined Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeOrg.members?.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
                          {(m.user.profile?.fullName || m.user.email)[0]}
                        </div>
                        <span>{m.user.profile?.fullName || m.user.email.split('@')[0]}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">{m.user.email}</td>
                      <td className="px-6 py-4">
                        {(activeOrg.userRole === 'OWNER' || activeOrg.userRole === 'ADMIN') && m.role !== 'OWNER' ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                            className="bg-muted/50 border border-border rounded-lg px-2 py-1 text-xs font-mono font-semibold focus:outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="DEVELOPER">DEVELOPER</option>
                            <option value="BILLING_VIEWER">BILLING_VIEWER</option>
                          </select>
                        ) : (
                          getRoleBadge(m.role)
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(activeOrg.userRole === 'OWNER' || activeOrg.userRole === 'ADMIN') && m.role !== 'OWNER' && (
                          <button
                            onClick={() => handleRemoveMember(m.id, m.user.email)}
                            className="text-muted-foreground hover:text-red-400 p-1 rounded transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Projects & Workspaces List */}
          <div className="rounded-3xl bg-card border border-border p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <FolderGit2 className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Isolated Projects ({activeOrg.projects?.length || 0})</span>
              </div>
              <span className="text-xs text-muted-foreground">Partition API keys and logs per environment</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeOrg.projects?.map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-2xl bg-muted/20 border border-border hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-foreground text-sm">{proj.name}</h4>
                      <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {proj.slug}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Created on {new Date(proj.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span className="text-emerald-400 font-semibold">Active Workspace</span>
                    <span className="hover:text-foreground cursor-pointer flex items-center space-x-1">
                      <span>API Keys</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enterprise Role Matrix Card */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-border">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Enterprise Role Permissions Matrix</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2">
                <div className="flex items-center space-x-1.5 text-purple-400 font-bold">
                  <Crown className="w-4 h-4" />
                  <span>OWNER</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Full control over organization settings, payment methods, credit packs, and member management.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                <div className="flex items-center space-x-1.5 text-blue-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>ADMIN</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Can invite/remove members, create new projects, and configure network CIDR allowlists.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                  <Code className="w-4 h-4" />
                  <span>DEVELOPER</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Full access to generate scoped API keys, run inference across all models, and view execution telemetry.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                  <CreditCard className="w-4 h-4" />
                  <span>BILLING_VIEWER</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Audit access to invoices, ledger transactions, top-ups, and token usage reports without key access.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Organization */}
      {showCreateOrgModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-base font-bold text-foreground">Create New Organization</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Establish an enterprise workspace with team isolation and shared compute credit pooling.
              </p>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Organization Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme AI Labs"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Workspace Slug (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. acme-ai"
                  value={newOrgSlug}
                  onChange={(e) => setNewOrgSlug(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateOrgModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Invite Teammate */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-base font-bold text-foreground">Invite Teammate</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add a colleague to <strong className="text-foreground">{activeOrg?.name}</strong> with specific RBAC permissions.
              </p>
            </div>

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Colleague's Registered Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="DEVELOPER">DEVELOPER (Full API Key & Inference)</option>
                  <option value="ADMIN">ADMIN (Member & Project Management)</option>
                  <option value="BILLING_VIEWER">BILLING_VIEWER (Financial Ledger & Quotas)</option>
                  <option value="OWNER">OWNER (Full Co-Ownership)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Project */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-base font-bold text-foreground">Create Isolated Project</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Partition API keys, logs, and rate limits under <strong className="text-foreground">{activeOrg?.name}</strong>.
              </p>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production RAG Service"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Project Slug (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. prod-rag"
                  value={projectSlug}
                  onChange={(e) => setProjectSlug(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProjectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
