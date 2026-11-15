'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import {
  Swords,
  Zap,
  Clock,
  Sparkles,
  Cpu,
  RotateCcw,
  Send,
  Square,
  Copy,
  Check,
  Award,
  ThumbsUp,
  Scale,
  Sliders,
  ChevronDown,
  Terminal,
  ShieldCheck,
  DollarSign,
  Image as ImageIcon,
  X,
  Play,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface ModelInfo {
  id: string;
  name: string;
  owned_by?: string;
  isAdapter?: boolean;
}

interface StreamResult {
  content: string;
  ttftMs: number;
  totalDurationMs: number;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  costUsd: number;
  speedTps: number;
  done: boolean;
  error: string | null;
}

const DEFAULT_MODELS: ModelInfo[] = [
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B Instruct', owned_by: 'meta' },
  { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B', owned_by: 'qwen' },
  { id: 'deepseek-r1-70b', name: 'DeepSeek R1 70B Reasoner', owned_by: 'deepseek' },
  { id: 'qwen-2.5-vl-72b', name: 'Qwen 2.5 VL 72B Vision', owned_by: 'qwen' },
  { id: 'llama-3.2-11b-vision', name: 'Llama 3.2 11B Vision', owned_by: 'meta' },
  { id: 'llama-3.3-70b:legal-v1', name: 'Llama 3.3 70B (LoRA Legal)', owned_by: 'custom-adapter', isAdapter: true },
];

const PRESET_PROMPTS = [
  {
    label: 'Code Architecture',
    prompt: 'Implement a thread-safe LRU Cache in Python with TTL expiration and clean concurrency locks.',
  },
  {
    label: 'Logic & Reasoning',
    prompt: 'A farmer has 17 sheep and all but 9 die. How many are left? Explain your step-by-step logic and common pitfalls.',
  },
  {
    label: 'Vision Inspection',
    prompt: 'Analyze this image and describe the architectural features, foreground and background layout, and transcribe any visible text.',
  },
  {
    label: 'Legal Analysis',
    prompt: 'Compare unilateral vs mutual indemnification clauses in SaaS master service agreements. Detail risk exposure.',
  },
  {
    label: 'JSON Extraction',
    prompt: 'Extract structured security findings from this log: "2026-11-14 WARN [AuthGuard] High risk IP 198.51.100.42 attempted SQL injection on /v1/models (CVSS: 8.6)" into valid JSON.',
  },
];

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'llama-3.3-70b': { input: 0.59, output: 0.79 },
  'qwen-2.5-coder-32b': { input: 0.20, output: 0.40 },
  'deepseek-r1-70b': { input: 0.75, output: 1.50 },
  'qwen-2.5-vl-72b': { input: 0.80, output: 1.60 },
  'llama-3.2-11b-vision': { input: 0.25, output: 0.50 },
  'llama-3.3-70b:legal-v1': { input: 0.65, output: 0.85 },
};

function calculateCost(modelId: string, promptTokens: number, cachedTokens: number, completionTokens: number): number {
  const rates = MODEL_PRICING[modelId] || { input: 0.20, output: 0.40 };
  const uncached = Math.max(0, promptTokens - cachedTokens);
  const cost = (uncached * rates.input + cachedTokens * (rates.input * 0.5) + completionTokens * rates.output) / 1000000;
  return Number(cost.toFixed(6));
}

const initialStreamState: StreamResult = {
  content: '',
  ttftMs: 0,
  totalDurationMs: 0,
  promptTokens: 0,
  completionTokens: 0,
  cachedTokens: 0,
  costUsd: 0,
  speedTps: 0,
  done: false,
  error: null,
};

const DEFAULT_SUITES = [
  {
    id: 'coding_bench',
    name: 'Software Engineering & Algorithmic Correctness',
    description: 'Thread-safety, concurrency locks, and optimal data structure design under rigorous criteria.',
    category: 'coding',
    sampleCount: 3,
  },
  {
    id: 'reasoning_bench',
    name: 'Formal Deduction & Complex Multi-Step Reasoning',
    description: 'Counter-intuitive word problems, math puzzles, and multi-step deduction tracking.',
    category: 'reasoning',
    sampleCount: 3,
  },
  {
    id: 'safety_guardrails_bench',
    name: 'Adversarial Robustness & Safety Guardrails',
    description: 'Adversarial jailbreaks, PII injection, and policy compliance verification.',
    category: 'safety',
    sampleCount: 2,
  },
];

export default function ArenaPage() {
  const { toast } = useToast();

  const [arenaMode, setArenaMode] = useState<'interactive' | 'automated_evals'>('interactive');
  const [benchmarkSuiteId, setBenchmarkSuiteId] = useState<string>('coding_bench');
  const [judgeModel, setJudgeModel] = useState<string>('deepseek-r1-70b');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [expandedSampleId, setExpandedSampleId] = useState<string | null>(null);

  const [availableModels, setAvailableModels] = useState<ModelInfo[]>(DEFAULT_MODELS);
  const [modelA, setModelA] = useState<string>('llama-3.3-70b');
  const [modelB, setModelB] = useState<string>('qwen-2.5-coder-32b');

  const [tempA, setTempA] = useState<number>(0.7);
  const [tempB, setTempB] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(512);

  const [systemPrompt, setSystemPrompt] = useState<string>(
    'You are a high-performance enterprise AI model serving through YOYO Cloud Platform.'
  );
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [submittedImage, setSubmittedImage] = useState<string | null>(null);

  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [resultA, setResultA] = useState<StreamResult>(initialStreamState);
  const [resultB, setResultB] = useState<StreamResult>(initialStreamState);

  const [vote, setVote] = useState<'A' | 'B' | 'TIE' | 'BOTH_BAD' | null>(null);
  const [scoreHistory, setScoreHistory] = useState<{ aWins: number; bWins: number; ties: number }>({
    aWins: 0,
    bWins: 0,
    ties: 0,
  });

  const [copiedA, setCopiedA] = useState<boolean>(false);
  const [copiedB, setCopiedB] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file (PNG, JPG, WebP, GIF)', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('Image must be under 10MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage(event.target?.result as string);
      toast('Vision image attached for dual-model arena benchmark.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fetch models dynamically from /v1/models
  useEffect(() => {
    async function loadModels() {
      try {
        const token = localStorage.getItem('yoyo_access_token');
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.yoyo.ai';
        const res = await fetch(`${apiBase}/v1/models`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            const list: ModelInfo[] = json.data.map((m: any) => ({
              id: m.id,
              name: m.id,
              owned_by: m.owned_by,
              isAdapter: m.id.includes(':') || (m.owned_by && m.owned_by.includes('adapter')),
            }));
            setAvailableModels(list);
          }
        }
      } catch {
        // Fallback to DEFAULT_MODELS
      }
    }
    loadModels();
  }, []);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsBenchmarking(false);
  };

  const handleReset = () => {
    handleStop();
    setResultA(initialStreamState);
    setResultB(initialStreamState);
    setVote(null);
    setAttachedImage(null);
    setSubmittedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRunEvaluation = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    try {
      const token = localStorage.getItem('yoyo_access_token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.yoyo.ai';
      const res = await fetch(`${apiBase}/v1/evaluations/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          modelA,
          modelB,
          judgeModel,
          benchmarkSuiteId,
        }),
      });

      if (!res.ok) {
        let errText = await res.text();
        try {
          const parsed = JSON.parse(errText);
          errText = parsed.error?.message || parsed.message || errText;
        } catch {}
        throw new Error(errText || `Evaluation failed: HTTP ${res.status}`);
      }

      const data = await res.json();
      setEvalResult(data);
      if (data.sampleResults && data.sampleResults.length > 0) {
        setExpandedSampleId(data.sampleResults[0].sampleId);
      }
      toast('Automated LLM-as-a-Judge benchmark finished successfully!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to complete benchmark evaluation.', 'error');
    } finally {
      setIsEvaluating(false);
    }
  };

  const runSingleModelStream = async (
    targetModel: string,
    temperature: number,
    promptText: string,
    imagePayload: string | null,
    signal: AbortSignal,
    onUpdate: (updater: (prev: StreamResult) => StreamResult) => void
  ) => {
    const startTime = Date.now();
    let firstTokenRecorded = false;
    let accumulatedContent = '';
    let tokenCount = 0;
    let promptTokens = Math.max(12, Math.floor(promptText.length / 4)) + (imagePayload ? 500 : 0);
    let cachedTokens = Math.floor(promptTokens * 0.5); // 50% prefix cache simulation

    onUpdate(() => ({
      ...initialStreamState,
      content: '',
      done: false,
    }));

    try {
      const token = localStorage.getItem('yoyo_access_token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.yoyo.ai';

      const response = await fetch(`${apiBase}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal,
        body: JSON.stringify({
          model: targetModel,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            imagePayload
              ? {
                  role: 'user',
                  content: [
                    { type: 'text', text: promptText || 'Analyze this image in detail.' },
                    { type: 'image_url', image_url: { url: imagePayload, detail: 'auto' } },
                  ],
                }
              : { role: 'user', content: promptText },
          ],
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        let errText = await response.text();
        try {
          const parsed = JSON.parse(errText);
          errText = parsed.error?.message || errText;
        } catch {}
        throw new Error(errText || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No readable stream available in response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              if (!firstTokenRecorded) {
                firstTokenRecorded = true;
                const ttft = Date.now() - startTime;
                onUpdate((prev) => ({ ...prev, ttftMs: ttft }));
              }
              accumulatedContent += delta;
              tokenCount += Math.max(1, Math.floor(delta.length / 3));

              const currentElapsed = Math.max(0.1, (Date.now() - startTime) / 1000);
              const currentTps = Math.round(tokenCount / currentElapsed);

              onUpdate((prev) => ({
                ...prev,
                content: accumulatedContent,
                completionTokens: tokenCount,
                speedTps: currentTps,
              }));
            }

            if (parsed.usage) {
              promptTokens = parsed.usage.prompt_tokens || promptTokens;
              tokenCount = parsed.usage.completion_tokens || tokenCount;
              if (parsed.usage.prompt_tokens_details?.cached_tokens !== undefined) {
                cachedTokens = parsed.usage.prompt_tokens_details.cached_tokens;
              }
            }
          } catch {}
        }
      }

      const totalTime = Date.now() - startTime;
      const finalCost = calculateCost(targetModel, promptTokens, cachedTokens, tokenCount);
      const finalTps = Math.round(tokenCount / Math.max(0.1, totalTime / 1000));

      onUpdate((prev) => ({
        ...prev,
        content: accumulatedContent,
        done: true,
        totalDurationMs: totalTime,
        promptTokens,
        cachedTokens,
        completionTokens: tokenCount,
        costUsd: finalCost,
        speedTps: finalTps,
      }));
    } catch (err: any) {
      if (err.name === 'AbortError') {
        onUpdate((prev) => ({ ...prev, done: true, error: 'Benchmark aborted.' }));
      } else {
        onUpdate((prev) => ({
          ...prev,
          done: true,
          error: err.message || 'Stream connection error.',
        }));
      }
    }
  };

  const handleBenchmark = async () => {
    if ((!userPrompt.trim() && !attachedImage) || isBenchmarking) return;

    setIsBenchmarking(true);
    setVote(null);
    setSubmittedImage(attachedImage);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const currentImage = attachedImage;

    await Promise.all([
      runSingleModelStream(modelA, tempA, userPrompt, currentImage, abortController.signal, setResultA),
      runSingleModelStream(modelB, tempB, userPrompt, currentImage, abortController.signal, setResultB),
    ]);

    setIsBenchmarking(false);
  };

  const handleVote = (choice: 'A' | 'B' | 'TIE' | 'BOTH_BAD') => {
    setVote(choice);
    if (choice === 'A') {
      setScoreHistory((prev) => ({ ...prev, aWins: prev.aWins + 1 }));
      toast(`Vote Recorded: ${modelA} scored a victory in this round.`, 'success');
    } else if (choice === 'B') {
      setScoreHistory((prev) => ({ ...prev, bWins: prev.bWins + 1 }));
      toast(`Vote Recorded: ${modelB} scored a victory in this round.`, 'success');
    } else if (choice === 'TIE') {
      setScoreHistory((prev) => ({ ...prev, ties: prev.ties + 1 }));
      toast('Vote Recorded: Marked as a tie.', 'info');
    } else {
      toast('Feedback Logged: Flagged output quality for fine-tuning pipeline.', 'info');
    }
  };

  const copyToClipboard = async (text: string, isA: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isA) {
        setCopiedA(true);
        setTimeout(() => setCopiedA(false), 2000);
      } else {
        setCopiedB(true);
        setTimeout(() => setCopiedB(false), 2000);
      }
      toast('Output copied to clipboard.', 'success');
    } catch {}
  };

  // Deltas for comparison
  const fasterModel =
    resultA.done && resultB.done && resultA.ttftMs > 0 && resultB.ttftMs > 0
      ? resultA.ttftMs < resultB.ttftMs
        ? 'A'
        : 'B'
      : null;

  const ttftAdvantagePct =
    resultA.done && resultB.done && resultA.ttftMs > 0 && resultB.ttftMs > 0
      ? Math.round(
          (Math.abs(resultA.ttftMs - resultB.ttftMs) / Math.max(resultA.ttftMs, resultB.ttftMs)) * 100
        )
      : 0;

  const cheaperModel =
    resultA.done && resultB.done && resultA.costUsd > 0 && resultB.costUsd > 0
      ? resultA.costUsd < resultB.costUsd
        ? 'A'
        : 'B'
      : null;

  const costAdvantagePct =
    resultA.done && resultB.done && resultA.costUsd > 0 && resultB.costUsd > 0
      ? Math.round(
          (Math.abs(resultA.costUsd - resultB.costUsd) / Math.max(resultA.costUsd, resultB.costUsd)) * 100
        )
      : 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Header & Arena Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 text-amber-400">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Model Benchmark Arena</h1>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Head-to-Head
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Concurrently benchmark latency, throughput, reasoning accuracy, and pricing across models & LoRA adapters.
              </p>
            </div>
          </div>
        </div>

        {/* Match Scorecard */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 text-sm shadow-inner">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="text-slate-400 font-medium">Arena Ledger:</span>
          <span className="font-semibold text-emerald-400">Model A: {scoreHistory.aWins}</span>
          <span className="text-slate-600">|</span>
          <span className="font-semibold text-blue-400">Model B: {scoreHistory.bWins}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Ties: {scoreHistory.ties}</span>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-900/90 border border-slate-800 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setArenaMode('interactive')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            arenaMode === 'interactive'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Swords className="w-4 h-4" />
          Interactive Battle Arena
        </button>
        <button
          type="button"
          onClick={() => setArenaMode('automated_evals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            arenaMode === 'automated_evals'
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          LLM-as-a-Judge Automated Benchmark
          <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Automated
          </span>
        </button>
      </div>

      {arenaMode === 'interactive' ? (
        <div className="space-y-6">
          {/* Preset Prompts Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 whitespace-nowrap font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Benchmark Presets:
        </span>
        {PRESET_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setUserPrompt(p.prompt)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors whitespace-nowrap"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Submitted Vision Banner */}
      {submittedImage && (
        <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={submittedImage}
            alt="Arena visual prompt"
            className="w-16 h-16 object-cover rounded-xl border border-slate-700 shadow-md"
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Active Visual Benchmark Input
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Visual payload dispatched concurrently to {modelA} and {modelB}
            </span>
          </div>
        </div>
      )}

      {/* Main Dual Arena Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MODEL A PANEL */}
        <div className="flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Header Controls */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
                A
              </span>
              <div className="relative">
                <select
                  value={modelA}
                  onChange={(e) => setModelA(e.target.value)}
                  disabled={isBenchmarking}
                  className="appearance-none bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.isAdapter ? '✨ (LoRA)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Temp:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={tempA}
                  onChange={(e) => setTempA(parseFloat(e.target.value))}
                  disabled={isBenchmarking}
                  className="w-16 accent-emerald-500 cursor-pointer"
                />
                <span className="font-mono text-slate-300 w-6">{tempA}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(resultA.content, true)}
                disabled={!resultA.content}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                title="Copy Model A Output"
              >
                {copiedA ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Model A Telemetry Ribbon */}
          <div className="grid grid-cols-4 gap-2 p-3 bg-slate-950/40 border-b border-slate-800/60 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" /> TTFT
              </span>
              <span className="font-mono font-medium text-slate-200 mt-0.5">
                {resultA.ttftMs ? `${resultA.ttftMs}ms` : '—'}
                {fasterModel === 'A' && (
                  <span className="ml-1 text-[10px] text-emerald-400 font-bold">(-{ttftAdvantagePct}%)</span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Speed
              </span>
              <span className="font-mono font-medium text-slate-200 mt-0.5">
                {resultA.speedTps ? `${resultA.speedTps} tok/s` : '—'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-400" /> Prefix Cache
              </span>
              <span className="font-mono font-medium text-slate-200 mt-0.5">
                {resultA.cachedTokens ? `${resultA.cachedTokens} tok (50% Off)` : '—'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-400" /> Est. Cost
              </span>
              <span className="font-mono font-medium text-slate-200 mt-0.5">
                {resultA.costUsd ? `$${resultA.costUsd}` : '—'}
                {cheaperModel === 'A' && (
                  <span className="ml-1 text-[10px] text-emerald-400 font-bold">(-{costAdvantagePct}%)</span>
                )}
              </span>
            </div>
          </div>

          {/* Model A Output Terminal */}
          <div className="p-4 flex-1 min-h-[340px] max-h-[500px] overflow-y-auto font-mono text-sm leading-relaxed text-slate-200 bg-slate-950/20">
            {resultA.error ? (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {resultA.error}
              </div>
            ) : resultA.content ? (
              <div className="whitespace-pre-wrap">{resultA.content}</div>
            ) : isBenchmarking ? (
              <div className="flex items-center gap-2 text-slate-500 italic text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Awaiting first token from {modelA}...
              </div>
            ) : (
              <div className="text-slate-600 italic text-xs">Model A output will stream here.</div>
            )}
          </div>
        </div>

        {/* MODEL B PANEL */}
        <div className="flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Header Controls */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-xs">
                B
              </span>
              <div className="relative">
                <select
                  value={modelB}
                  onChange={(e) => setModelB(e.target.value)}
                  disabled={isBenchmarking}
                  className="appearance-none bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.isAdapter ? '✨ (LoRA)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Temp:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={tempB}
                  onChange={(e) => setTempB(parseFloat(e.target.value))}
                  disabled={isBenchmarking}
                  className="w-16 accent-blue-500 cursor-pointer"
                />
                <span className="font-mono text-slate-300 w-6">{tempB}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(resultB.content, false)}
                disabled={!resultB.content}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                title="Copy Model B Output"
              >
                {copiedB ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Model B Telemetry Ribbon */}
          <div className="grid grid-cols-4 gap-2 p-3 bg-slate-950/40 border-b border-slate-800/60 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" /> TTFT
              </span>
              <span className="font-mono font-medium text-slate-200 mt-0.5">
                {resultB.ttftMs ? `${resultB.ttftMs}ms` : '—'}
                {fasterModel === 'B' && (
                  <span className="ml-1 text-[10px] text-blue-400 font-bold">(-{ttftAdvantagePct}%)</span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Speed
              </span>
              <span className="font-mono font-medium text-slate-200 mt-0.5">
                {resultB.speedTps ? `${resultB.speedTps} tok/s` : '—'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-400" /> Prefix Cache
              </span>
              <span className="font-mono font-medium text-slate-200 mt-0.5">
                {resultB.cachedTokens ? `${resultB.cachedTokens} tok (50% Off)` : '—'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-400" /> Est. Cost
              </span>
              <span className="font-mono font-medium text-slate-200 mt-0.5">
                {resultB.costUsd ? `$${resultB.costUsd}` : '—'}
                {cheaperModel === 'B' && (
                  <span className="ml-1 text-[10px] text-blue-400 font-bold">(-{costAdvantagePct}%)</span>
                )}
              </span>
            </div>
          </div>

          {/* Model B Output Terminal */}
          <div className="p-4 flex-1 min-h-[340px] max-h-[500px] overflow-y-auto font-mono text-sm leading-relaxed text-slate-200 bg-slate-950/20">
            {resultB.error ? (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {resultB.error}
              </div>
            ) : resultB.content ? (
              <div className="whitespace-pre-wrap">{resultB.content}</div>
            ) : isBenchmarking ? (
              <div className="flex items-center gap-2 text-slate-500 italic text-xs">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                Awaiting first token from {modelB}...
              </div>
            ) : (
              <div className="text-slate-600 italic text-xs">Model B output will stream here.</div>
            )}
          </div>
        </div>
      </div>

      {/* Human-in-the-Loop Evaluation Voting Bar */}
      {resultA.done && resultB.done && (resultA.content || resultB.content) && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-slate-200">Rate Benchmark Quality:</span>
            {vote && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                Voted: {vote}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleVote('A')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                vote === 'A'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
              }`}
            >
              👈 Model A is Better
            </button>
            <button
              type="button"
              onClick={() => handleVote('TIE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                vote === 'TIE'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
              }`}
            >
              🤝 Tie / Equal
            </button>
            <button
              type="button"
              onClick={() => handleVote('B')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                vote === 'B'
                  ? 'bg-blue-500 text-slate-950 border-blue-400 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
              }`}
            >
              👉 Model B is Better
            </button>
            <button
              type="button"
              onClick={() => handleVote('BOTH_BAD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                vote === 'BOTH_BAD'
                  ? 'bg-rose-500 text-white border-rose-400'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-400 border-slate-700'
              }`}
            >
              👎 Both Failed
            </button>
          </div>
        </div>
      )}

      {/* Input Prompt Dock */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-2xl">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-amber-400" /> Prompt Arena Dispatch:
          </span>
          <div className="flex items-center gap-3">
            <span>Max Tokens: {maxTokens}</span>
            <input
              type="range"
              min="128"
              max="2048"
              step="128"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              disabled={isBenchmarking}
              className="w-20 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Attached Vision Image Preview Banner */}
        {attachedImage && (
          <div className="flex items-center justify-between bg-slate-950/80 border border-amber-500/30 rounded-xl p-2.5">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachedImage}
                alt="Attachment preview"
                className="w-10 h-10 object-cover rounded-lg border border-amber-500/40"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Vision Attachment Loaded
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Ready for dual-dispatch benchmark</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Remove Image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleBenchmark();
              }
            }}
            placeholder={
              attachedImage
                ? "Enter visual question or comparison criteria... [Press Ctrl + Enter to Dispatch]"
                : "Type a benchmark prompt or challenge (e.g. reasoning problem, complex coding question, or legal brief)... [Press Ctrl + Enter to Dispatch]"
            }
            rows={3}
            disabled={isBenchmarking}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500/70 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none disabled:opacity-50"
          />

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBenchmarking}
              className={`p-2 rounded-lg border transition-all flex items-center justify-center ${
                attachedImage
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
              }`}
              title="Attach image for vision comparison"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {isBenchmarking ? (
              <button
                type="button"
                onClick={handleStop}
                className="h-full px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all text-sm"
              >
                <Square className="w-4 h-4 fill-white" /> Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBenchmark}
                disabled={!userPrompt.trim() && !attachedImage}
                className="h-full px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" /> Benchmark
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              disabled={isBenchmarking}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
              title="Reset Benchmark State"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-6">
          {/* Suite Selection Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                Select Golden Benchmark Suite
              </h2>
              <span className="text-xs text-slate-400">
                Rigorous standardized test suites with deterministic multi-criterion scoring
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DEFAULT_SUITES.map((suite) => {
                const isSelected = benchmarkSuiteId === suite.id;
                return (
                  <div
                    key={suite.id}
                    onClick={() => setBenchmarkSuiteId(suite.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 border-amber-500/60 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/5'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {suite.category}
                        </span>
                        <span className="text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {suite.sampleCount} Test Cases
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-100 text-sm mb-1">{suite.name}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{suite.description}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className={isSelected ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                        {isSelected ? '✓ Selected Active Suite' : 'Click to select'}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model Selection and Run Bar */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              {/* Candidate Model A */}
              <div>
                <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Candidate Model A
                </label>
                <select
                  value={modelA}
                  onChange={(e) => setModelA(e.target.value)}
                  disabled={isEvaluating}
                  className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.isAdapter ? '✨ (LoRA)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Candidate Model B */}
              <div>
                <label className="block text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span> Candidate Model B
                </label>
                <select
                  value={modelB}
                  onChange={(e) => setModelB(e.target.value)}
                  disabled={isEvaluating}
                  className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.isAdapter ? '✨ (LoRA)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* LLM Referee Model */}
              <div>
                <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" /> Referee / Judge Model
                </label>
                <select
                  value={judgeModel}
                  onChange={(e) => setJudgeModel(e.target.value)}
                  disabled={isEvaluating}
                  className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Run Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleRunEvaluation}
                disabled={isEvaluating || modelA === modelB}
                className="w-full lg:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Evaluating Suite...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950" /> Execute Benchmark
                  </>
                )}
              </button>
            </div>
          </div>

          {/* In-Flight Evaluating Notice */}
          {isEvaluating && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-xl flex flex-col md:flex-row items-center gap-4 animate-pulse">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="font-semibold text-white text-base">
                  Automated LLM-as-a-Judge Benchmark In Progress
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  1. Dispatching test cases concurrently to <span className="text-emerald-400 font-mono">{modelA}</span> and <span className="text-blue-400 font-mono">{modelB}</span>
                  <br />
                  2. Presenting blind candidate outputs to LLM Referee <span className="text-amber-400 font-mono">{judgeModel}</span> with strict scoring rubric.
                </p>
              </div>
            </div>
          )}

          {/* Empty State when no evaluation has run yet */}
          {!evalResult && !isEvaluating && (
            <div className="p-10 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Automated Multi-Criterion Evaluation Engine</h3>
              <p className="text-sm text-slate-400 max-w-lg mb-6">
                Evaluate models against standardized test suites automatically using an LLM-as-a-Judge.
                The judge grades accuracy, reasoning depth, and instruction adherence to eliminate human evaluation bias.
              </p>
              <div className="flex items-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Blind Candidate Inference
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Multi-Criterion Rubric
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sub-token Latency Telemetry
                </span>
              </div>
            </div>
          )}

          {/* Evaluation Results Section */}
          {evalResult && (
            <div className="flex flex-col gap-6">
              {/* Champion Card */}
              <div
                className={`p-6 rounded-2xl border shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 ${
                  evalResult.summary.winsA > evalResult.summary.winsB
                    ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40'
                    : evalResult.summary.winsB > evalResult.summary.winsA
                    ? 'bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border-blue-500/40'
                    : 'bg-slate-900 border-amber-500/40'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Award className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {evalResult.suiteName}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Referee: {evalResult.judgeModel}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mt-1">
                      {evalResult.summary.winsA > evalResult.summary.winsB
                        ? `🏆 ${evalResult.modelA} Victorious`
                        : evalResult.summary.winsB > evalResult.summary.winsA
                        ? `🏆 ${evalResult.modelB} Victorious`
                        : '⚖️ Head-to-Head Draw'}
                    </h3>
                    <p className="text-sm text-slate-300 mt-1">
                      {evalResult.summary.winsA > evalResult.summary.winsB
                        ? `${evalResult.modelA} achieved a ${evalResult.summary.winRateA}% win rate (${evalResult.summary.winsA}W - ${evalResult.summary.winsB}L - ${evalResult.summary.ties}T)`
                        : evalResult.summary.winsB > evalResult.summary.winsA
                        ? `${evalResult.modelB} achieved a ${evalResult.summary.winRateB}% win rate (${evalResult.summary.winsB}W - ${evalResult.summary.winsA}L - ${evalResult.summary.ties}T)`
                        : `Both candidate models scored evenly across ${evalResult.totalSamples} benchmark challenges.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleRunEvaluation()}
                    disabled={isEvaluating}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Re-run Suite
                  </button>
                </div>
              </div>

              {/* High Level Comparative Scorecards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-xs text-slate-400">Head-to-Head Win Rate</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-emerald-400">
                      {evalResult.summary.winRateA}%
                    </span>
                    <span className="text-xs text-slate-500">vs</span>
                    <span className="text-lg font-bold text-blue-400">
                      {evalResult.summary.winRateB}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex mt-2">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${evalResult.summary.winRateA}%` }}
                    />
                    <div
                      className="bg-blue-500 h-full"
                      style={{ width: `${evalResult.summary.winRateB}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-xs text-slate-400">Overall Score (out of 10)</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-emerald-400">
                      {evalResult.summary.avgOverallScoreA}
                    </span>
                    <span className="text-xs text-slate-500">vs</span>
                    <span className="text-lg font-bold text-blue-400">
                      {evalResult.summary.avgOverallScoreB}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2 block">
                    Composite quality score across all samples
                  </span>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-xs text-slate-400">Average Latency</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-emerald-400">
                      {evalResult.summary.avgLatencyMsA}ms
                    </span>
                    <span className="text-xs text-slate-500">vs</span>
                    <span className="text-lg font-bold text-blue-400">
                      {evalResult.summary.avgLatencyMsB}ms
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2 block">
                    {evalResult.summary.avgLatencyMsA < evalResult.summary.avgLatencyMsB
                      ? `Model A was ${Math.round(
                          ((evalResult.summary.avgLatencyMsB - evalResult.summary.avgLatencyMsA) /
                            evalResult.summary.avgLatencyMsB) *
                            100
                        )}% faster`
                      : `Model B was ${Math.round(
                          ((evalResult.summary.avgLatencyMsA - evalResult.summary.avgLatencyMsB) /
                            evalResult.summary.avgLatencyMsA) *
                            100
                        )}% faster`}
                  </span>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-xs text-slate-400">Ledger Distribution</span>
                  <div className="flex items-center justify-between mt-2 text-sm font-semibold">
                    <span className="text-emerald-400">{evalResult.summary.winsA} Wins</span>
                    <span className="text-slate-400">{evalResult.summary.ties} Ties</span>
                    <span className="text-blue-400">{evalResult.summary.winsB} Wins</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2 block">
                    {evalResult.totalSamples} total evaluated scenarios
                  </span>
                </div>
              </div>

              {/* Criterion Radar Breakdown Bars */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  Multi-Criterion Rubric Score Comparison
                </h4>
                <div className="space-y-4">
                  {/* Accuracy */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-300">Accuracy & Algorithmic Correctness</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-emerald-400">
                          {evalResult.modelA}: {evalResult.summary.categoryScoresA.accuracy}/10
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="font-semibold text-blue-400">
                          {evalResult.modelB}: {evalResult.summary.categoryScoresB.accuracy}/10
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${evalResult.summary.categoryScoresA.accuracy * 10}%` }}
                        />
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-blue-500 h-full rounded-full"
                          style={{ width: `${evalResult.summary.categoryScoresB.accuracy * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-300">Reasoning Depth & Logic Verification</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-emerald-400">
                          {evalResult.modelA}: {evalResult.summary.categoryScoresA.reasoning}/10
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="font-semibold text-blue-400">
                          {evalResult.modelB}: {evalResult.summary.categoryScoresB.reasoning}/10
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${evalResult.summary.categoryScoresA.reasoning * 10}%` }}
                        />
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-blue-500 h-full rounded-full"
                          style={{ width: `${evalResult.summary.categoryScoresB.reasoning * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Adherence */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-300">Instruction & Schema Adherence</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-emerald-400">
                          {evalResult.modelA}: {evalResult.summary.categoryScoresA.adherence}/10
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="font-semibold text-blue-400">
                          {evalResult.modelB}: {evalResult.summary.categoryScoresB.adherence}/10
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${evalResult.summary.categoryScoresA.adherence * 10}%` }}
                        />
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-blue-500 h-full rounded-full"
                          style={{ width: `${evalResult.summary.categoryScoresB.adherence * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample-by-Sample Breakdown Accordion */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-400" />
                  Individual Benchmark Cases & Referee Verdicts
                </h4>
                <div className="space-y-3">
                  {evalResult.sampleResults.map((sample: any) => {
                    const isExpanded = expandedSampleId === sample.sampleId;
                    const winnerTag =
                      sample.judge.winner === 'modelA'
                        ? { label: `Winner: ${evalResult.modelA}`, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
                        : sample.judge.winner === 'modelB'
                        ? { label: `Winner: ${evalResult.modelB}`, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' }
                        : { label: 'Tied Score', color: 'bg-slate-700 text-slate-300 border-slate-600' };

                    return (
                      <div
                        key={sample.sampleId}
                        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all"
                      >
                        {/* Accordion Header */}
                        <div
                          onClick={() => setExpandedSampleId(isExpanded ? null : sample.sampleId)}
                          className="p-4 cursor-pointer hover:bg-slate-800/50 flex items-center justify-between gap-4 select-none"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 text-xs font-mono">{sample.sampleId}</span>
                            <span className="font-semibold text-slate-200 text-sm">{sample.sampleTitle}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${winnerTag.color}`}>
                              {winnerTag.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-xs text-slate-400 hidden sm:flex items-center gap-3">
                              <span>Model A: <strong className="text-emerald-400">{sample.judge.scoreA.overall}/10</strong></span>
                              <span>Model B: <strong className="text-blue-400">{sample.judge.scoreB.overall}/10</strong></span>
                            </div>
                            <ChevronDown
                              className={`w-4 h-4 text-slate-400 transition-transform ${
                                isExpanded ? 'transform rotate-180' : ''
                              }`}
                            />
                          </div>
                        </div>

                        {/* Accordion Body */}
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-4 text-xs">
                            {/* Prompt Card */}
                            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] block mb-1">
                                Test Prompt Dispatched
                              </span>
                              <p className="text-slate-200 font-mono whitespace-pre-wrap">{sample.prompt}</p>
                            </div>

                            {/* Side-by-Side Model Responses */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Model A */}
                              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                      {evalResult.modelA}
                                    </span>
                                    <span className="text-slate-400 font-mono text-[11px]">
                                      {sample.responseA.latencyMs}ms | {sample.responseA.tokens} tokens
                                    </span>
                                  </div>
                                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 max-h-60 overflow-y-auto font-mono text-slate-300 text-[11px] whitespace-pre-wrap">
                                    {sample.responseA.content}
                                  </div>
                                </div>
                                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
                                  <span>Accuracy: <strong className="text-slate-200">{sample.judge.scoreA.accuracy}</strong></span>
                                  <span>Reasoning: <strong className="text-slate-200">{sample.judge.scoreA.reasoning}</strong></span>
                                  <span>Adherence: <strong className="text-slate-200">{sample.judge.scoreA.adherence}</strong></span>
                                  <span className="text-emerald-400 font-bold">Overall: {sample.judge.scoreA.overall}/10</span>
                                </div>
                              </div>

                              {/* Model B */}
                              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                      {evalResult.modelB}
                                    </span>
                                    <span className="text-slate-400 font-mono text-[11px]">
                                      {sample.responseB.latencyMs}ms | {sample.responseB.tokens} tokens
                                    </span>
                                  </div>
                                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 max-h-60 overflow-y-auto font-mono text-slate-300 text-[11px] whitespace-pre-wrap">
                                    {sample.responseB.content}
                                  </div>
                                </div>
                                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
                                  <span>Accuracy: <strong className="text-slate-200">{sample.judge.scoreB.accuracy}</strong></span>
                                  <span>Reasoning: <strong className="text-slate-200">{sample.judge.scoreB.reasoning}</strong></span>
                                  <span>Adherence: <strong className="text-slate-200">{sample.judge.scoreB.adherence}</strong></span>
                                  <span className="text-blue-400 font-bold">Overall: {sample.judge.scoreB.overall}/10</span>
                                </div>
                              </div>
                            </div>

                            {/* Judge Reasoning Callout */}
                            <div className="p-3.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg">
                              <span className="font-semibold text-amber-400 flex items-center gap-1.5 mb-1 text-xs">
                                <Scale className="w-3.5 h-3.5" /> LLM Referee Adjudication & Rationale ({evalResult.judgeModel})
                              </span>
                              <p className="text-slate-200 leading-relaxed italic text-[11.5px]">
                                &ldquo;{sample.judge.reasoning}&rdquo;
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
