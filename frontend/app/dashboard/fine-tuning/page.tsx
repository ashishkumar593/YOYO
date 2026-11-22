'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import {
  Sparkles,
  Plus,
  Play,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  Terminal,
  Cpu,
  Copy,
  Check,
  FileCode,
  Sliders,
  ChevronRight,
  X,
  Flame,
  Search,
} from 'lucide-react';

interface FineTuningJob {
  id: string;
  object: string;
  model: string;
  created_at: number;
  finished_at?: number | null;
  fine_tuned_model?: string | null;
  status: 'validating_files' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  trained_tokens?: number | null;
  training_file: string;
  validation_file?: string | null;
  hyperparameters?: {
    n_epochs?: number;
    batch_size?: number;
    learning_rate_multiplier?: number;
  };
  error?: { message: string } | null;
}

interface FineTuningEvent {
  id: string;
  object: string;
  created_at: number;
  level: string;
  message: string;
}

const DEFAULT_MODELS = [
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B Instruct (Meta)' },
  { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B (Qwen)' },
  { id: 'deepseek-r1-70b', name: 'DeepSeek R1 70B Reasoner' },
  { id: 'llama-3.2-3b', name: 'Llama 3.2 3B Lightweight' },
];

export default function FineTuningPage() {
  const { success, error: toastError, info } = useToast();

  const [jobs, setJobs] = useState<FineTuningJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBaseModel, setSelectedBaseModel] = useState('llama-3.3-70b');
  const [suffix, setSuffix] = useState('custom-adapter-v1');
  const [nEpochs, setNEpochs] = useState(3);
  const [batchSize, setBatchSize] = useState(4);
  const [learningRate, setLearningRate] = useState(1.0);

  // File Upload State inside Modal
  const [trainingFileContent, setTrainingFileContent] = useState(
    JSON.stringify({
      messages: [
        { role: 'system', content: 'You are an enterprise contract auditor.' },
        { role: 'user', content: 'Extract indemnity terms from clause 4.' },
        { role: 'assistant', content: 'Indemnity is mutual and capped at $500,000 USD.' },
      ],
    }) +
      '\n' +
      JSON.stringify({
        messages: [
          { role: 'system', content: 'You are an enterprise contract auditor.' },
          { role: 'user', content: 'Identify governing jurisdiction.' },
          { role: 'assistant', content: 'Governing jurisdiction is the State of Delaware.' },
        ],
      })
  );

  // Events Drawer State
  const [selectedJobForEvents, setSelectedJobForEvents] = useState<FineTuningJob | null>(null);
  const [jobEvents, setJobEvents] = useState<FineTuningEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Copied indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/v1/fine_tuning/jobs');
      if (res && Array.isArray(res.data)) {
        setJobs(res.data);
      }
    } catch (err: any) {
      console.warn('Could not load fine-tuning jobs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suffix.trim()) {
      toastError('Please provide a model suffix name.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Upload training file to /v1/files
      const fileRes = await apiRequest('/v1/files', {
        method: 'POST',
        body: JSON.stringify({
          filename: `dataset-${suffix}.jsonl`,
          purpose: 'fine-tune',
          content: trainingFileContent,
        }),
      });

      // 2. Submit fine-tuning job
      const jobRes = await apiRequest('/v1/fine_tuning/jobs', {
        method: 'POST',
        body: JSON.stringify({
          model: selectedBaseModel,
          training_file: fileRes.id,
          suffix: suffix.trim(),
          hyperparameters: {
            n_epochs: nEpochs,
            batch_size: batchSize,
            learning_rate_multiplier: learningRate,
          },
        }),
      });

      success(`Fine-tuning job ${jobRes.id} queued successfully!`);
      setShowCreateModal(false);
      await loadJobs();
    } catch (err: any) {
      toastError(err.message || 'Failed to submit fine-tuning job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await apiRequest(`/v1/fine_tuning/jobs/${jobId}/cancel`, {
        method: 'POST',
      });
      success(`Fine-tuning job ${jobId} cancelled.`);
      await loadJobs();
    } catch (err: any) {
      toastError(err.message || 'Failed to cancel job.');
    }
  };

  const handleViewEvents = async (job: FineTuningJob) => {
    setSelectedJobForEvents(job);
    setLoadingEvents(true);
    try {
      const res = await apiRequest(`/v1/fine_tuning/jobs/${job.id}/events`);
      setJobEvents(res.data || []);
    } catch (err: any) {
      toastError(err.message || 'Could not load job events.');
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleCopyModel = (modelId: string) => {
    navigator.clipboard.writeText(modelId);
    setCopiedId(modelId);
    success(`Model identifier "${modelId}" copied to clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Metrics
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(
    (j) => j.status === 'validating_files' || j.status === 'queued' || j.status === 'running'
  ).length;
  const succeededJobs = jobs.filter((j) => j.status === 'succeeded').length;
  const totalTokensTrained = jobs.reduce((sum, j) => sum + (j.trained_tokens || 0), 0);

  // Filtered jobs
  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.fine_tuned_model && j.fine_tuned_model.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || j.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Fine-Tuning Studio</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  OpenAI Spec
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Train specialized LoRA adapters on foundation models and auto-register them for zero-overhead inference.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadJobs}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm"
            title="Refresh Jobs"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Fine-Tuning Job</span>
          </button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Jobs
            </span>
            <span className="text-lg font-bold font-mono text-foreground">{totalJobs}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Active Training
            </span>
            <span className="text-lg font-bold font-mono text-amber-400">{activeJobs}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Succeeded Adapters
            </span>
            <span className="text-lg font-bold font-mono text-emerald-400">{succeededJobs}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Trained Tokens
            </span>
            <span className="text-lg font-bold font-mono text-indigo-400">
              {totalTokensTrained.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border rounded-xl p-3 shadow-sm">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Search className="w-4 h-4 text-muted-foreground ml-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by job ID, base model, or adapter..."
            className="bg-transparent text-xs text-foreground placeholder-muted-foreground focus:outline-none w-full sm:w-64"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'RUNNING', 'SUCCEEDED', 'VALIDATING_FILES', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs font-mono">
            Loading fine-tuning job ledger...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">No Fine-Tuning Jobs Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Train your first domain-specific LoRA adapter on Llama 3.3 or Qwen 2.5 Coder in minutes.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm"
            >
              Submit Fine-Tuning Job
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Job ID</th>
                  <th className="py-3 px-4 font-semibold">Base Model</th>
                  <th className="py-3 px-4 font-semibold">Fine-Tuned Model</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Tokens</th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {job.id}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {job.model}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {job.fine_tuned_model ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-emerald-400 font-semibold">
                            {job.fine_tuned_model}
                          </span>
                          <button
                            onClick={() => handleCopyModel(job.fine_tuned_model!)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Copy Model ID"
                          >
                            {copiedId === job.fine_tuned_model ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Generating...</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase border ${
                          job.status === 'succeeded'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : job.status === 'running'
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 animate-pulse'
                            : job.status === 'validating_files' || job.status === 'queued'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : job.status === 'cancelled'
                            ? 'bg-muted text-muted-foreground border-border/60'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {job.status === 'running' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                        )}
                        <span>{job.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {job.trained_tokens ? job.trained_tokens.toLocaleString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(job.created_at * 1000).toLocaleTimeString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewEvents(job)}
                          className="px-2.5 py-1 rounded-lg bg-card border border-border hover:bg-muted text-[11px] font-medium text-foreground transition-all shadow-sm"
                        >
                          Events
                        </button>

                        {job.status === 'succeeded' && job.fine_tuned_model && (
                          <Link
                            href={`/dashboard/playground?model=${encodeURIComponent(job.fine_tuned_model)}`}
                            className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-[11px] font-semibold transition-all shadow-sm flex items-center space-x-1"
                          >
                            <Terminal className="w-3 h-3" />
                            <span>Playground</span>
                          </Link>
                        )}

                        {(job.status === 'validating_files' ||
                          job.status === 'queued' ||
                          job.status === 'running') && (
                          <button
                            onClick={() => handleCancelJob(job.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[11px] font-medium transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Fine-Tuning Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Launch LoRA Fine-Tuning Job</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              {/* Base Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Base Foundation Model</label>
                <select
                  value={selectedBaseModel}
                  onChange={(e) => setSelectedBaseModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                >
                  {DEFAULT_MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-card text-foreground font-sans">
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Suffix */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Custom Model Suffix
                </label>
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder="e.g. legal-auditor-v1"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                />
                <span className="text-[10px] text-muted-foreground font-mono block">
                  Resulting model identifier: {selectedBaseModel}:{suffix || 'suffix'}
                </span>
              </div>

              {/* Hyperparameters Grid */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Epochs</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={nEpochs}
                    onChange={(e) => setNEpochs(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Batch Size</label>
                  <input
                    type="number"
                    min="1"
                    max="32"
                    value={batchSize}
                    onChange={(e) => setBatchSize(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">LR Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={learningRate}
                    onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground font-mono"
                  />
                </div>
              </div>

              {/* Training Dataset JSONL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Training Dataset (JSONL format)
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    OpenAI messages format
                  </span>
                </div>
                <textarea
                  value={trainingFileContent}
                  onChange={(e) => setTrainingFileContent(e.target.value)}
                  rows={5}
                  required
                  className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary leading-relaxed resize-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Provisioning Job...' : 'Launch Training Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Events Stream Drawer */}
      {selectedJobForEvents && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="bg-card border-l border-border w-full max-w-lg h-full flex flex-col p-6 space-y-4 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Lifecycle Event Ledger</h3>
              </div>
              <button
                onClick={() => setSelectedJobForEvents(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border font-mono text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">Job ID: </span>
                <span className="text-foreground font-semibold">{selectedJobForEvents.id}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Model: </span>
                <span className="text-primary font-semibold">{selectedJobForEvents.model}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Target Adapter: </span>
                <span className="text-emerald-400 font-semibold">
                  {selectedJobForEvents.fine_tuned_model || 'Pending checkpoint'}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loadingEvents ? (
                <div className="text-center py-8 text-xs text-muted-foreground font-mono">
                  Loading event stream...
                </div>
              ) : jobEvents.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No events logged yet for this job.
                </div>
              ) : (
                jobEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-muted/30 border border-border/80 font-mono text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span
                        className={`font-bold uppercase ${
                          ev.level === 'warn'
                            ? 'text-amber-400'
                            : ev.level === 'error'
                            ? 'text-rose-400'
                            : 'text-primary'
                        }`}
                      >
                        [{ev.level}]
                      </span>
                      <span>{new Date(ev.created_at * 1000).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-foreground leading-relaxed">{ev.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <button
                onClick={() => setSelectedJobForEvents(null)}
                className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
