'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import {
  Layers,
  UploadCloud,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  XCircle,
  RefreshCw,
  Plus,
  Percent,
  FileCode,
  Sparkles,
} from 'lucide-react';

interface BatchJob {
  id: string;
  inputFileId: string;
  outputFileId?: string;
  errorFileId?: string;
  endpoint: string;
  status: 'VALIDATING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLING' | 'CANCELLED';
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  completionWindow: string;
  expiresAt: string;
  createdAt: string;
  completedAt?: string;
}

export default function BatchesPage() {
  const { success, error: toastError } = useToast();
  const [batches, setBatches] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [filename, setFilename] = useState('batch_input.jsonl');
  const [fileContent, setFileContent] = useState(
    JSON.stringify({
      custom_id: 'req-001',
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'llama-3.3-70b',
        messages: [{ role: 'user', content: 'Explain quantum computing in one sentence.' }],
      },
    }) +
      '\n' +
      JSON.stringify({
        custom_id: 'req-002',
        method: 'POST',
        url: '/v1/chat/completions',
        body: {
          model: 'qwen-2.5-coder-32b',
          messages: [{ role: 'user', content: 'Write a quicksort implementation in Python.' }],
        },
      })
  );
  const [completionWindow, setCompletionWindow] = useState('24h');

  const fetchBatches = async () => {
    try {
      const res = await apiRequest('/v1/batches');
      if (res && res.data) {
        const normalized: BatchJob[] = res.data.map((b: any) => ({
          id: b.id,
          inputFileId: b.inputFileId || b.input_file_id || '',
          outputFileId: b.outputFileId || b.output_file_id || undefined,
          errorFileId: b.errorFileId || b.error_file_id || undefined,
          endpoint: b.endpoint || '/v1/chat/completions',
          status: (b.status || 'IN_PROGRESS').toUpperCase(),
          totalRequests: b.request_counts?.total ?? b.totalRequests ?? 0,
          completedRequests: b.request_counts?.completed ?? b.completedRequests ?? 0,
          failedRequests: b.request_counts?.failed ?? b.failedRequests ?? 0,
          completionWindow: b.completionWindow || b.completion_window || '24h',
          expiresAt: b.expiresAt || (b.expires_at ? new Date(b.expires_at * 1000).toISOString() : ''),
          createdAt: b.createdAt || (b.created_at ? new Date(b.created_at * 1000).toISOString() : new Date().toISOString()),
          completedAt: b.completedAt || (b.completed_at ? new Date(b.completed_at * 1000).toISOString() : undefined),
        }));
        setBatches(normalized);
      }
    } catch (err: any) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    const interval = setInterval(fetchBatches, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileContent.trim()) {
      toastError('JSONL content is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload file
      const uploadedFile = await apiRequest('/v1/files', {
        method: 'POST',
        body: JSON.stringify({
          filename: filename.trim() || 'batch_input.jsonl',
          content: fileContent,
          purpose: 'batch',
        }),
      });

      // 2. Queue batch
      await apiRequest('/v1/batches', {
        method: 'POST',
        body: JSON.stringify({
          input_file_id: uploadedFile.id,
          endpoint: '/v1/chat/completions',
          completion_window: completionWindow,
          metadata: { created_via: 'dashboard' },
        }),
      });

      success('Batch job queued successfully with 50% discount!');
      setShowCreateModal(false);
      fetchBatches();
    } catch (err: any) {
      toastError(err.message || 'Failed to submit batch job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBatch = async (id: string) => {
    try {
      await apiRequest(`/v1/batches/${id}/cancel`, { method: 'POST' });
      success('Cancellation initiated.');
      fetchBatches();
    } catch (err: any) {
      toastError(err.message || 'Failed to cancel batch.');
    }
  };

  const handleDownloadContent = async (fileId: string, outputName: string) => {
    try {
      const content = await apiRequest(`/v1/files/${fileId}/content`);
      const blob = new Blob([typeof content === 'string' ? content : JSON.stringify(content, null, 2)], {
        type: 'application/jsonl',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toastError(err.message || 'Failed to download output file.');
    }
  };

  const completedCount = batches.filter((b) => b.status === 'COMPLETED').length;
  const inProgressCount = batches.filter((b) => b.status === 'IN_PROGRESS' || b.status === 'VALIDATING').length;

  const getStatusBadge = (status: BatchJob['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <Clock className="w-3 h-3" />
            <span>In Progress</span>
          </span>
        );
      case 'VALIDATING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>Validating</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      case 'CANCELLED':
      case 'CANCELLING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
            <XCircle className="w-3 h-3" />
            <span>{status === 'CANCELLING' ? 'Cancelling...' : 'Cancelled'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-card via-card/80 to-primary/5 border border-border relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight">Batch Inference Jobs</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/20 text-primary border border-primary/30 flex items-center space-x-1">
              <Percent className="w-3 h-3" />
              <span>50% OFF Realtime Rate</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Execute large-scale, asynchronous inference workloads with a guaranteed 24-hour SLA across cloud GPU clusters.
          </p>
        </div>

        <div className="flex items-center space-x-3 relative z-10">
          <button
            onClick={fetchBatches}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Batch Job</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Total Batches</div>
            <div className="text-2xl font-bold font-mono">{batches.length}</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">In Progress</div>
            <div className="text-2xl font-bold font-mono">{inProgressCount}</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Completed</div>
            <div className="text-2xl font-bold font-mono">{completedCount}</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Cost Savings</div>
            <div className="text-2xl font-bold font-mono text-primary">50.0%</div>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="rounded-3xl bg-card border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold text-sm">Batch Jobs Log</div>
          <span className="text-xs text-muted-foreground font-mono">{batches.length} jobs total</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading batch jobs...</div>
        ) : batches.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mx-auto text-muted-foreground">
              <Layers className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold">No batch jobs yet</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Upload a `.jsonl` dataset with OpenAI chat completion queries to run bulk inference with a 50% discount.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
            >
              Submit First Batch
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3">Batch ID</th>
                  <th className="px-6 py-3">Endpoint</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Progress</th>
                  <th className="px-6 py-3">Window</th>
                  <th className="px-6 py-3">Submitted</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batches.map((batch) => {
                  const percent =
                    batch.totalRequests > 0
                      ? Math.round(((batch.completedRequests + batch.failedRequests) / batch.totalRequests) * 100)
                      : 0;

                  return (
                    <tr key={batch.id} className="hover:bg-muted/20 transition-all font-mono">
                      <td className="px-6 py-4 font-semibold text-foreground">
                        <div className="flex items-center space-x-2">
                          <span>{batch.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{batch.endpoint}</td>
                      <td className="px-6 py-4">{getStatusBadge(batch.status)}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 w-36">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{batch.completedRequests + batch.failedRequests} / {batch.totalRequests}</span>
                            <span>{percent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{batch.completionWindow}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(batch.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {batch.outputFileId && (
                            <button
                              onClick={() => handleDownloadContent(batch.outputFileId!, `output_${batch.id}.jsonl`)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 flex items-center space-x-1 text-[11px] font-sans font-semibold transition-all"
                              title="Download Results JSONL"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Output</span>
                            </button>
                          )}
                          {batch.errorFileId && (
                            <button
                              onClick={() => handleDownloadContent(batch.errorFileId!, `errors_${batch.id}.jsonl`)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center space-x-1 text-[11px] font-sans font-semibold transition-all"
                              title="Download Errors JSONL"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Errors</span>
                            </button>
                          )}
                          {(batch.status === 'VALIDATING' || batch.status === 'IN_PROGRESS') && (
                            <button
                              onClick={() => handleCancelBatch(batch.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground border border-border hover:bg-red-500/10 hover:text-red-400 flex items-center space-x-1 text-[11px] font-sans font-semibold transition-all"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          )}
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

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Submit Asynchronous Batch Job</h3>
                  <p className="text-xs text-muted-foreground">Processed at 50% discount with a 24-hour turnaround SLA.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">File Name</label>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="batch_queries.jsonl"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">JSONL Requests Content</label>
                  <span className="text-[10px] text-muted-foreground font-mono">One JSON object per line</span>
                </div>
                <textarea
                  rows={8}
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Target API Endpoint</label>
                  <input
                    type="text"
                    value="/v1/chat/completions"
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border text-muted-foreground text-xs font-mono cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Completion Window SLA</label>
                  <select
                    value={completionWindow}
                    onChange={(e) => setCompletionWindow(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="24h">24 Hours (50% Discount)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-muted-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting Batch...' : 'Queue Batch Job'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

