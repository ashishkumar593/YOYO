'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import {
  Send,
  Terminal,
  Settings,
  RotateCcw,
  Code,
  Copy,
  Check,
  Zap,
  Clock,
  Sparkles,
  Cpu,
  Square,
  Bot,
  User,
  Sliders,
  ChevronDown,
  Shield,
  Wrench,
  Code2,
} from 'lucide-react';

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  tokens?: number;
  cachedTokens?: number;
  cost?: number;
  latencyMs?: number;
  speed?: number;
}

const TOOL_PRESETS = [
  {
    name: 'get_current_weather',
    description: 'Get current temperature and weather conditions for a given location.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City and state, e.g. San Francisco, CA' },
        unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Temperature scale' },
      },
      required: ['location'],
    },
  },
  {
    name: 'execute_sql_query',
    description: 'Run a read-only analytics SQL query against PostgreSQL.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SQL SELECT query' },
        max_rows: { type: 'number', description: 'Max records to fetch (max 100)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetch_stock_price',
    description: 'Fetch real-time stock ticker quote.',
    parameters: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'Stock symbol, e.g. NVDA, AAPL' },
      },
      required: ['ticker'],
    },
  },
];

const JSON_SCHEMA_PRESETS: Record<string, { name: string; schema: Record<string, any> }> = {
  EntityExtraction: {
    name: 'EntityExtraction',
    schema: {
      type: 'object',
      properties: {
        entity_name: { type: 'string', description: 'Primary entity name' },
        category: { type: 'string', enum: ['Company', 'Individual', 'Product', 'Protocol'] },
        confidence: { type: 'number', description: 'Extraction confidence score between 0 and 1' },
      },
      required: ['entity_name', 'category', 'confidence'],
    },
  },
  DatabaseMetricRecord: {
    name: 'DatabaseMetricRecord',
    schema: {
      type: 'object',
      properties: {
        metric_name: { type: 'string' },
        value: { type: 'number' },
        unit: { type: 'string' },
        healthy: { type: 'boolean' },
      },
      required: ['metric_name', 'value', 'unit', 'healthy'],
    },
  },
};

const PROMPT_PRESETS = [
  {
    title: 'Code Architecture',
    prompt: 'Write an asynchronous Redis sliding-window token bucket rate limiter in TypeScript with atomic Lua scripts.',
  },
  {
    title: 'SQL Optimizer',
    prompt: 'Write an optimized BigQuery SQL query to partition and cluster a 50TB event log table by date and organization_id with analytical window aggregations.',
  },
  {
    title: 'JSON Extraction',
    prompt: 'Extract the company name, founder, funding round, valuation in USD, and key investors from this press release into valid JSON.',
  },
  {
    title: 'Deep Reasoning',
    prompt: 'Analyze the architectural trade-offs between continuous batching in vLLM vs naive sequential batching in llama.cpp.',
  },
  {
    title: 'Security Audit',
    prompt: 'Identify top 5 security attack vectors against multi-tenant LLM inference gateways (e.g. prompt injection, side-channel KV cache leakage) and suggest code mitigations.',
  },
  {
    title: 'RAG Context Synthesis',
    prompt: 'Given the following 3 documentation passages about CUDA memory management, synthesize a clear guide on avoiding CUDA OOM errors during FP8 KV caching.',
  },
];

const SYSTEM_PRESETS: Record<string, string> = {
  'Code Master': 'You are an elite staff software architect and systems programmer. Provide robust, production-grade code with error handling.',
  'Deep Reasoner': 'You are a logical reasoning engine. Think step-by-step, verify all mathematical logic, and be extremely rigorous.',
  'General Assistant': 'You are YOYO, a helpful, ultra-low-latency AI assistant powered by open foundation models.',
  'Concise Minimalist': 'Be as concise and direct as possible. Avoid introductory or concluding conversational filler.',
  'JSON Specialist': 'You are a structured data extractor. You must output exclusively valid JSON conforming to the requested schema. No conversational preamble.',
  'Security Auditor': 'You are a principal security engineer conducting a threat model audit. Highlight critical CVE vulnerabilities, OWASP Top 10 LLM risks, and mitigation code.',
};

function PlaygroundInner() {
  const searchParams = useSearchParams();
  const initialModel = searchParams.get('model') || 'llama-3.3-70b';
  const { success, error, info } = useToast();

  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(initialModel);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(0.9);
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  const [systemPromptPreset, setSystemPromptPreset] = useState<string>('General Assistant');
  const [systemPrompt, setSystemPrompt] = useState<string>(SYSTEM_PRESETS['General Assistant']);
  const [jsonMode, setJsonMode] = useState<boolean>(false);
  const [jsonSchemaMode, setJsonSchemaMode] = useState<boolean>(false);
  const [selectedSchemaPreset, setSelectedSchemaPreset] = useState<string>('EntityExtraction');
  const [toolsEnabled, setToolsEnabled] = useState<boolean>(false);
  const [activeToolIndex, setActiveToolIndex] = useState<number>(0);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamMetrics, setStreamMetrics] = useState<{
    ttftMs?: number;
    totalTokens?: number;
    cachedTokens?: number;
    tokensPerSec?: number;
    zeroRetention?: boolean;
  }>({});
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [codeTab, setCodeTab] = useState<'python' | 'typescript' | 'curl' | 'openai'>('python');
  const [copiedCode, setCopiedCode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const catalog = await apiRequest('/api/models/catalog').catch(() => []);
        setModels(catalog || []);
      } catch (err) {
        console.error('Playground init error:', err);
      }
    }
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSystemPresetChange = (name: string) => {
    setSystemPromptPreset(name);
    setSystemPrompt(SYSTEM_PRESETS[name] || '');
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isGenerating) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages: Message[] = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...messages,
      userMessage,
    ];

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsGenerating(true);
    setStreamMetrics({});

    const startTime = Date.now();
    let firstTokenTime = 0;
    let tokenCount = 0;

    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMessage]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const token = localStorage.getItem('yoyo_access_token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.yoyo.ai';
      const response = await fetch(`${apiBase}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content || null,
            ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
            ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
            ...(m.name ? { name: m.name } : {}),
          })),
          temperature,
          top_p: topP,
          max_tokens: maxTokens,
          stream: true,
          ...(jsonSchemaMode
            ? {
                response_format: {
                  type: 'json_schema',
                  json_schema: {
                    name: JSON_SCHEMA_PRESETS[selectedSchemaPreset]?.name || 'StructuredOutput',
                    schema: JSON_SCHEMA_PRESETS[selectedSchemaPreset]?.schema || {},
                    strict: true,
                  },
                },
              }
            : jsonMode
            ? { response_format: { type: 'json_object' } }
            : {}),
          ...(toolsEnabled
            ? {
                tools: [
                  {
                    type: 'function',
                    function: TOOL_PRESETS[activeToolIndex],
                  },
                ],
                tool_choice: 'auto',
              }
            : {}),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Inference stream error');
      }

      if (response.headers.get('x-yoyo-zero-data-retention') === 'true') {
        setStreamMetrics((m) => ({ ...m, zeroRetention: true }));
      }

      if (!response.body) throw new Error('Readable stream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedReply = '';

      while (true) {
        const { done, value } = await reader.read();
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
            const delta = parsed.choices?.[0]?.delta?.content;
            const deltaToolCalls = parsed.choices?.[0]?.delta?.tool_calls || parsed.choices?.[0]?.message?.tool_calls;

            if (deltaToolCalls && deltaToolCalls.length > 0) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                const existingTools: ToolCall[] = last.tool_calls ? [...last.tool_calls] : [];
                for (const tc of deltaToolCalls) {
                  const existing = existingTools.find(
                    (t, idx) => t.id === tc.id || (tc.index !== undefined && idx === tc.index)
                  );
                  if (existing) {
                    if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
                  } else {
                    existingTools.push({
                      id: tc.id || `call_${Date.now()}`,
                      type: 'function',
                      function: {
                        name: tc.function?.name || '',
                        arguments: tc.function?.arguments || '',
                      },
                    });
                  }
                }
                next[next.length - 1] = {
                  ...last,
                  role: 'assistant',
                  tool_calls: existingTools,
                };
                return next;
              });
            }

            if (delta) {
              tokenCount++;
              if (firstTokenTime === 0) {
                firstTokenTime = Date.now();
                const ttft = firstTokenTime - startTime;
                setStreamMetrics((m) => ({ ...m, ttftMs: ttft }));
              }
              accumulatedReply += delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  role: 'assistant',
                  content: accumulatedReply,
                };
                return next;
              });
            }

            if (parsed.usage) {
              const cached = parsed.usage.prompt_tokens_details?.cached_tokens;
              setStreamMetrics((m) => ({
                ...m,
                totalTokens: parsed.usage.total_tokens,
                ...(cached !== undefined ? { cachedTokens: cached } : {}),
              }));
            }
          } catch {}
        }
      }

      // Calculate generation speed and final metrics
      const totalGenTimeSec = (Date.now() - (firstTokenTime || startTime)) / 1000;
      const speed =
        totalGenTimeSec > 0 && tokenCount > 0
          ? parseFloat((tokenCount / totalGenTimeSec).toFixed(1))
          : undefined;

      if (speed) {
        setStreamMetrics((m) => ({
          ...m,
          tokensPerSec: speed,
        }));
      }

      // Calculate cost based on model pricing
      const currentModelObj = models.find((m) => m.apiIdentifier === selectedModel);
      const outputRate = currentModelObj?.outputCostPerMillion || 0.4;
      const finalTokens = tokenCount || Math.ceil(accumulatedReply.length / 4);
      const estCost = (finalTokens / 1_000_000) * outputRate;
      const totalElapsedMs = Date.now() - startTime;

      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].role === 'assistant') {
          next[next.length - 1] = {
            ...next[next.length - 1],
            tokens: finalTokens,
            cachedTokens: streamMetrics.cachedTokens,
            cost: estCost,
            latencyMs: totalElapsedMs,
            speed,
          };
        }
        return next;
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        error(err.message || 'Stream error');
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: `[Error: ${err.message || 'Inference stream disconnected'}]`,
          };
          return next;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      info('Generation stopped.');
    }
  };

  const handleReset = () => {
    handleStop();
    setMessages([]);
    setStreamMetrics({});
    info('Playground reset.');
  };

  const handleSimulateToolReturn = (toolCall: ToolCall) => {
    let mockResult: any = { status: 'success' };
    if (toolCall.function.name === 'get_current_weather') {
      mockResult = {
        location: 'San Francisco, CA',
        temperature: 18,
        unit: 'celsius',
        condition: 'Sunny with coastal marine layer',
      };
    } else if (toolCall.function.name === 'execute_sql_query') {
      mockResult = {
        rows: [
          { cluster_id: 'yoyo-h100-node-1', active_streams: 14, gpu_temp_c: 58, vram_free_gb: 64.2 },
          { cluster_id: 'yoyo-h100-node-2', active_streams: 9, gpu_temp_c: 54, vram_free_gb: 71.0 },
        ],
        row_count: 2,
      };
    } else if (toolCall.function.name === 'fetch_stock_price') {
      mockResult = { ticker: 'NVDA', price: 142.5, change_percent: '+3.4%', volume: '48.2M' };
    }

    const toolMsg: Message = {
      role: 'tool',
      tool_call_id: toolCall.id,
      name: toolCall.function.name,
      content: JSON.stringify(mockResult, null, 2),
    };

    setMessages((prev) => [...prev, toolMsg]);
    setTimeout(() => {
      handleSend('Tool execution result received. Provide a synthesized final response.');
    }, 100);
  };

  const copyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    success('Message copied to clipboard.');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getCodeSnippet = () => {
    const formattedMessages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...(messages.length > 0
        ? messages.map((m) => ({
            role: m.role,
            content: m.content || null,
            ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
            ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
            ...(m.name ? { name: m.name } : {}),
          }))
        : [{ role: 'user', content: 'Explain zero-downtime deployment in 2 sentences.' }]),
    ];

    const activeTool = TOOL_PRESETS[activeToolIndex];
    const toolsSnippet = toolsEnabled ? [{ type: 'function', function: activeTool }] : undefined;
    const responseFormatSnippet = jsonSchemaMode
      ? {
          type: 'json_schema',
          json_schema: {
            name: JSON_SCHEMA_PRESETS[selectedSchemaPreset]?.name || 'StructuredOutput',
            schema: JSON_SCHEMA_PRESETS[selectedSchemaPreset]?.schema || {},
            strict: true,
          },
        }
      : jsonMode
      ? { type: 'json_object' }
      : undefined;

    if (codeTab === 'python') {
      return `from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_api_key_here")

response = client.chat.create(
    model="${selectedModel}",
    messages=${JSON.stringify(formattedMessages, null, 4)},
    temperature=${temperature},
    max_tokens=${maxTokens},
    stream=True${
      responseFormatSnippet
        ? `,\n    response_format=${JSON.stringify(responseFormatSnippet, null, 4)}`
        : ''
    }${
      toolsSnippet ? `,\n    tools=${JSON.stringify(toolsSnippet, null, 4)},\n    tool_choice="auto"` : ''
    }
)

for chunk in response:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)
print()`;
    }

    if (codeTab === 'typescript') {
      return `import { Yoyo } from '@yoyo-ai/sdk';

const client = new Yoyo({
  apiKey: 'sk_live_your_api_key_here'
});

const stream = await client.chat.createStream({
  model: '${selectedModel}',
  messages: ${JSON.stringify(formattedMessages, null, 2)},
  temperature: ${temperature},
  max_tokens: ${maxTokens},${
        responseFormatSnippet
          ? `\n  response_format: ${JSON.stringify(responseFormatSnippet, null, 2)},`
          : ''
      }${
        toolsSnippet
          ? `\n  tools: ${JSON.stringify(toolsSnippet, null, 2)},\n  tool_choice: 'auto',`
          : ''
      }
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`;
    }

    if (codeTab === 'curl') {
      return `curl https://api.yoyo.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_live_your_api_key_here" \\
  -d '${JSON.stringify(
    {
      model: selectedModel,
      messages: formattedMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      ...(responseFormatSnippet ? { response_format: responseFormatSnippet } : {}),
      ...(toolsSnippet ? { tools: toolsSnippet, tool_choice: 'auto' } : {}),
    },
    null,
    2
  )}'`;
    }

    // OpenAI drop-in
    return `from openai import OpenAI

client = OpenAI(
    base_url="https://api.yoyo.ai/v1",
    api_key="sk_live_your_api_key_here"
)

stream = client.chat.completions.create(
    model="${selectedModel}",
    messages=${JSON.stringify(formattedMessages, null, 4)},
    stream=True${
      responseFormatSnippet
        ? `,\n    response_format=${JSON.stringify(responseFormatSnippet, null, 4)}`
        : ''
    }${
      toolsSnippet ? `,\n    tools=${JSON.stringify(toolsSnippet, null, 4)},\n    tool_choice="auto"` : ''
    }
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getCodeSnippet());
    setCopiedCode(true);
    success('Code snippet copied to clipboard.');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight">Interactive Playground</h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                GPU LIVE
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Streaming real-time inference via Server-Sent Events</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Model Selector */}
          <div className="flex items-center space-x-2 bg-muted/60 px-3.5 py-2 rounded-xl border border-border">
            <Cpu className="w-4 h-4 text-primary" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-xs font-mono font-semibold focus:outline-none text-foreground cursor-pointer"
            >
              {models.length > 0 ? (
                models.map((m) => (
                  <option key={m.id} value={m.apiIdentifier} className="bg-card text-foreground font-sans">
                    {m.name} ({m.apiIdentifier})
                  </option>
                ))
              ) : (
                <option value="llama-3.3-70b">Llama 3.3 70B (llama-3.3-70b)</option>
              )}
            </select>
          </div>

          <button
            onClick={() => setShowCodeModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all shadow-sm"
          >
            <Code className="w-3.5 h-3.5 text-primary" />
            <span>Code Export</span>
          </button>

          <button
            onClick={handleReset}
            title="Reset conversation"
            className="p-2.5 rounded-xl bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Chat Stream Window */}
        <div className="lg:col-span-3 flex flex-col rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
          {/* Messages list */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Interactive Playground</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Select a preset prompt below or compose your own to stream from{' '}
                    <span className="font-mono text-primary font-semibold">{selectedModel}</span>.
                  </p>
                </div>

                {/* Preset Prompts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-xl text-left">
                  {PROMPT_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(p.prompt)}
                      className="p-3.5 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted/70 hover:border-primary/40 text-left transition-all"
                    >
                      <span className="text-[11px] font-bold text-primary block mb-1">{p.title}</span>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {p.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start space-x-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role !== 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`flex flex-col group max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-muted-foreground/70 mb-1 px-1 tracking-wider">
                      <span>{msg.role === 'user' ? 'You' : selectedModel}</span>
                      {msg.role !== 'user' && msg.content && (
                        <button
                          onClick={() => copyMessage(msg.content, i)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          title="Copy reply"
                        >
                          {copiedIndex === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                    {msg.role === 'tool' ? (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 font-mono text-xs space-y-1.5 w-full">
                        <div className="flex items-center space-x-2 text-[10px] font-bold uppercase text-amber-400">
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Tool Output: {msg.name || 'function'}</span>
                          <span className="text-muted-foreground text-[10px]">({msg.tool_call_id})</span>
                        </div>
                        <pre className="text-[11px] text-amber-200 overflow-x-auto whitespace-pre-wrap">
                          {msg.content}
                        </pre>
                      </div>
                    ) : (
                      <div
                        className={`rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground font-medium rounded-tr-none shadow-md shadow-primary/20'
                            : 'bg-muted/50 text-foreground border border-border/80 rounded-tl-none font-mono shadow-sm'
                        }`}
                      >
                        {msg.content || (isGenerating && i === messages.length - 1 ? (
                          <span className="inline-flex items-center space-x-1.5 text-primary animate-pulse font-mono font-medium">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            <span>Generating stream...</span>
                          </span>
                        ) : null)}
                      </div>
                    )}

                    {/* Tool Calls Block */}
                    {msg.tool_calls && msg.tool_calls.length > 0 && (
                      <div className="space-y-2 w-full mt-2">
                        {msg.tool_calls.map((tc, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-muted/70 border border-primary/30 font-mono text-xs space-y-2 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-primary font-bold">
                                <Wrench className="w-3.5 h-3.5" />
                                <span>Tool Call: {tc.function.name}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{tc.id}</span>
                            </div>
                            <pre className="text-[11px] text-foreground bg-card p-2.5 rounded-lg border border-border overflow-x-auto whitespace-pre-wrap">
                              {tc.function.arguments}
                            </pre>
                            <button
                              type="button"
                              onClick={() => handleSimulateToolReturn(tc)}
                              disabled={isGenerating}
                              className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-[11px] font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
                            >
                              <Send className="w-3 h-3" />
                              <span>Simulate Tool Return</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.role === 'assistant' && msg.content && (msg.tokens || msg.cost !== undefined) && (
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 px-1 text-[10px] font-mono text-muted-foreground">
                        {msg.tokens && (
                          <span className="inline-flex items-center space-x-1 text-zinc-400">
                            <Cpu className="w-3 h-3 text-indigo-400" />
                            <span>{msg.tokens} tokens</span>
                          </span>
                        )}
                        {msg.cachedTokens !== undefined && msg.cachedTokens > 0 && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                              <span>{msg.cachedTokens} cached (50% off)</span>
                            </span>
                          </>
                        )}
                        {msg.cost !== undefined && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="inline-flex items-center space-x-0.5 text-emerald-400 font-semibold">
                              <span>~${msg.cost < 0.000001 ? '<$0.000001' : msg.cost.toFixed(6)}</span>
                            </span>
                          </>
                        )}
                        {msg.latencyMs && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-400">{msg.latencyMs}ms</span>
                          </>
                        )}
                        {msg.speed && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="text-amber-400 font-semibold">{msg.speed} t/s</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 mt-1 text-muted-foreground">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Telemetry Speedometer Bar */}
          {(streamMetrics.ttftMs || streamMetrics.tokensPerSec || streamMetrics.totalTokens || streamMetrics.cachedTokens || streamMetrics.zeroRetention) && (
            <div className="px-6 py-2.5 border-t border-border/60 bg-muted/30 flex items-center space-x-6 text-[11px] font-mono text-muted-foreground">
              {streamMetrics.ttftMs && (
                <span className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>TTFT: <strong className="text-foreground">{streamMetrics.ttftMs}ms</strong></span>
                </span>
              )}
              {streamMetrics.tokensPerSec && (
                <span className="flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Speed: <strong className="text-foreground">{streamMetrics.tokensPerSec} t/s</strong></span>
                </span>
              )}
              {streamMetrics.totalTokens && (
                <span className="flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Tokens: <strong className="text-foreground">{streamMetrics.totalTokens}</strong></span>
                </span>
              )}
              {streamMetrics.cachedTokens !== undefined && streamMetrics.cachedTokens > 0 && (
                <span className="flex items-center space-x-1.5 text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Prefix Cache: <strong className="text-emerald-300">{streamMetrics.cachedTokens} tokens (50% Off)</strong></span>
                </span>
              )}
              {streamMetrics.zeroRetention && (
                <span className="flex items-center space-x-1.5 text-cyan-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Zero Data Retention: <strong className="text-cyan-300">Audited</strong></span>
                </span>
              )}
            </div>
          )}

          {/* JSON Mode Banner */}
          {jsonMode && (
            <div className="px-4 py-2 bg-cyan-500/10 border-t border-cyan-500/20 flex items-center justify-between text-[11px] font-mono text-cyan-400">
              <span className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Strict JSON Mode Active: Model constrained to valid JSON object schema</span>
              </span>
              <button
                type="button"
                onClick={() => setJsonMode(false)}
                className="text-cyan-400/80 hover:text-cyan-200 underline text-[10px]"
              >
                Disable
              </button>
            </div>
          )}

          {/* Prompt Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 border-t border-border bg-card/60 flex items-center space-x-3"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={`Message ${selectedModel}... (Press Enter)`}
              disabled={isGenerating}
              className="flex-1 px-4 py-3 rounded-xl bg-muted/40 border border-border text-xs focus:border-primary focus:outline-none transition-all text-foreground font-medium"
            />

            {isGenerating ? (
              <button
                type="button"
                onClick={handleStop}
                className="px-4 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-semibold hover:bg-red-500/20 transition-all flex items-center space-x-1.5 text-xs shadow-sm"
              >
                <Square className="w-3.5 h-3.5 fill-red-400" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputPrompt.trim()}
                className="p-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>

        {/* Right Drawer: Parameters */}
        <div className="flex flex-col p-5 rounded-2xl bg-card border border-border space-y-6 overflow-y-auto shadow-sm">
          <div className="flex items-center space-x-2 pb-3 border-b border-border">
            <Sliders className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">Inference Parameters</span>
          </div>

          {/* Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Persona Preset</label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.keys(SYSTEM_PRESETS).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSystemPresetChange(preset)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all text-left truncate ${
                    systemPromptPreset === preset
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">System Message</label>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-muted/40 border border-border text-xs focus:border-primary focus:outline-none text-foreground font-mono leading-relaxed"
            />
          </div>

          {/* Strict JSON Mode Toggle */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-foreground">Strict JSON Mode</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  SCHEMA
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setJsonMode(!jsonMode);
                  if (!jsonMode) setJsonSchemaMode(false);
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  jsonMode ? 'bg-cyan-500' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    jsonMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Enforces valid JSON object schema via <code className="text-foreground font-mono">response_format</code>.
            </p>
          </div>

          {/* Structured Outputs JSON Schema Toggle */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-foreground">JSON Schema Mode</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  STRICT
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setJsonSchemaMode(!jsonSchemaMode);
                  if (!jsonSchemaMode) setJsonMode(false);
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  jsonSchemaMode ? 'bg-purple-500' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    jsonSchemaMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {jsonSchemaMode && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-semibold text-muted-foreground">Select Schema Preset</label>
                <select
                  value={selectedSchemaPreset}
                  onChange={(e) => setSelectedSchemaPreset(e.target.value)}
                  className="w-full p-1.5 rounded-lg bg-card border border-border text-xs text-foreground font-mono focus:outline-none"
                >
                  {Object.keys(JSON_SCHEMA_PRESETS).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Guarantees mathematical schema conformance via OpenAI-compatible <code className="text-foreground font-mono">json_schema</code>.
            </p>
          </div>

          {/* Function Calling & Tools Toggle */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-foreground">Function Calling</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  TOOLS
                </span>
              </div>
              <button
                type="button"
                onClick={() => setToolsEnabled(!toolsEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  toolsEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    toolsEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {toolsEnabled && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-semibold text-muted-foreground">Active Function Tool</label>
                <select
                  value={activeToolIndex}
                  onChange={(e) => setActiveToolIndex(parseInt(e.target.value, 10))}
                  className="w-full p-1.5 rounded-lg bg-card border border-border text-xs text-foreground font-mono focus:outline-none"
                >
                  {TOOL_PRESETS.map((tool, idx) => (
                    <option key={tool.name} value={idx}>
                      {tool.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-400 leading-normal">
                  {TOOL_PRESETS[activeToolIndex].description}
                </p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Passes executable tool signatures in <code className="text-foreground font-mono">tools</code> and catches <code className="text-foreground font-mono">tool_calls</code>.
            </p>
          </div>

          {/* Temperature */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Temperature</span>
              <span className="font-mono text-foreground font-bold">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {/* Top-P */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Top-P</span>
              <span className="font-mono text-foreground font-bold">{topP}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {/* Max Output Tokens */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Max Tokens</span>
              <span className="font-mono text-foreground font-bold">{maxTokens}</span>
            </div>
            <input
              type="range"
              min="128"
              max="8192"
              step="128"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Code Export Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Client SDK Integration Snippet</h3>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            {/* Language Tabs */}
            <div className="flex items-center space-x-2 border-b border-border pb-2 overflow-x-auto">
              {[
                { id: 'python', label: 'Python SDK (yoyo-ai)' },
                { id: 'typescript', label: 'TypeScript (@yoyo-ai/sdk)' },
                { id: 'curl', label: 'cURL Command' },
                { id: 'openai', label: 'OpenAI Drop-In' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCodeTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    codeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Code Body */}
            <div className="relative flex-1 min-h-[220px] max-h-[360px] overflow-y-auto bg-muted/60 p-4 rounded-2xl border border-border">
              <pre className="text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap break-all">
                {getCodeSnippet()}
              </pre>

              <button
                onClick={handleCopyCode}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
              <span>Endpoint: <code className="text-foreground font-mono">https://api.yoyo.ai/v1/chat/completions</code></span>
              <span className="text-muted-foreground font-mono">Dedicated GPU Pool</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-muted-foreground">Loading playground...</div>}>
      <PlaygroundInner />
    </Suspense>
  );
}
