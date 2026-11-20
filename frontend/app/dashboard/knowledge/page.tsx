'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import {
  BookOpen,
  Plus,
  Trash2,
  Search,
  Sparkles,
  RefreshCw,
  FileText,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  ChevronRight,
  Database,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  category?: string;
  chunkCount: number;
  createdAt: string;
}

interface Citation {
  docId: string;
  docTitle: string;
  chunkIndex: number;
  score: number;
  text: string;
}

interface RagResult {
  query: string;
  answer: string;
  model: string;
  citations: Citation[];
  latencyMs: number;
}

export default function KnowledgePage() {
  const { success, error: toastError, info } = useToast();

  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Upload Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Architecture');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // RAG Query State
  const [query, setQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama3.2:1b');
  const [topK, setTopK] = useState(3);
  const [querying, setQuerying] = useState(false);
  const [result, setResult] = useState<RagResult | null>(null);
  const [expandedSources, setExpandedSources] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDocuments = async () => {
    setLoadingDocs(true);
    try {
      const data = await apiRequest('/api/knowledge/documents');
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toastError('Title and content are required.');
      return;
    }
    setUploading(true);
    try {
      const newDoc = await apiRequest('/api/knowledge/documents', {
        method: 'POST',
        body: JSON.stringify({ title, content, category }),
      });
      success(`Indexed document '${title}' with ${newDoc.chunkCount} vector chunks!`);
      setTitle('');
      setContent('');
      setShowUploadModal(false);
      loadDocuments();
    } catch (err: any) {
      toastError(err.message || 'Failed to index document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string, docTitle: string) => {
    if (!confirm(`Delete '${docTitle}' from the knowledge base?`)) return;
    setDeletingId(id);
    try {
      await apiRequest(`/api/knowledge/documents/${id}`, { method: 'DELETE' });
      success(`Document deleted.`);
      loadDocuments();
    } catch (err: any) {
      toastError(err.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      toastError('Please enter a question.');
      return;
    }
    setQuerying(true);
    setResult(null);
    try {
      const ragData = await apiRequest('/api/knowledge/query', {
        method: 'POST',
        body: JSON.stringify({
          query: query.trim(),
          model: selectedModel,
          topK,
        }),
      });
      setResult(ragData);
    } catch (err: any) {
      toastError(err.message || 'Failed to generate grounded answer');
    } finally {
      setQuerying(false);
    }
  };

  const sampleQuestions = [
    'How does continuous batching improve latency in YOYO?',
    'Where are model weights stored and how is privacy ensured?',
    'What embedding model is used for local vector search?',
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <span>Local RAG & Document Knowledge Base</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
              nomic-embed-text • 768 Dimensions
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Ground your local LLM responses in proprietary enterprise documents with sub-second semantic retrieval.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-sm transition-all shadow-cyan-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
          <button
            onClick={() => loadDocuments()}
            className="p-2 rounded-xl bg-card border border-border hover:bg-muted text-muted-foreground hover:text-white transition-all"
            title="Refresh documents"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Left Documents, Right Grounded QA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Document Vault (4 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Indexed Documents ({documents.length})</span>
            </h2>
            <span className="text-[11px] font-mono text-zinc-400">
              Total Chunks: {documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0)}
            </span>
          </div>

          <div className="space-y-3">
            {documents.length === 0 && !loadingDocs && (
              <div className="p-8 text-center rounded-2xl bg-card/60 border border-border text-muted-foreground text-xs space-y-2">
                <FileText className="w-8 h-8 mx-auto text-zinc-600" />
                <p>No documents uploaded yet.</p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="text-cyan-400 hover:underline font-mono"
                >
                  Index your first document &rarr;
                </button>
              </div>
            )}

            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-xl bg-card border border-border/80 hover:border-cyan-500/40 transition-all space-y-2.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {doc.category || 'General'}
                    </span>
                    <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {doc.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleDeleteDoc(doc.id, doc.title)}
                    disabled={deletingId === doc.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete document"
                  >
                    {deletingId === doc.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-sans">
                  {doc.content}
                </p>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{doc.chunkCount} vector chunks</span>
                  </span>
                  <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Grounded Q&A Assistant (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/60">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Ask Grounded Knowledge Assistant</h2>
              </div>

              {/* Model & Settings */}
              <div className="flex items-center space-x-2 text-xs">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-border text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="llama3.2:1b">Llama 3.2 1B (Local)</option>
                  <option value="qwen2.5-coder:1.5b">Qwen 2.5 Coder 1.5B (Local)</option>
                  <option value="deepseek-r1:1.5b">DeepSeek R1 1.5B (Reasoning)</option>
                </select>

                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-border text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value={2}>Top 2 Chunks</option>
                  <option value={3}>Top 3 Chunks</option>
                  <option value={5}>Top 5 Chunks</option>
                </select>
              </div>
            </div>

            {/* Query Form */}
            <form onSubmit={handleAsk} className="space-y-3">
              <div className="relative">
                <textarea
                  rows={3}
                  placeholder="Ask any question grounded strictly in your indexed documents..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleAsk();
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-border text-white text-xs placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400 font-sans leading-relaxed resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 text-[11px] text-muted-foreground font-mono">
                  <span>Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-white text-[10px]">Ctrl+Enter</kbd> to search</span>
                </div>

                <button
                  type="submit"
                  disabled={querying || !query.trim()}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm shadow-cyan-600/30"
                >
                  {querying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Retrieving & Reasoning...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Ask Knowledge Base</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Sample Question Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground font-mono">Try:</span>
              {sampleQuestions.map((sq) => (
                <button
                  key={sq}
                  type="button"
                  onClick={() => {
                    setQuery(sq);
                  }}
                  className="text-left px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-cyan-500/10 border border-white/[0.08] hover:border-cyan-500/30 text-[11px] text-zinc-300 hover:text-cyan-400 font-mono transition-all"
                >
                  {sq}
                </button>
              ))}
            </div>

            {/* Answer Display */}
            {result && (
              <div className="pt-4 border-t border-border/60 space-y-4 animate-in fade-in duration-300">
                <div className="p-5 rounded-2xl bg-[#090B12] border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Grounded Synthesized Answer</span>
                    </span>
                    <span className="text-zinc-400 text-[11px]">
                      Model: <span className="text-white font-semibold">{result.model}</span> • Latency:{' '}
                      <span className="text-emerald-400 font-semibold">{result.latencyMs}ms</span>
                    </span>
                  </div>

                  <div className="text-xs text-zinc-100 leading-relaxed font-sans whitespace-pre-wrap">
                    {result.answer}
                  </div>
                </div>

                {/* Sources & Citations Accordion */}
                <div className="border border-border/80 rounded-xl overflow-hidden bg-card/40">
                  <button
                    type="button"
                    onClick={() => setExpandedSources(!expandedSources)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-mono text-zinc-300 hover:bg-muted/40 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Verified Sources & Citations ({result.citations.length})</span>
                    </span>
                    {expandedSources ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {expandedSources && (
                    <div className="p-4 border-t border-border/60 space-y-3">
                      {result.citations.map((c, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-black/40 border border-border/60 space-y-1.5 text-xs font-mono"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-cyan-300 font-bold">
                              [Source {idx + 1}] {c.docTitle} (Chunk {c.chunkIndex})
                            </span>
                            <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              {(c.score * 100).toFixed(1)}% Semantic Match
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-300 font-sans italic leading-relaxed">
                            "{c.text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Upload Document */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B0D17] border border-border rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Upload Knowledge Document</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-muted-foreground hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUploadDoc} className="space-y-4 text-xs">
              <div>
                <label className="text-muted-foreground font-mono block mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Platform SLA, GPU Deployment Specs, API Guidelines"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="text-muted-foreground font-mono block mb-1">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Architecture, Compliance, Infrastructure"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="text-muted-foreground font-mono block mb-1">
                  Document Content (Markdown or Raw Text) *
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="Paste documentation, architecture diagrams, compliance rules, or policy text..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-white focus:outline-none focus:border-cyan-400 font-mono leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-white font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold flex items-center space-x-1.5 transition-all shadow-sm shadow-cyan-600/30"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Embedding & Indexing...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Index Document</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
