'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
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
} from 'lucide-react';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function PlaygroundInner() {
  const searchParams = useSearchParams();
  const initialModel = searchParams.get('model') || 'llama3.3:8b';

  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(initialModel);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(0.9);
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  const [systemPrompt, setSystemPrompt] = useState<string>(
    'You are a high-performance AI assistant powered by YOYO.'
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamMetrics, setStreamMetrics] = useState<{ ttftMs?: number; totalTokens?: number }>({});
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isGenerating) return;

    const userMessage: Message = { role: 'user', content: inputPrompt.trim() };
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
    let firstTokenReceived = false;

    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMessage]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const token = localStorage.getItem('yoyo_access_token');
      const response = await fetch('http://localhost:4000/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: updatedMessages,
          temperature,
          top_p: topP,
          max_tokens: maxTokens,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Inference stream error');
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
            if (delta) {
              if (!firstTokenReceived) {
                firstTokenReceived = true;
                const ttft = Date.now() - startTime;
                setStreamMetrics((m) => ({ ...m, ttftMs: ttft }));
              }
              accumulatedReply += delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  role: 'assistant',
                  content: accumulatedReply,
                };
                return next;
              });
            }

            if (parsed.usage) {
              setStreamMetrics((m) => ({ ...m, totalTokens: parsed.usage.total_tokens }));
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: `[Error: ${err.message || 'Stream disconnected'}]`,
          };
          return next;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setStreamMetrics({});
  };

  const generateCurlSnippet = () => {
    return `curl -X POST http://localhost:4000/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${selectedModel}",
    "messages": [
      {"role": "system", "content": "${systemPrompt}"},
      {"role": "user", "content": "Hello!"}
    ],
    "temperature": ${temperature},
    "stream": true
  }'`;
  };

  const generatePythonSnippet = () => {
    return `from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:4000/v1",
    api_key="YOUR_API_KEY"
)

stream = client.chat.completions.create(
    model="${selectedModel}",
    messages=[
        {"role": "system", "content": "${systemPrompt}"},
        {"role": "user", "content": "Hello!"}
    ],
    temperature=${temperature},
    stream=True
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">Interactive Playground</h1>
            <p className="text-xs text-muted-foreground">Direct streaming testbed with low-latency GPU execution</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Model Selector */}
          <div className="flex items-center space-x-2 bg-muted/60 px-3 py-1.5 rounded-xl border border-border">
            <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-xs font-mono font-medium focus:outline-none text-foreground"
            >
              {models.length > 0 ? (
                models.map((m) => (
                  <option key={m.id} value={m.apiIdentifier} className="bg-card text-foreground">
                    {m.name} ({m.apiIdentifier})
                  </option>
                ))
              ) : (
                <option value="llama3.3:8b">Llama 3.3 8B (llama3.3:8b)</option>
              )}
            </select>
          </div>

          <button
            onClick={() => setShowCodeModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
          >
            <Code className="w-3.5 h-3.5" />
            <span>View Code</span>
          </button>

          <button
            onClick={handleReset}
            title="Reset conversation"
            className="p-2 rounded-xl bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Workspace (Chat on Left, Parameters Drawer on Right) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 min-h-0">
        {/* Chat Area */}
        <div className="md:col-span-3 flex flex-col rounded-2xl bg-card border border-border overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <Sparkles className="w-10 h-10 mb-3 text-primary opacity-60" />
                <h3 className="font-semibold text-sm text-foreground">Playground Ready</h3>
                <p className="text-xs max-w-sm mt-1">
                  Type a prompt below to initiate an active streaming inference session against{' '}
                  <span className="font-mono text-primary font-semibold">{selectedModel}</span>.
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider px-1">
                    {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? selectedModel : 'System'}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground font-medium rounded-tr-none'
                        : msg.role === 'system'
                        ? 'bg-muted/40 border border-border text-muted-foreground italic'
                        : 'bg-muted/70 text-foreground border border-border/80 rounded-tl-none font-mono'
                    }`}
                  >
                    {msg.content || (isGenerating && i === messages.length - 1 ? (
                      <span className="animate-pulse">Thinking...</span>
                    ) : null)}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Telemetry bar */}
          {(streamMetrics.ttftMs || streamMetrics.totalTokens) && (
            <div className="px-6 py-2 border-t border-border/60 bg-muted/20 flex items-center space-x-6 text-[10px] font-mono text-muted-foreground">
              {streamMetrics.ttftMs && (
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>TTFT: {streamMetrics.ttftMs}ms</span>
                </span>
              )}
              {streamMetrics.totalTokens && (
                <span className="flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Tokens: {streamMetrics.totalTokens}</span>
                </span>
              )}
            </div>
          )}

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-4 border-t border-border bg-card/60 flex items-center space-x-3">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={`Message ${selectedModel}...`}
              disabled={isGenerating}
              className="flex-1 px-4 py-3 rounded-xl bg-muted/40 border border-border text-xs focus:border-primary focus:outline-none transition-all text-foreground"
            />
            <button
              type="submit"
              disabled={isGenerating || !inputPrompt.trim()}
              className="p-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Drawer: Parameters */}
        <div className="flex flex-col p-5 rounded-2xl bg-card border border-border space-y-6 overflow-y-auto">
          <div className="flex items-center space-x-2 pb-3 border-b border-border">
            <Settings className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">Inference Parameters</span>
          </div>

          {/* System Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">System Message</label>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-muted/40 border border-border text-xs focus:border-primary focus:outline-none text-foreground font-mono"
            />
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
              className="w-full accent-primary"
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
              className="w-full accent-primary"
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
              className="w-full accent-primary"
            />
          </div>
        </div>
      </div>

      {/* Code Export Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm">Integration Code Snippets</h3>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-bold text-muted-foreground">cURL</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateCurlSnippet());
                      setCopiedCode('curl');
                      setTimeout(() => setCopiedCode(null), 2000);
                    }}
                    className="text-[11px] flex items-center space-x-1 text-primary"
                  >
                    {copiedCode === 'curl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode === 'curl' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-muted/60 rounded-xl text-[11px] font-mono text-foreground overflow-x-auto">
                  {generateCurlSnippet()}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-bold text-muted-foreground">Python (OpenAI SDK)</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatePythonSnippet());
                      setCopiedCode('python');
                      setTimeout(() => setCopiedCode(null), 2000);
                    }}
                    className="text-[11px] flex items-center space-x-1 text-primary"
                  >
                    {copiedCode === 'python' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode === 'python' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-muted/60 rounded-xl text-[11px] font-mono text-foreground overflow-x-auto">
                  {generatePythonSnippet()}
                </pre>
              </div>
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
