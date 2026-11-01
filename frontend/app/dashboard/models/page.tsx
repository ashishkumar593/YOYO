'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import {
  Cpu,
  Search,
  Copy,
  Check,
  Terminal,
  Plus,
  Trash2,
  Power,
  Sparkles,
  Layers,
  Code,
  Shield,
  Zap,
  DollarSign,
  Info,
  X,
  ArrowLeftRight,
} from 'lucide-react';

export default function ModelsPage() {
  const { user } = useAuth();
  const [models, setModels] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const { success, error: toastError } = useToast();

  // Form fields for Add Model
  const [formData, setFormData] = useState({
    apiIdentifier: '',
    name: '',
    providerFamily: 'Meta',
    category: 'GENERAL',
    defaultContextWindow: 131072,
    quantizationLevel: 'FP16',
    inputCostPerMillion: 0.20,
    outputCostPerMillion: 0.40,
    license: 'Commercial Permissive / Open Weights',
    description: '',
  });

  const loadCatalog = async () => {
    try {
      const data = await apiRequest('/api/models/catalog?all=true');
      setModels(data || []);
    } catch (err) {
      console.error('Failed to load model catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    success(`Copied "${id}" to clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare((prev) => prev.filter((item) => item !== id));
    } else {
      if (selectedForCompare.length >= 3) {
        toastError('You can compare a maximum of 3 models simultaneously.');
        return;
      }
      setSelectedForCompare((prev) => [...prev, id]);
    }
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/api/models', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          defaultContextWindow: Number(formData.defaultContextWindow),
          inputCostPerMillion: Number(formData.inputCostPerMillion),
          outputCostPerMillion: Number(formData.outputCostPerMillion),
        }),
      });

      success(`Model "${formData.name}" successfully registered in catalog.`);
      setShowAddModal(false);
      setFormData({
        apiIdentifier: '',
        name: '',
        providerFamily: 'Meta',
        category: 'GENERAL',
        defaultContextWindow: 131072,
        quantizationLevel: 'FP16',
        inputCostPerMillion: 0.20,
        outputCostPerMillion: 0.40,
        license: 'Commercial Permissive / Open Weights',
        description: '',
      });
      await loadCatalog();
    } catch (err: any) {
      toastError(err.message || 'Failed to register model.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (model: any) => {
    try {
      const newStatus = !model.isActive;
      await apiRequest(`/api/models/${model.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus }),
      });
      success(`Model "${model.name}" is now ${newStatus ? 'active' : 'inactive'}.`);
      await loadCatalog();
    } catch (err: any) {
      toastError(err.message || 'Failed to update model status.');
    }
  };

  const categories = [
    { label: 'All Models', value: 'ALL' },
    { label: 'General LLM', value: 'GENERAL' },
    { label: 'Code Specialists', value: 'CODING' },
    { label: 'Reasoning & Math', value: 'REASONING' },
    { label: 'Embeddings', value: 'EMBEDDING' },
    { label: 'Vision Multimodal', value: 'VISION' },
  ];

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const filtered = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.apiIdentifier.toLowerCase().includes(search.toLowerCase()) ||
      m.providerFamily.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'ALL' || m.category.toUpperCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight">Foundation Model Catalog</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              {models.filter((m) => m.isActive).length} ACTIVE ON CLOUD
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Explore and deploy open foundation weights hosted on dedicated cloud GPU clusters.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs flex items-center space-x-1.5 shadow-lg shadow-primary/20 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Register Cloud Model</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models by name, identifier, or provider..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-xs focus:border-primary focus:outline-none transition-all shadow-sm text-foreground"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat.value
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-bold'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Models Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center space-y-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Syncing with model registry...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-card border border-border text-muted-foreground">
          <Cpu className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No models match your query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((model) => (
            <div
              key={model.id}
              className={`p-6 rounded-3xl bg-card border transition-all flex flex-col justify-between shadow-sm relative group ${
                model.isActive
                  ? 'border-border hover:border-primary/40 glass-panel-hover'
                  : 'border-border/40 opacity-70 bg-muted/20'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {model.providerFamily}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60">
                      {model.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {model.isActive ? (
                      <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Ready // Online</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 text-[10px] font-mono text-zinc-500 bg-zinc-500/10 px-2.5 py-0.5 rounded-full border border-zinc-500/20">
                        <span>Offline // Inactive</span>
                      </div>
                    )}

                    {isSuperAdmin && (
                      <button
                        onClick={() => handleToggleActive(model)}
                        title={model.isActive ? 'Deactivate Model' : 'Activate Model'}
                        className={`p-1.5 rounded-lg border transition-all ${
                          model.isActive
                            ? 'text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border-transparent hover:border-red-500/20'
                            : 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Model Title */}
                <h3 className="font-extrabold text-lg text-foreground tracking-tight">{model.name}</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {model.description || 'Optimized foundation model for enterprise production AI applications.'}
                </p>

                {/* Hardware & Spec Badges */}
                <div className="mt-5 grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[9px] uppercase">Context</span>
                    <span className="font-bold text-foreground">
                      {model.defaultContextWindow >= 1000
                        ? `${(model.defaultContextWindow / 1024).toFixed(0)}k`
                        : model.defaultContextWindow}{' '}
                      tokens
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[9px] uppercase">Precision</span>
                    <span className="font-bold text-purple-400">
                      {model.versions?.[0]?.quantizationLevel || 'FP16'}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[9px] uppercase">Pricing / 1M</span>
                    <span className="font-bold text-emerald-400">
                      ${model.pricing?.inputCostPerMillion?.toFixed(2) || '0.20'} / $
                      {model.pricing?.outputCostPerMillion?.toFixed(2) || '0.40'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom API Call Identifier */}
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <code className="text-xs font-mono bg-muted/80 px-3 py-1.5 rounded-xl text-foreground font-semibold border border-border">
                    {model.apiIdentifier}
                  </code>
                  <button
                    onClick={() => handleCopy(model.apiIdentifier)}
                    title="Copy model identifier"
                    className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
                  >
                    {copiedId === model.apiIdentifier ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleCompare(model.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      selectedForCompare.includes(model.id)
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border'
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>{selectedForCompare.includes(model.id) ? 'Comparing' : 'Compare'}</span>
                  </button>

                  <Link
                    href={`/dashboard/playground?model=${encodeURIComponent(model.apiIdentifier)}`}
                    className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-primary/20"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Launch</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Model Modal for Super Admins */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-card border border-border rounded-3xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base">Register Cloud Model</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddModel} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    API Identifier
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                    value={formData.apiIdentifier}
                    onChange={(e) => setFormData({ ...formData, apiIdentifier: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Llama 3.3 70B Instruct"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Provider Family
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Meta, Mistral, Qwen..."
                    value={formData.providerFamily}
                    onChange={(e) => setFormData({ ...formData, providerFamily: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="GENERAL">General LLM</option>
                    <option value="CODING">Code Specialist</option>
                    <option value="REASONING">Reasoning / Math</option>
                    <option value="EMBEDDING">Embedding</option>
                    <option value="VISION">Vision Multimodal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Context Window
                  </label>
                  <input
                    type="number"
                    required
                    step="1024"
                    value={formData.defaultContextWindow}
                    onChange={(e) => setFormData({ ...formData, defaultContextWindow: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Precision / Quant
                  </label>
                  <input
                    type="text"
                    placeholder="FP16, Q4_K_M, AWQ"
                    value={formData.quantizationLevel}
                    onChange={(e) => setFormData({ ...formData, quantizationLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Input Cost / 1M ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.inputCostPerMillion}
                    onChange={(e) => setFormData({ ...formData, inputCostPerMillion: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Output Cost / 1M ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.outputCostPerMillion}
                    onChange={(e) => setFormData({ ...formData, outputCostPerMillion: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of model architecture, capabilities, and benchmark highlights..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:border-primary focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  License / Governance
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apache 2.0, Llama 3.3 Community, MIT"
                  value={formData.license}
                  onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs shadow-md shadow-primary/20 transition-all flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Register Model in Platform Registry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Compare Action Bar */}
      {selectedForCompare.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/90 border border-cyan-500/30 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center space-x-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono font-bold text-white">
              {selectedForCompare.length} / 3 Selected for Comparison
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCompareModal(true)}
              className="px-4 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center space-x-1.5"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Compare Models</span>
            </button>
            <button
              onClick={() => setSelectedForCompare([])}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Side-by-Side Model Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-[#0C0E14] border border-white/[0.1] rounded-3xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Side-by-Side Model Comparison</h3>
                  <p className="text-xs text-zinc-400">
                    Compare technical parameters, pricing per million tokens, and cloud infrastructure requirements.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {models
                .filter((m) => selectedForCompare.includes(m.id))
                .map((m) => (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex flex-col justify-between space-y-5"
                  >
                    <div>
                      {/* Badge & Name */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {m.providerFamily}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase bg-zinc-800 px-2 py-0.5 rounded-full">
                          {m.category}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white tracking-tight">{m.name}</h4>
                      <code className="text-[11px] font-mono text-zinc-400 block mt-1 break-all">
                        {m.apiIdentifier}
                      </code>

                      {/* Specs Matrix */}
                      <div className="mt-5 space-y-3 text-xs">
                        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                          <span className="text-zinc-400">Context Window</span>
                          <span className="font-mono font-bold text-white">
                            {m.defaultContextWindow >= 1000
                              ? `${(m.defaultContextWindow / 1024).toFixed(0)}k (${m.defaultContextWindow.toLocaleString()} tokens)`
                              : `${m.defaultContextWindow} tokens`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                          <span className="text-zinc-400">Precision</span>
                          <span className="font-mono font-semibold text-purple-400">
                            {m.versions?.[0]?.quantizationLevel || 'FP16'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                          <span className="text-zinc-400">Cloud GPU Hardware</span>
                          <span className="font-mono text-xs text-amber-400">
                            {m.defaultContextWindow > 65000 ? 'NVIDIA H100 SXM5 80GB' : 'NVIDIA A100 80GB'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                          <span className="text-zinc-400">Input / 1M Tokens</span>
                          <span className="font-mono font-bold text-emerald-400">
                            ${m.pricing?.inputCostPerMillion?.toFixed(2) || '0.20'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                          <span className="text-zinc-400">Output / 1M Tokens</span>
                          <span className="font-mono font-bold text-emerald-400">
                            ${m.pricing?.outputCostPerMillion?.toFixed(2) || '0.40'}
                          </span>
                        </div>

                        <div className="py-2">
                          <span className="text-zinc-500 text-[11px] block mb-1">Architecture & Description</span>
                          <p className="text-[11px] text-zinc-300 leading-relaxed">
                            {m.description || 'Optimized foundation weights for enterprise cloud deployment.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/[0.05] flex items-center space-x-2">
                      <Link
                        href={`/dashboard/playground?model=${encodeURIComponent(m.apiIdentifier)}`}
                        className="flex-1 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-cyan-500/20"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Launch in Playground</span>
                      </Link>
                      <button
                        onClick={() => toggleCompare(m.id)}
                        className="p-2.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-all"
                        title="Remove from comparison"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
