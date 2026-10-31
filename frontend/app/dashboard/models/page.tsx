'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { Cpu, Search, Copy, Check, Terminal, ExternalLink, Sparkles, Filter } from 'lucide-react';

export default function ModelsPage() {
  const [models, setModels] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = ['ALL', 'GENERAL', 'CODING', 'REASONING', 'EMBEDDING'];

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Model Catalog & Registry</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Explore self-hosted open-weights models deployed on our GPU worker pool. Call them with any OpenAI client.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, provider (Meta, Qwen, DeepSeek)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-xs focus:border-primary focus:outline-none transition-all"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Models Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">Loading model catalog...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border border-border text-muted-foreground">
          <Cpu className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No models match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((model) => (
            <div
              key={model.id}
              className="p-6 rounded-2xl bg-card border border-border/80 hover:border-border transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top badges */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {model.providerFamily}
                  </span>
                  <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Loaded on GPU</span>
                  </div>
                </div>

                {/* Model Title */}
                <h3 className="font-bold text-lg text-foreground">{model.name}</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {model.description || 'Optimized foundation model for production AI applications.'}
                </p>

                {/* Spec badges */}
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-mono">
                  <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border/60">
                    Context: {(model.defaultContextWindow / 1024).toFixed(0)}k
                  </span>
                  {model.versions?.[0] && (
                    <>
                      <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border/60">
                        Quant: {model.versions[0].quantizationLevel}
                      </span>
                      <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border/60">
                        VRAM: ~{(model.versions[0].vramRequiredBytes / 1000000000).toFixed(1)} GB
                      </span>
                    </>
                  )}
                  {model.license && (
                    <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border/60">
                      License: {model.license}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <code className="text-xs font-mono bg-muted/80 px-2.5 py-1 rounded-lg text-foreground font-semibold border border-border">
                    {model.apiIdentifier}
                  </code>
                  <button
                    onClick={() => handleCopy(model.apiIdentifier)}
                    title="Copy model identifier"
                    className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
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
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Playground</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

