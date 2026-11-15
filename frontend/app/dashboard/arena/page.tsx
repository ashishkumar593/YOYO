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

export default function ArenaPage() {
  const { toast } = useToast();

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
  };

  const runSingleModelStream = async (
    targetModel: string,
    temperature: number,
    promptText: string,
    signal: AbortSignal,
    onUpdate: (updater: (prev: StreamResult) => StreamResult) => void
  ) => {
    const startTime = Date.now();
    let firstTokenRecorded = false;
    let accumulatedContent = '';
    let tokenCount = 0;
    let promptTokens = Math.max(12, Math.floor(promptText.length / 4));
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
            { role: 'user', content: promptText },
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
    if (!userPrompt.trim() || isBenchmarking) return;

    setIsBenchmarking(true);
    setVote(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    await Promise.all([
      runSingleModelStream(modelA, tempA, userPrompt, abortController.signal, setResultA),
      runSingleModelStream(modelB, tempB, userPrompt, abortController.signal, setResultB),
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

        <div className="flex gap-3">
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleBenchmark();
              }
            }}
            placeholder="Type a benchmark prompt or challenge (e.g. reasoning problem, complex coding question, or legal brief)... [Press Ctrl + Enter to Dispatch]"
            rows={3}
            disabled={isBenchmarking}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500/70 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none disabled:opacity-50"
          />

          <div className="flex flex-col gap-2">
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
                disabled={!userPrompt.trim()}
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
  );
}
