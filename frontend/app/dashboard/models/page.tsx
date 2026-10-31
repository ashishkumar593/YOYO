'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import {
  Cpu,
  Search,
  Copy,
  Check,
  Terminal,
  Sparkles,
  Layers,
  Code,
  Shield,
  Zap,
} from 'lucide-react';

export default function ModelsPage() {
  const [models, setModels] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { success } = useToast();

  useEffect(() => {
    async function loadCatalog() {
      try {
        const data = await apiRequest('/api/models/catalog');
        setModels(data || []);
      } catch (err) {
        console.error('Failed to load model catalog:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    success(`Copied "${id}" to clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = [
    { label: 'All Models', value: 'ALL' },
    { label: 'General LLM', value: 'GENERAL' },
    { label: 'Code Specialists', value: 'CODING' },
    { label: 'Reasoning & Math', value: 'REASONING' },
    { label: 'Embeddings', value: 'EMBEDDING' },
  ];

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
              {models.length} DEPLOYED
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Explore and deploy open foundation weights hosted on dedicated containerized GPU workers.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models by name, provider, or capability..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-xs focus:border-primary focus:outline-none transition-all shadow-sm"
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
              className="p-6 rounded-3xl bg-card border border-border hover:border-primary/40 glass-panel-hover transition-all flex flex-col justify-between shadow-sm relative group"
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

                  <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Loaded & Warm</span>
                  </div>
                </div>

                {/* Model Title */}
                <h3 className="font-extrabold text-lg text-foreground tracking-tight">{model.name}</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {model.description || 'Optimized foundation model for production AI applications.'}
                </p>

                {/* Hardware & Spec Badges */}
                <div className="mt-5 grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[9px] uppercase">Context</span>
                    <span className="font-bold text-foreground">
                      {(model.defaultContextWindow / 1024).toFixed(0)}k tokens
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[9px] uppercase">Quantization</span>
                    <span className="font-bold text-foreground">
                      {model.versions?.[0]?.quantizationLevel || 'Q4_K_M'}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-center">
                    <span className="text-muted-foreground block text-[9px] uppercase">VRAM Sizing</span>
                    <span className="font-bold text-foreground">
                      ~{(Number(model.versions?.[0]?.vramRequiredBytes || 6000000000) / 1000000000).toFixed(1)} GB
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

                <Link
                  href={`/dashboard/playground?model=${encodeURIComponent(model.apiIdentifier)}`}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-primary/20"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Launch</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
