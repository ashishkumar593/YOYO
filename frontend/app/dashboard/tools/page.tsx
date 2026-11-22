'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import {
  Sparkles,
  Terminal,
  Calculator,
  CloudSun,
  Database,
  Globe,
  Play,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Code,
  Sliders,
  ChevronDown,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

interface AgentStep {
  step: number;
  type: 'thought' | 'tool_call' | 'tool_result' | 'final_answer';
  tool?: string;
  args?: Record<string, any>;
  result?: any;
  content?: string;
  timestamp: string;
}

interface AgentResult {
  goal: string;
  model: string;
  steps: AgentStep[];
  finalAnswer: string;
  iterations: number;
  latencyMs: number;
}

export default function ToolsWorkbenchPage() {
  const { success, error: toastError, info } = useToast();

  const [tools, setTools] = useState<ToolDef[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>({
    calculator: true,
    get_weather: true,
    db_query: true,
    web_search: true,
  });

  // Autonomous Agent Run State
  const [goal, setGoal] = useState('');
  const [selectedModel, setSelectedModel] = useState('qwen2.5-coder:1.5b');
  const [runningAgent, setRunningAgent] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null);

  // Manual Tool Runner State
  const [activeManualTool, setActiveManualTool] = useState('calculator');
  const [manualArgsJson, setManualArgsJson] = useState('{"expression": "(145.20 * 0.18) + 145.20"}');
  const [manualExecuting, setManualExecuting] = useState(false);
  const [manualResult, setManualResult] = useState<any | null>(null);

  const loadTools = async () => {
    setLoadingTools(true);
    try {
      const data = await apiRequest('/api/tools/catalog');
      setTools(data.tools || []);
    } catch (err: any) {
      console.error('Failed to load tools catalog:', err);
    } finally {
      setLoadingTools(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  const handleRunAgent = async (presetGoal?: string) => {
    const targetGoal = (presetGoal || goal).trim();
    if (!targetGoal) {
      toastError('Please specify an agent goal or question.');
      return;
    }
    if (presetGoal) setGoal(presetGoal);

    const allowed = Object.entries(enabledTools)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);

    if (allowed.length === 0) {
      toastError('Please enable at least one tool.');
      return;
    }

    setRunningAgent(true);
    setAgentResult(null);
    try {
      const res = await apiRequest('/api/tools/agent-loop', {
        method: 'POST',
        body: JSON.stringify({
          goal: targetGoal,
          model: selectedModel,
          allowedTools: allowed,
        }),
      });
      setAgentResult(res);
      success('Agent completed tool execution plan!');
    } catch (err: any) {
      toastError(err.message || 'Agent loop failed');
    } finally {
      setRunningAgent(false);
    }
  };

  const handleManualExecute = async () => {
    setManualExecuting(true);
    setManualResult(null);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(manualArgsJson);
      } catch {
        throw new Error('Arguments must be valid JSON');
      }

      const res = await apiRequest('/api/tools/execute', {
        method: 'POST',
        body: JSON.stringify({
          name: activeManualTool,
          args: parsedArgs,
        }),
      });
      setManualResult(res);
      success(`Tool '${activeManualTool}' executed successfully.`);
    } catch (err: any) {
      toastError(err.message || 'Manual execution failed');
    } finally {
      setManualExecuting(false);
    }
  };

  const getToolIcon = (name: string) => {
    switch (name) {
      case 'calculator':
        return <Calculator className="w-4 h-4 text-amber-400" />;
      case 'get_weather':
        return <CloudSun className="w-4 h-4 text-cyan-400" />;
      case 'db_query':
        return <Database className="w-4 h-4 text-emerald-400" />;
      case 'web_search':
        return <Globe className="w-4 h-4 text-indigo-400" />;
      default:
        return <Code className="w-4 h-4 text-zinc-400" />;
    }
  };

  const sampleGoals = [
    'Calculate an 18% tip on a $145.20 dinner bill and what the total is.',
    'Check current weather in Tokyo and San Francisco, then compare their conditions.',
    'Query the users table for total active developers and verify our cluster node status.',
    'Search for vLLM continuous batching performance advantages and summarize them.',
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>Agentic Function Calling & Tools Workbench</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
              Autonomous Multi-Step Loops
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Equip local Docker models (Qwen 2.5 Coder, Llama 3.2, DeepSeek R1) with native tool execution capabilities.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-muted-foreground">Gateway Protocol:</span>
          <span className="text-emerald-400 font-bold">OpenAI Tool Calling API Parity</span>
        </div>
      </div>

      {/* Available Tools Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Agent Tools Inventory ({tools.length})</span>
          </h2>
          <span className="text-[11px] font-mono text-zinc-400">
            Toggle tools available to the autonomous agent
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map((t) => {
            const fn = t.function;
            const isEnabled = enabledTools[fn.name] ?? true;
            return (
              <div
                key={fn.name}
                className={`p-4 rounded-xl border transition-all space-y-3 flex flex-col justify-between ${
                  isEnabled
                    ? 'bg-card border-border/80 hover:border-cyan-500/40'
                    : 'bg-card/40 border-border/40 opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-black/40 border border-border/60">
                        {getToolIcon(fn.name)}
                      </div>
                      <span className="text-xs font-bold text-foreground font-mono">
                        {fn.name}
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) =>
                          setEnabledTools({ ...enabledTools, [fn.name]: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500" />
                    </label>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {fn.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>Req: {fn.parameters?.required?.join(', ') || 'none'}</span>
                  <button
                    onClick={() => {
                      setActiveManualTool(fn.name);
                      if (fn.name === 'calculator') {
                        setManualArgsJson('{"expression": "(145.20 * 0.18) + 145.20"}');
                      } else if (fn.name === 'get_weather') {
                        setManualArgsJson('{"city": "Tokyo", "unit": "celsius"}');
                      } else if (fn.name === 'db_query') {
                        setManualArgsJson('{"table": "users", "filter": "active_count"}');
                      } else {
                        setManualArgsJson('{"query": "vLLM continuous batching"}');
                      }
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }}
                    className="text-cyan-400 hover:underline"
                  >
                    Quick Test &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Autonomous Agent Interactive Sandbox */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-foreground">Autonomous Agent Loop Execution</h2>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-muted-foreground font-mono">Agent Engine:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="qwen2.5-coder:1.5b">Qwen 2.5 Coder 1.5B (Local)</option>
              <option value="llama3.2:1b">Llama 3.2 1B (Local)</option>
              <option value="deepseek-r1:1.5b">DeepSeek R1 1.5B (Local)</option>
            </select>
          </div>
        </div>

        {/* Goal Input Form */}
        <div className="space-y-3">
          <textarea
            rows={3}
            placeholder="Assign a multi-step objective that requires tool invocation (e.g. calculation, weather check, database query)..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400 font-sans leading-relaxed resize-none"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="text-muted-foreground">Try Goal:</span>
              {sampleGoals.map((sg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleRunAgent(sg)}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-cyan-500/10 border border-white/[0.08] hover:border-cyan-500/30 text-zinc-300 hover:text-cyan-400 transition-all text-[10px]"
                >
                  Goal #{i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleRunAgent()}
              disabled={runningAgent || !goal.trim()}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm shadow-cyan-600/30 shrink-0"
            >
              {runningAgent ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Agent Plan...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Autonomous Agent</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Agent Execution Trace Timeline */}
        {agentResult && (
          <div className="pt-4 border-t border-border/60 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-foreground font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Execution Timeline &amp; Tool Invocations</span>
              </span>
              <span className="text-muted-foreground text-[11px]">
                Iterations: <span className="text-foreground font-bold">{agentResult.iterations}</span> • Latency:{' '}
                <span className="text-emerald-400 font-bold">{agentResult.latencyMs}ms</span>
              </span>
            </div>

            <div className="space-y-3">
              {agentResult.steps.map((s, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
                    s.type === 'tool_call'
                      ? 'bg-amber-500/[0.04] border-amber-500/30'
                      : s.type === 'tool_result'
                      ? 'bg-emerald-500/[0.04] border-emerald-500/30'
                      : s.type === 'final_answer'
                      ? 'bg-cyan-500/[0.05] border-cyan-500/40'
                      : 'bg-muted/40 border-border/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-2">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-foreground font-bold">
                        Step {s.step}
                      </span>
                      <span
                        className={`font-bold uppercase tracking-wider ${
                          s.type === 'tool_call'
                            ? 'text-amber-400'
                            : s.type === 'tool_result'
                            ? 'text-emerald-400'
                            : s.type === 'final_answer'
                            ? 'text-cyan-400'
                            : 'text-zinc-400'
                        }`}
                      >
                        {s.type.replace('_', ' ')}
                      </span>
                      {s.tool && (
                        <span className="text-zinc-300 font-bold">({s.tool})</span>
                      )}
                    </div>
                    <span className="text-zinc-500 text-[10px]">{s.timestamp.split('T')[1]?.slice(0, 8)}</span>
                  </div>

                  {s.args && (
                    <div className="bg-black/50 p-2.5 rounded-lg border border-border/40 text-[11px] text-zinc-300">
                      <span className="text-muted-foreground block text-[10px] mb-1">Tool Input Arguments:</span>
                      <pre className="font-mono overflow-x-auto">{JSON.stringify(s.args, null, 2)}</pre>
                    </div>
                  )}

                  {s.result && (
                    <div className="bg-black/50 p-2.5 rounded-lg border border-border/40 text-[11px] text-emerald-300">
                      <span className="text-muted-foreground block text-[10px] mb-1">Tool Execution Output:</span>
                      <pre className="font-mono overflow-x-auto">{JSON.stringify(s.result, null, 2)}</pre>
                    </div>
                  )}

                  {s.content && (
                    <div className="text-zinc-100 font-sans text-xs leading-relaxed whitespace-pre-wrap">
                      {s.content}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Synthesized Final Output Card */}
            <div className="p-5 rounded-2xl bg-card border border-cyan-500/30 space-y-2">
              <span className="text-cyan-400 text-xs font-bold font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Final Agent Solution & Synthesis</span>
              </span>
              <div className="text-xs text-zinc-100 font-sans leading-relaxed whitespace-pre-wrap">
                {agentResult.finalAnswer}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Tool Tester Sandbox */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center space-x-2">
            <Code className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-foreground">Manual Tool Sandbox & Direct Invocation</h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Execute tools directly without agent orchestration
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-muted-foreground text-xs font-mono block mb-1">
                Select Tool
              </label>
              <select
                value={activeManualTool}
                onChange={(e) => {
                  const t = e.target.value;
                  setActiveManualTool(t);
                  if (t === 'calculator') setManualArgsJson('{"expression": "(145.20 * 0.18) + 145.20"}');
                  else if (t === 'get_weather') setManualArgsJson('{"city": "Berlin", "unit": "celsius"}');
                  else if (t === 'db_query') setManualArgsJson('{"table": "inferences", "filter": "latest_24h"}');
                  else setManualArgsJson('{"query": "speculative decoding"}');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:outline-none focus:border-cyan-400"
              >
                {tools.map((t) => (
                  <option key={t.function.name} value={t.function.name}>
                    {t.function.name} — {t.function.description.slice(0, 45)}...
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-muted-foreground text-xs font-mono block mb-1">
                Arguments (JSON)
              </label>
              <textarea
                rows={4}
                value={manualArgsJson}
                onChange={(e) => setManualArgsJson(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              onClick={handleManualExecute}
              disabled={manualExecuting}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-sm"
            >
              {manualExecuting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute Tool</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/80 flex flex-col justify-between">
            <span className="text-[11px] font-mono text-muted-foreground block mb-2">
              Execution Response Payload
            </span>
            <pre className="text-xs font-mono text-emerald-400 overflow-x-auto bg-black/50 p-3 rounded-lg border border-border/40 flex-1">
              {manualResult ? JSON.stringify(manualResult, null, 2) : '// Output will appear here...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
