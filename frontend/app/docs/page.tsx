'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Terminal,
  BookOpen,
  Copy,
  Check,
  Shield,
  Zap,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Code,
  Layers,
  Search,
  Cpu,
  Server,
  Workflow,
  Sparkles,
} from 'lucide-react';
import { YoyoLogo } from '@/components/ui/logo';

type SectionId =
  | 'quickstart'
  | 'auth'
  | 'sdks'
  | 'integrations'
  | 'architecture'
  | 'chat'
  | 'tools'
  | 'embeddings'
  | 'rerank'
  | 'models'
  | 'batches'
  | 'webhooks'
  | 'errors';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('quickstart');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [sdkTab, setSdkTab] = useState<'python' | 'typescript'>('python');
  const [integrationTab, setIntegrationTab] = useState<'langchain' | 'llamaindex' | 'litellm' | 'cursor' | 'instructor'>('langchain');

  // Interactive Code & cURL Generator State
  const [genModel, setGenModel] = useState('llama-3.3-70b');
  const [genStream, setGenStream] = useState(true);
  const [genTemp, setGenTemp] = useState(0.7);
  const [genMaxTokens, setGenMaxTokens] = useState(2048);
  const [genJsonMode, setGenJsonMode] = useState(false);
  const [genSnippetTab, setGenSnippetTab] = useState<'curl' | 'python' | 'typescript' | 'openai'>('curl');
  const [embedTab, setEmbedTab] = useState<'curl' | 'python' | 'typescript'>('curl');
  const [rerankTab, setRerankTab] = useState<'curl' | 'python' | 'typescript'>('curl');

  const copy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getInteractiveSnippet = () => {
    const payload: any = {
      model: genModel,
      messages: [
        { role: 'system', content: 'You are an enterprise AI assistant.' },
        { role: 'user', content: 'Explain zero-downtime blue/green deployment.' },
      ],
      temperature: genTemp,
      max_tokens: genMaxTokens,
      stream: genStream,
    };
    if (genJsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    if (genSnippetTab === 'curl') {
      return `curl https://api.yoyo.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_live_your_actual_key_here" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
    }

    if (genSnippetTab === 'python') {
      return `from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_actual_key_here")

response = client.chat.create(
    model="${genModel}",
    messages=[
        {"role": "system", "content": "You are an enterprise AI assistant."},
        {"role": "user", "content": "Explain zero-downtime blue/green deployment."}
    ],
    temperature=${genTemp},
    max_tokens=${genMaxTokens},
    stream=${genStream ? 'True' : 'False'}${genJsonMode ? `,\n    response_format={"type": "json_object"}` : ''}
)

${
  genStream
    ? `for chunk in response:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)
print()`
    : `print(response.choices[0].message.content)`
}`;
    }

    if (genSnippetTab === 'typescript') {
      return `import { Yoyo } from '@yoyo-ai/sdk';

const client = new Yoyo({
  apiKey: process.env.YOYO_API_KEY || 'sk_live_your_actual_key_here',
});

${
  genStream
    ? `const stream = await client.chat.createStream({
  model: '${genModel}',
  messages: [
    { role: 'system', content: 'You are an enterprise AI assistant.' },
    { role: 'user', content: 'Explain zero-downtime blue/green deployment.' },
  ],
  temperature: ${genTemp},
  max_tokens: ${genMaxTokens},${genJsonMode ? `\n  response_format: { type: 'json_object' },` : ''}
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`
    : `const response = await client.chat.create({
  model: '${genModel}',
  messages: [
    { role: 'system', content: 'You are an enterprise AI assistant.' },
    { role: 'user', content: 'Explain zero-downtime blue/green deployment.' },
  ],
  temperature: ${genTemp},
  max_tokens: ${genMaxTokens},${genJsonMode ? `\n  response_format: { type: 'json_object' },` : ''}
});

console.log(response.choices[0].message.content);`
}`;
    }

    // OpenAI drop-in
    return `from openai import OpenAI

client = OpenAI(
    base_url="https://api.yoyo.ai/v1",
    api_key="sk_live_your_actual_key_here"
)

${
  genStream
    ? `stream = client.chat.completions.create(
    model="${genModel}",
    messages=[
        {"role": "system", "content": "You are an enterprise AI assistant."},
        {"role": "user", "content": "Explain zero-downtime blue/green deployment."}
    ],
    temperature=${genTemp},
    max_tokens=${genMaxTokens},
    stream=True${genJsonMode ? `,\n    response_format={"type": "json_object"}` : ''}
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
print()`
    : `completion = client.chat.completions.create(
    model="${genModel}",
    messages=[
        {"role": "system", "content": "You are an enterprise AI assistant."},
        {"role": "user", "content": "Explain zero-downtime blue/green deployment."}
    ],
    temperature=${genTemp},
    max_tokens=${genMaxTokens}${genJsonMode ? `,\n    response_format={"type": "json_object"}` : ''}
)

print(completion.choices[0].message.content)`
}`;
  };

  return (
    <div className="min-h-screen bg-[#07080C] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Top Header */}
      <header className="border-b border-white/[0.08] bg-[#0A0B10]/90 backdrop-blur-md sticky top-0 z-50 px-6 lg:px-12 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center">
            <YoyoLogo size={28} showText={true} />
          </Link>
          <span className="text-zinc-600">|</span>
          <span className="text-xs font-medium text-zinc-400">
            Enterprise Cloud API Documentation
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/status"
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Systems Normal</span>
          </Link>
          <Link
            href="/dashboard/playground"
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Playground
          </Link>
          <Link
            href="/dashboard/keys"
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-medium text-xs transition-all shadow-sm"
          >
            Get API Key
          </Link>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto flex">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r border-white/[0.08] p-6 hidden md:block shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <div className="space-y-6 text-xs">
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 block mb-2">Getting Started</span>
              <ul className="space-y-1.5 text-zinc-400">
                <li>
                  <button
                    onClick={() => setActiveSection('quickstart')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      activeSection === 'quickstart' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'hover:text-white'
                    }`}
                  >
                    Quickstart Guide
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('auth')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      activeSection === 'auth' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'hover:text-white'
                    }`}
                  >
                    Authentication
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-zinc-400 block mb-2">SDKs & Integrations</span>
              <ul className="space-y-1.5 text-zinc-400">
                <li>
                  <button
                    onClick={() => setActiveSection('sdks')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      activeSection === 'sdks' ? 'bg-cyan-500/10 text-cyan-400 font-bold' : 'hover:text-white'
                    }`}
                  >
                    Official SDKs (Python / TS)
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('integrations')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      activeSection === 'integrations' ? 'bg-cyan-500/10 text-cyan-400 font-bold' : 'hover:text-white'
                    }`}
                  >
                    Framework Integrations
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('architecture')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      activeSection === 'architecture' ? 'bg-cyan-500/10 text-cyan-400 font-bold' : 'hover:text-white'
                    }`}
                  >
                    Cloud GPU Architecture & SLA
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-zinc-400 block mb-2">Inference Endpoints</span>
              <ul className="space-y-1.5 text-zinc-400">
                <li>
                  <button
                    onClick={() => setActiveSection('chat')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      activeSection === 'chat' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'hover:text-white'
                    }`}
                  >
                    POST /v1/chat/completions
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('tools')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      activeSection === 'tools' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'hover:text-white'
                    }`}
                  >
                    Function & Tool Calling
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('embeddings')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      activeSection === 'embeddings' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'hover:text-white'
                    }`}
                  >
                    POST /v1/embeddings
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('rerank')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      activeSection === 'rerank' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'hover:text-white'
                    }`}
                  >
                    POST /v1/rerank
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('models')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      activeSection === 'models' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'hover:text-white'
                    }`}
                  >
                    GET /v1/models
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-zinc-400 block mb-2">Asynchronous & Events</span>
              <ul className="space-y-1.5 text-zinc-400">
                <li>
                  <button
                    onClick={() => setActiveSection('batches')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      activeSection === 'batches' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'hover:text-white'
                    }`}
                  >
                    Batch API (50% Off)
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('webhooks')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      activeSection === 'webhooks' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'hover:text-white'
                    }`}
                  >
                    Webhooks & HMAC Signatures
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-zinc-400 block mb-2">Platform Guidelines</span>
              <ul className="space-y-1.5 text-zinc-400">
                <li>
                  <button
                    onClick={() => setActiveSection('errors')}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                      activeSection === 'errors' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'hover:text-white'
                    }`}
                  >
                    Errors & Status Codes
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-8 lg:p-12 max-w-4xl space-y-12">
          
          {/* Quickstart */}
          {activeSection === 'quickstart' && (
            <div className="space-y-8">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Getting Started</span>
                <h1 className="text-3xl font-black text-white mt-1">Quickstart Guide</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  YOYO provides fully OpenAI-compliant HTTP endpoints backed by dedicated NVIDIA H100 SXM5 and A100 80GB cloud GPU clusters. You can use standard client SDKs in Python, Node.js, Go, or cURL without modifying your application logic.
                </p>
              </div>

              {/* Step 1 */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-xs font-mono font-bold flex items-center justify-center">1</span>
                  <span>Obtain an API Key</span>
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Log in to your developer console, navigate to <Link href="/dashboard/keys" className="text-cyan-400 underline">API Keys</Link>, and click <strong>Create New Key</strong>. You will receive a secret key in the format <code className="text-zinc-200 bg-white/[0.06] px-1.5 py-0.5 rounded font-mono">sk_live_...</code>.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-xs font-mono font-bold flex items-center justify-center">2</span>
                  <span>Direct OpenAI Drop-In (Python)</span>
                </h3>
                
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span>Python Example (openai SDK)</span>
                    <button
                      onClick={() => copy(`from openai import OpenAI\n\nclient = OpenAI(\n    base_url="https://api.yoyo.ai/v1",\n    api_key="sk_live_your_actual_key_here"\n)\n\nresponse = client.chat.completions.create(\n    model="llama-3.3-70b",\n    messages=[{"role": "user", "content": "Explain KV caching in LLMs."}],\n    stream=True\n)\n\nfor chunk in response:\n    print(chunk.choices[0].delta.content or "", end="", flush=True)`, 'qs-python')}
                      className="hover:text-white"
                    >
                      {copiedCode === 'qs-python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                    <code>{`from openai import OpenAI

client = OpenAI(
    base_url="https://api.yoyo.ai/v1",
    api_key="sk_live_your_actual_key_here"
)

response = client.chat.completions.create(
    model="llama-3.3-70b",
    messages=[{"role": "user", "content": "Explain KV caching in LLMs."}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="", flush=True)`}</code>
                  </pre>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-xs font-mono font-bold flex items-center justify-center">3</span>
                  <span>cURL Command Line Request</span>
                </h3>

                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span>cURL (POSIX / Bash)</span>
                    <button
                      onClick={() => copy(`curl https://api.yoyo.ai/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer sk_live_your_actual_key_here" \\\n  -d '{\n    "model": "llama-3.3-70b",\n    "messages": [{"role": "user", "content": "Hello cloud cluster"}],\n    "temperature": 0.7\n  }'`, 'qs-curl')}
                      className="hover:text-white"
                    >
                      {copiedCode === 'qs-curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                    <code>{`curl https://api.yoyo.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_live_your_actual_key_here" \\
  -d '{
    "model": "llama-3.3-70b",
    "messages": [{"role": "user", "content": "Hello cloud cluster"}],
    "temperature": 0.7
  }'`}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Authentication */}
          {activeSection === 'auth' && (
            <div className="space-y-8">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Security & Authentication</span>
                <h1 className="text-3xl font-black text-white mt-1">Authentication</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Every request made to YOYO endpoints must include an API key in the HTTP <code className="text-zinc-200 font-mono">Authorization</code> header as a Bearer token.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] font-mono text-xs text-zinc-300">
                <span className="text-zinc-500">Authorization: </span>
                <span className="text-cyan-400 font-bold">Bearer sk_live_your_secret_api_key</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] space-y-2">
                  <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span>SHA-256 Key Hashing</span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Keys are hashed with SHA-256 before storage in PostgreSQL. The raw secret is only displayed once at the moment of creation.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] space-y-2">
                  <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Instant Key Revocation</span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    If an API key is leaked or compromised, revoke it immediately from the <Link href="/dashboard/keys" className="text-cyan-400 underline">API Keys Dashboard</Link>. Revocation takes effect instantly across all edge nodes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Official SDKs */}
          {activeSection === 'sdks' && (
            <div className="space-y-8">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Client SDKs</span>
                <h1 className="text-3xl font-black text-white mt-1">Official Client SDKs</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  First-party, zero-bloat client libraries for Python and TypeScript with native typing, streaming support, and comprehensive exception hierarchies.
                </p>
              </div>

              {/* Language Switcher */}
              <div className="flex border-b border-white/[0.08] space-x-6 text-xs font-mono">
                <button
                  onClick={() => setSdkTab('python')}
                  className={`pb-3 font-bold transition-all relative ${
                    sdkTab === 'python' ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Python SDK (yoyo-ai)
                  {sdkTab === 'python' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
                </button>
                <button
                  onClick={() => setSdkTab('typescript')}
                  className={`pb-3 font-bold transition-all relative ${
                    sdkTab === 'typescript' ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  TypeScript SDK (@yoyo-ai/sdk)
                  {sdkTab === 'typescript' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
                </button>
              </div>

              {sdkTab === 'python' && (
                <div className="space-y-6">
                  {/* Installation */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-300">1. Installation</span>
                    <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] p-4 flex items-center justify-between font-mono text-xs">
                      <span className="text-emerald-400">pip install yoyo-ai</span>
                      <button onClick={() => copy('pip install yoyo-ai', 'pip-install')} className="text-zinc-400 hover:text-white">
                        {copiedCode === 'pip-install' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Synchronous & Streaming */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-300">2. Synchronous Streaming Client</span>
                    <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                      <div className="px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                        <span>Python (Synchronous)</span>
                        <button
                          onClick={() => copy(`from yoyo import Yoyo, YoyoError\n\nclient = Yoyo(api_key="sk_live_your_key_here")\n\ntry:\n    response = client.chat.create(\n        model="llama-3.3-70b",\n        messages=[\n            {"role": "system", "content": "You are an expert AI systems architect."},\n            {"role": "user", "content": "Explain PagedAttention and continuous batching."}\n        ],\n        stream=True,\n        temperature=0.7,\n    )\n\n    for chunk in response:\n        content = chunk.choices[0].delta.content\n        if content:\n            print(content, end="", flush=True)\n\nexcept YoyoError as e:\n    print(f"Inference error [{e.status_code}]: {e}")`, 'py-sync')}
                          className="hover:text-white"
                        >
                          {copiedCode === 'py-sync' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                        <code>{`from yoyo import Yoyo, YoyoError

client = Yoyo(api_key="sk_live_your_key_here")

try:
    response = client.chat.create(
        model="llama-3.3-70b",
        messages=[
            {"role": "system", "content": "You are an expert AI systems architect."},
            {"role": "user", "content": "Explain PagedAttention and continuous batching."}
        ],
        stream=True,
        temperature=0.7,
    )

    for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            print(content, end="", flush=True)

except YoyoError as e:
    print(f"Inference error [{e.status_code}]: {e}")`}</code>
                      </pre>
                    </div>
                  </div>

                  {/* Asynchronous FastAPI */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-300">3. Asynchronous Client (FastAPI / asyncio)</span>
                    <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                      <div className="px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                        <span>Python (AsyncYoyo)</span>
                        <button
                          onClick={() => copy(`import asyncio\nfrom yoyo import AsyncYoyo\n\nasync def run_async_inference():\n    client = AsyncYoyo(api_key="sk_live_your_key_here")\n    \n    response = await client.chat.create(\n        model="deepseek-r1-70b",\n        messages=[{"role": "user", "content": "Derive flash attention math."}],\n        stream=False\n    )\n    print(response.choices[0].message.content)\n\nasyncio.run(run_async_inference())`, 'py-async')}
                          className="hover:text-white"
                        >
                          {copiedCode === 'py-async' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                        <code>{`import asyncio
from yoyo import AsyncYoyo

async def run_async_inference():
    client = AsyncYoyo(api_key="sk_live_your_key_here")
    
    response = await client.chat.create(
        model="deepseek-r1-70b",
        messages=[{"role": "user", "content": "Derive flash attention math."}],
        stream=False
    )
    print(response.choices[0].message.content)

asyncio.run(run_async_inference())`}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {sdkTab === 'typescript' && (
                <div className="space-y-6">
                  {/* Installation */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-300">1. Installation</span>
                    <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] p-4 flex items-center justify-between font-mono text-xs">
                      <span className="text-cyan-400">npm install @yoyo-ai/sdk</span>
                      <button onClick={() => copy('npm install @yoyo-ai/sdk', 'npm-install')} className="text-zinc-400 hover:text-white">
                        {copiedCode === 'npm-install' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Streaming In Node/Next.js */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-300">2. High-Throughput Async Streaming</span>
                    <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                      <div className="px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                        <span>TypeScript / Node.js</span>
                        <button
                          onClick={() => copy(`import { Yoyo } from '@yoyo-ai/sdk';\n\nconst client = new Yoyo({\n  apiKey: process.env.YOYO_API_KEY || 'sk_live_your_key_here',\n});\n\nasync function main() {\n  const stream = await client.chat.createStream({\n    model: 'llama-3.3-70b',\n    messages: [\n      { role: 'user', content: 'What is speculative decoding in LLMs?' },\n    ],\n    temperature: 0.7,\n  });\n\n  for await (const chunk of stream) {\n    const text = chunk.choices[0]?.delta?.content || '';\n    process.stdout.write(text);\n  }\n}\n\nmain().catch(console.error);`, 'ts-stream')}
                          className="hover:text-white"
                        >
                          {copiedCode === 'ts-stream' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                        <code>{`import { Yoyo } from '@yoyo-ai/sdk';

const client = new Yoyo({
  apiKey: process.env.YOYO_API_KEY || 'sk_live_your_key_here',
});

async function main() {
  const stream = await client.chat.createStream({
    model: 'llama-3.3-70b',
    messages: [
      { role: 'user', content: 'What is speculative decoding in LLMs?' },
    ],
    temperature: 0.7,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    process.stdout.write(text);
  }
}

main().catch(console.error);`}</code>
                      </pre>
                    </div>
                  </div>

                  {/* Embeddings in TS */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-300">3. Vector Embeddings Generation</span>
                    <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                      <div className="px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                        <span>TypeScript (Embeddings)</span>
                        <button
                          onClick={() => copy(`import { Yoyo } from '@yoyo-ai/sdk';\n\nconst client = new Yoyo({ apiKey: 'sk_live_...' });\n\nconst result = await client.embeddings.create({\n  model: 'nomic-embed-text',\n  input: 'Enterprise Cloud AI Inference Platform',\n});\n\nconsole.log('Embedding vector length:', result.data[0].embedding.length);\n// 768 float dimensions`, 'ts-embed')}
                          className="hover:text-white"
                        >
                          {copiedCode === 'ts-embed' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                        <code>{`import { Yoyo } from '@yoyo-ai/sdk';

const client = new Yoyo({ apiKey: 'sk_live_...' });

const result = await client.embeddings.create({
  model: 'nomic-embed-text',
  input: 'Enterprise Cloud AI Inference Platform',
});

console.log('Embedding vector length:', result.data[0].embedding.length);
// 768 float dimensions`}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ecosystem Integrations */}
          {activeSection === 'integrations' && (
            <div className="space-y-8">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Framework Integrations</span>
                <h1 className="text-3xl font-black text-white mt-1">Framework Integrations</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Because YOYO enforces 100% strict adherence to the OpenAI wire protocol, all major modern LLM orchestration frameworks, agents, and IDE tools work out-of-the-box.
                </p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/[0.08] space-x-4 text-xs font-mono overflow-x-auto">
                {(['langchain', 'llamaindex', 'litellm', 'cursor', 'instructor'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setIntegrationTab(tab)}
                    className={`pb-3 font-medium transition-all whitespace-nowrap relative ${
                      integrationTab === tab ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab === 'langchain' && 'LangChain / LangGraph'}
                    {tab === 'llamaindex' && 'LlamaIndex'}
                    {tab === 'litellm' && 'LiteLLM'}
                    {tab === 'cursor' && 'Cursor IDE'}
                    {tab === 'instructor' && 'Instructor (Pydantic)'}
                    {integrationTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
                  </button>
                ))}
              </div>

              {/* LangChain */}
              {integrationTab === 'langchain' && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-400">
                    Use <code className="text-cyan-400 font-mono">ChatOpenAI</code> from <code className="text-zinc-200 font-mono">langchain_openai</code>, pointing <code className="text-zinc-200 font-mono">base_url</code> to <code className="text-cyan-400 font-mono">https://api.yoyo.ai/v1</code>:
                  </p>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                      <span>Python (LangChain)</span>
                      <button
                        onClick={() => copy(`from langchain_openai import ChatOpenAI\nfrom langchain_core.messages import HumanMessage, SystemMessage\n\nllm = ChatOpenAI(\n    model="llama-3.3-70b",\n    openai_api_base="https://api.yoyo.ai/v1",\n    openai_api_key="sk_live_your_actual_key_here",\n    temperature=0.2,\n)\n\nmessages = [\n    SystemMessage(content="You are an autonomous cloud infrastructure agent."),\n    HumanMessage(content="Generate a fault-tolerant HAProxy configuration.")\n]\n\nresponse = llm.invoke(messages)\nprint(response.content)`, 'lc-code')}
                        className="hover:text-white"
                      >
                        {copiedCode === 'lc-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                      <code>{`from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

llm = ChatOpenAI(
    model="llama-3.3-70b",
    openai_api_base="https://api.yoyo.ai/v1",
    openai_api_key="sk_live_your_actual_key_here",
    temperature=0.2,
)

messages = [
    SystemMessage(content="You are an autonomous cloud infrastructure agent."),
    HumanMessage(content="Generate a fault-tolerant HAProxy configuration.")
]

response = llm.invoke(messages)
print(response.content)`}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* LlamaIndex */}
              {integrationTab === 'llamaindex' && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-400">
                    Use <code className="text-cyan-400 font-mono">OpenAI</code> from <code className="text-zinc-200 font-mono">llama_index.llms.openai</code>:
                  </p>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                      <span>Python (LlamaIndex)</span>
                      <button
                        onClick={() => copy(`from llama_index.llms.openai import OpenAI\n\nllm = OpenAI(\n    model="qwen-2.5-coder-32b",\n    api_base="https://api.yoyo.ai/v1",\n    api_key="sk_live_your_actual_key_here",\n    temperature=0.1,\n)\n\nresponse = llm.complete("Write an optimized CUDA kernel for matrix multiplication.")\nprint(response.text)`, 'li-code')}
                        className="hover:text-white"
                      >
                        {copiedCode === 'li-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                      <code>{`from llama_index.llms.openai import OpenAI

llm = OpenAI(
    model="qwen-2.5-coder-32b",
    api_base="https://api.yoyo.ai/v1",
    api_key="sk_live_your_actual_key_here",
    temperature=0.1,
)

response = llm.complete("Write an optimized CUDA kernel for matrix multiplication.")
print(response.text)`}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* LiteLLM */}
              {integrationTab === 'litellm' && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-400">
                    Route requests through <code className="text-cyan-400 font-mono">litellm</code> using prefix <code className="text-zinc-200 font-mono">openai/&lt;model&gt;</code> and YOYO's <code className="text-zinc-200 font-mono">api_base</code>:
                  </p>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                      <span>Python (LiteLLM)</span>
                      <button
                        onClick={() => copy(`import litellm\n\nresponse = litellm.completion(\n    model="openai/llama-3.3-70b",\n    api_base="https://api.yoyo.ai/v1",\n    api_key="sk_live_your_actual_key_here",\n    messages=[{"role": "user", "content": "Benchmark FP8 vs INT4 precision across tensor cores"}]\n)\n\nprint(response.choices[0].message.content)`, 'lite-code')}
                        className="hover:text-white"
                      >
                        {copiedCode === 'lite-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                      <code>{`import litellm

response = litellm.completion(
    model="openai/llama-3.3-70b",
    api_base="https://api.yoyo.ai/v1",
    api_key="sk_live_your_actual_key_here",
    messages=[{"role": "user", "content": "Benchmark FP8 vs INT4 precision across tensor cores"}]
)

print(response.choices[0].message.content)`}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Cursor IDE */}
              {integrationTab === 'cursor' && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Configure Cursor IDE or VS Code Continue extension to use your private YOYO cloud models for coding assistance, completions, and edits:
                  </p>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] p-6 space-y-4">
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded bg-cyan-400/20 text-cyan-400 font-bold flex items-center justify-center text-[10px]">1</span>
                        <span className="text-white font-bold">Open Cursor Settings &rarr; Models</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded bg-cyan-400/20 text-cyan-400 font-bold flex items-center justify-center text-[10px]">2</span>
                        <span className="text-zinc-300">Enable <strong>OpenAI API Key</strong> toggle</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded bg-cyan-400/20 text-cyan-400 font-bold flex items-center justify-center text-[10px]">3</span>
                        <span className="text-zinc-300">Set <strong>Override OpenAI Base URL</strong>:</span>
                        <code className="text-cyan-400 bg-white/[0.06] px-2 py-0.5 rounded">https://api.yoyo.ai/v1</code>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded bg-cyan-400/20 text-cyan-400 font-bold flex items-center justify-center text-[10px]">4</span>
                        <span className="text-zinc-300">Add Model Names:</span>
                        <span className="text-purple-400">qwen-2.5-coder-32b</span>
                        <span className="text-zinc-600">,</span>
                        <span className="text-purple-400">llama-3.3-70b</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructor */}
              {integrationTab === 'instructor' && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-400">
                    Extract strongly-typed JSON data matching Pydantic schemas using <code className="text-cyan-400 font-mono">instructor</code>:
                  </p>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                      <span>Python (Instructor + Pydantic)</span>
                      <button
                        onClick={() => copy(`import instructor\nfrom openai import OpenAI\nfrom pydantic import BaseModel, Field\n\nclass BenchmarkReport(BaseModel):\n    model_name: str\n    inference_engine: str\n    time_to_first_token_ms: float\n    tokens_per_second: float\n    memory_utilization_pct: float\n\nclient = instructor.from_openai(\n    OpenAI(\n        base_url="https://api.yoyo.ai/v1",\n        api_key="sk_live_your_actual_key_here",\n    )\n)\n\nreport = client.chat.completions.create(\n    model="llama-3.3-70b",\n    response_model=BenchmarkReport,\n    messages=[\n        {"role": "user", "content": "Benchmark vLLM on H100 with Llama 3.3 70B: TTFT is 18.4ms, 124 tok/sec, 78% VRAM"}\n    ]\n)\n\nprint(report.model_dump_json(indent=2))`, 'inst-code')}
                        className="hover:text-white"
                      >
                        {copiedCode === 'inst-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                      <code>{`import instructor
from openai import OpenAI
from pydantic import BaseModel, Field

class BenchmarkReport(BaseModel):
    model_name: str
    inference_engine: str
    time_to_first_token_ms: float
    tokens_per_second: float
    memory_utilization_pct: float

client = instructor.from_openai(
    OpenAI(
        base_url="https://api.yoyo.ai/v1",
        api_key="sk_live_your_actual_key_here",
    )
)

report = client.chat.completions.create(
    model="llama-3.3-70b",
    response_model=BenchmarkReport,
    messages=[
        {"role": "user", "content": "Benchmark vLLM on H100 with Llama 3.3 70B: TTFT is 18.4ms, 124 tok/sec, 78% VRAM"}
    ]
)

print(report.model_dump_json(indent=2))`}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cloud GPU Architecture & SLA */}
          {activeSection === 'architecture' && (
            <div className="space-y-8">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Architecture & SLA</span>
                <h1 className="text-3xl font-black text-white mt-1">Cloud GPU Architecture</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  YOYO is engineered as an enterprise-grade cloud inference fabric. Every request enters through an ultra-low latency Fastify Edge Gateway and is dynamically dispatched across dedicated NVIDIA H100 SXM5 and A100 80GB clusters.
                </p>
              </div>

              {/* Hardware & Dispatch Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-400">
                    <Cpu className="w-4 h-4" />
                    <span className="text-xs font-semibold text-zinc-200">H100 SXM5 Clusters</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    3.35 TB/s HBM3 memory bandwidth with 4th Gen Tensor Cores delivering sub-25ms Time-to-First-Token (TTFT) on 70B models.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] space-y-2">
                  <div className="flex items-center space-x-2 text-purple-400">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-semibold text-zinc-200">PagedAttention</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    vLLM continuous batching and virtual memory allocation prevent KV cache memory fragmentation, achieving 100% compute utilization.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <Server className="w-4 h-4" />
                    <span className="text-xs font-semibold text-zinc-200">Least-Connections</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Dynamic dispatch routes queries to the worker with the fewest active streams. Instant automatic failover re-routes dropped connections in &lt;50ms.
                  </p>
                </div>
              </div>

              {/* SLA Table */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">Service Level Agreements (SLA)</h3>
                <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0A0B10]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0D0F16] border-b border-white/[0.06] text-zinc-400 text-xs font-medium">
                      <tr>
                        <th className="py-2.5 px-4">Metric</th>
                        <th className="py-2.5 px-4">Target SLA</th>
                        <th className="py-2.5 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">API Gateway Uptime</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">99.99%</td>
                        <td className="py-3 px-4 text-zinc-400">Dual-redundant Traefik ingress with multi-region DNS failover.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">Cold Start Latency</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">0 ms</td>
                        <td className="py-3 px-4 text-zinc-400">Models remain pre-warmed in high-bandwidth GPU VRAM continuously.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">Node Failover Time</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">&lt; 50 ms</td>
                        <td className="py-3 px-4 text-zinc-400">Automatic secondary cluster dispatch upon upstream worker timeout.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">Time-to-First-Token (TTFT)</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">&lt; 25 ms</td>
                        <td className="py-3 px-4 text-zinc-400">vLLM chunked prefill running on dedicated H100 SXM5 GPUs.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Kubernetes Production Orchestration */}
              <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                <div className="flex items-center space-x-2 text-cyan-400">
                  <Workflow className="w-5 h-5" />
                  <h3 className="text-lg font-bold text-white">Kubernetes Production Orchestration (`k8s/`)</h3>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  The YOYO cloud inference platform provides enterprise Kubernetes manifests managed via Kustomize in the <code className="text-zinc-200">k8s/</code> directory. Deploy the entire stack to any CNCF-certified cluster (EKS, GKE, AKS, or on-prem bare-metal) with a single declarative command:
                </p>

                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span>Declarative Kustomize Deployment</span>
                    <button
                      onClick={() => copy(`kubectl apply -k k8s/\nkubectl get pods,hpa,ingress -n yoyo-system -w`, 'k8s-deploy')}
                      className="hover:text-white"
                    >
                      {copiedCode === 'k8s-deploy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                    <code>{`# 1. Apply all resources declaratively via Kustomize
kubectl apply -k k8s/

# 2. Monitor rollouts and active pod health
kubectl rollout status deployment/yoyo-backend -n yoyo-system
kubectl get pods,hpa,ingress -n yoyo-system`}</code>
                  </pre>
                </div>

                {/* Manifest Inventory Grid */}
                <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0A0B10]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0D0F16] border-b border-white/[0.06] text-zinc-400 text-xs font-medium">
                      <tr>
                        <th className="py-2.5 px-4">Manifest</th>
                        <th className="py-2.5 px-4">Kubernetes Kind</th>
                        <th className="py-2.5 px-4">Purpose & Specifications</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">00-namespace.yaml</td>
                        <td className="py-3 px-4 text-purple-400">Namespace</td>
                        <td className="py-3 px-4 text-zinc-400">Isolated <code className="text-zinc-200">yoyo-system</code> namespace with multi-tenant RBAC policies.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">01-configmap.yaml</td>
                        <td className="py-3 px-4 text-purple-400">ConfigMap</td>
                        <td className="py-3 px-4 text-zinc-400">Environment configuration, Redis URLs, feature flags, and endpoint URLs.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">02-secret.yaml</td>
                        <td className="py-3 px-4 text-purple-400">Secret</td>
                        <td className="py-3 px-4 text-zinc-400">Database credentials, JWT secret keys, and Stripe billing API keys.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">03-postgres.yaml</td>
                        <td className="py-3 px-4 text-purple-400">Deployment + Service</td>
                        <td className="py-3 px-4 text-zinc-400">PostgreSQL 16 Alpine state storage with PersistentVolumeClaim and pg_isready health checks.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">04-redis.yaml</td>
                        <td className="py-3 px-4 text-purple-400">Deployment + Service</td>
                        <td className="py-3 px-4 text-zinc-400">Redis 7 Alpine token-bucket rate limiter with in-memory persistence and health probes.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">05-backend.yaml</td>
                        <td className="py-3 px-4 text-purple-400">Deployment + HPA</td>
                        <td className="py-3 px-4 text-zinc-400">Fastify 5 Gateway with rolling update (<code className="text-zinc-200">maxSurge: 1</code>, <code className="text-zinc-200">maxUnavailable: 0</code>) and HPA (3–25 pods).</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">06-frontend.yaml</td>
                        <td className="py-3 px-4 text-purple-400">Deployment + Service</td>
                        <td className="py-3 px-4 text-zinc-400">Next.js 15 developer cockpit with health probes on port 3000.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">07-ingress.yaml</td>
                        <td className="py-3 px-4 text-purple-400">Ingress</td>
                        <td className="py-3 px-4 text-zinc-400">NGINX edge routing with Let's Encrypt automated TLS, 1-hour SSE streaming timeouts, and proxy buffering disabled.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* HPA & Ingress Architectural Callouts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <Zap className="w-4 h-4" />
                      <span className="text-xs font-semibold text-zinc-200">Horizontal Pod Autoscaler (HPA)</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Monitors real-time API Gateway load. Scales between <span className="text-emerald-400 font-bold">3 and 25 replicas</span> dynamically when average CPU exceeds <span className="text-zinc-200 font-mono">70%</span> or average Memory exceeds <span className="text-zinc-200 font-mono">80%</span>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] space-y-2">
                    <div className="flex items-center space-x-2 text-cyan-400">
                      <Shield className="w-4 h-4" />
                      <span className="text-xs font-semibold text-zinc-200">Zero-Latency SSE Ingress Configuration</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Configured with <code className="text-zinc-200">proxy-buffering: &quot;off&quot;</code> and <code className="text-zinc-200">proxy-read-timeout: &quot;3600&quot;</code> to eliminate intermediary NGINX socket buffers, guaranteeing instantaneous token stream delivery to clients.
                    </p>
                  </div>
                </div>
              </div>

              {/* Docker Compose Multi-Profile Profiles */}
              <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                <div className="flex items-center space-x-2 text-cyan-400">
                  <Server className="w-5 h-5" />
                  <h3 className="text-lg font-bold text-white">Docker Compose Multi-Profile Engine</h3>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Run the platform locally or on self-hosted GPU instances using official Docker Compose profiles tailored for your hardware capabilities:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] space-y-2">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">1. CPU / Mock Mode</span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Spawns PostgreSQL, Redis, Backend, and Frontend. Instant boot with simulated foundation model tokens.
                    </p>
                    <code className="text-[11px] block text-zinc-300 bg-white/[0.04] p-2 rounded font-mono">
                      docker compose up -d
                    </code>
                  </div>

                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] space-y-2">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">2. Ollama GPU Profile</span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Mounts local NVIDIA GPUs with container passthrough and initializes Ollama foundation model workers.
                    </p>
                    <code className="text-[11px] block text-zinc-300 bg-white/[0.04] p-2 rounded font-mono">
                      docker compose --profile ollama up -d
                    </code>
                  </div>

                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] space-y-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">3. vLLM High-Throughput</span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      High-throughput continuous batching and PagedAttention with Qwen and Llama foundation models on NVIDIA GPUs.
                    </p>
                    <code className="text-[11px] block text-zinc-300 bg-white/[0.04] p-2 rounded font-mono">
                      docker compose --profile vllm up -d
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat Completions */}
          {activeSection === 'chat' && (
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-400 mb-2">
                  <span>POST</span>
                  <span>/v1/chat/completions</span>
                </div>
                <h1 className="text-3xl font-black text-white">Chat Completions</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Generate streaming or non-streaming responses from hosted foundation models with full OpenAI wire-protocol parity.
                </p>
              </div>

              {/* Parameters Table */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">Request Body Parameters</h3>
                <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0A0B10]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0D0F16] border-b border-white/[0.06] text-zinc-400 text-xs font-medium">
                      <tr>
                        <th className="py-2.5 px-4">Parameter</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Required</th>
                        <th className="py-2.5 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">model</td>
                        <td className="py-3 px-4 text-purple-400">string</td>
                        <td className="py-3 px-4 text-emerald-400">Required</td>
                        <td className="py-3 px-4 text-zinc-400">Target model identifier (e.g. <code className="text-zinc-200">llama-3.3-70b</code>, <code className="text-zinc-200">qwen-2.5-coder-32b</code>, <code className="text-zinc-200">deepseek-r1-70b</code>).</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">messages</td>
                        <td className="py-3 px-4 text-purple-400">array</td>
                        <td className="py-3 px-4 text-emerald-400">Required</td>
                        <td className="py-3 px-4 text-zinc-400">List of messages with role (<code className="text-zinc-200">system</code>, <code className="text-zinc-200">user</code>, <code className="text-zinc-200">assistant</code>) and content.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">stream</td>
                        <td className="py-3 px-4 text-purple-400">boolean</td>
                        <td className="py-3 px-4 text-zinc-500">Optional</td>
                        <td className="py-3 px-4 text-zinc-400">If true, returns Server-Sent Events (SSE) data chunks. Default: <code className="text-zinc-200">false</code>.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">temperature</td>
                        <td className="py-3 px-4 text-purple-400">number</td>
                        <td className="py-3 px-4 text-zinc-500">Optional</td>
                        <td className="py-3 px-4 text-zinc-400">Sampling temperature between 0.0 and 2.0. Default: <code className="text-zinc-200">0.7</code>.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">max_tokens</td>
                        <td className="py-3 px-4 text-purple-400">integer</td>
                        <td className="py-3 px-4 text-zinc-500">Optional</td>
                        <td className="py-3 px-4 text-zinc-400">Maximum tokens to generate before stopping. Default: <code className="text-zinc-200">2048</code>.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">response_format</td>
                        <td className="py-3 px-4 text-purple-400">object</td>
                        <td className="py-3 px-4 text-zinc-500">Optional</td>
                        <td className="py-3 px-4 text-zinc-400">Enforces structured outputs. Pass <code className="text-zinc-200">{`{ "type": "json_object" }`}</code> to guarantee valid JSON syntax.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">tools</td>
                        <td className="py-3 px-4 text-purple-400">array</td>
                        <td className="py-3 px-4 text-zinc-500">Optional</td>
                        <td className="py-3 px-4 text-zinc-400">List of function calling tools available to the model. Conforms to OpenAI wire schema.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">tool_choice</td>
                        <td className="py-3 px-4 text-purple-400">string | object</td>
                        <td className="py-3 px-4 text-zinc-500">Optional</td>
                        <td className="py-3 px-4 text-zinc-400">Controls which tool is invoked. Supported: <code className="text-zinc-200">"none"</code>, <code className="text-zinc-200">"auto"</code>, or a specific function object. Default: <code className="text-zinc-200">"auto"</code>.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Interactive Request Builder & Playground */}
              <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center space-x-2">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <span>Interactive Request Builder</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Configure parameters below to generate live ready-to-run API commands.
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/playground?model=${encodeURIComponent(genModel)}`}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-semibold transition-all flex items-center space-x-1.5 self-start md:self-auto"
                  >
                    <span>Open in Live Playground</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Configuration Controls Bar */}
                <div className="p-4 rounded-2xl bg-[#0A0B10] border border-white/[0.08] grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
                  {/* Model */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-400 text-xs font-medium">Foundation Model</label>
                    <select
                      value={genModel}
                      onChange={(e) => setGenModel(e.target.value)}
                      className="w-full bg-[#12141D] text-white border border-white/[0.1] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="llama-3.3-70b">Llama 3.3 70B (General)</option>
                      <option value="qwen-2.5-coder-32b">Qwen 2.5 Coder 32B (Coding)</option>
                      <option value="deepseek-r1-70b">DeepSeek R1 70B (Reasoning)</option>
                      <option value="mistral-large-2411">Mistral Large 2411 (128k)</option>
                      <option value="llama-3.1-8b-instant">Llama 3.1 8B (Sub-10ms)</option>
                    </select>
                  </div>

                  {/* Temperature */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                      <span>Temperature</span>
                      <span className="text-cyan-400 font-bold">{genTemp}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.05"
                      value={genTemp}
                      onChange={(e) => setGenTemp(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                      <span>Max Tokens</span>
                      <span className="text-purple-400 font-bold">{genMaxTokens}</span>
                    </div>
                    <input
                      type="range"
                      min="128"
                      max="4096"
                      step="128"
                      value={genMaxTokens}
                      onChange={(e) => setGenMaxTokens(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center justify-around space-x-3 pt-2">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={genStream}
                        onChange={(e) => setGenStream(e.target.checked)}
                        className="rounded border-zinc-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5 accent-cyan-400"
                      />
                      <span className="text-zinc-300 text-xs">SSE Stream</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={genJsonMode}
                        onChange={(e) => setGenJsonMode(e.target.checked)}
                        className="rounded border-zinc-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5 accent-cyan-400"
                      />
                      <span className="text-zinc-300 text-xs">JSON Mode</span>
                    </label>
                  </div>
                </div>

                {/* Generated Code Window */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                  <div className="px-4 py-2 bg-[#0D0F16] border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center space-x-2 overflow-x-auto">
                      {[
                        { id: 'curl', label: 'cURL' },
                        { id: 'python', label: 'Python SDK' },
                        { id: 'typescript', label: 'TypeScript SDK' },
                        { id: 'openai', label: 'OpenAI Drop-In' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setGenSnippetTab(t.id as any)}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                            genSnippetTab === t.id
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => copy(getInteractiveSnippet(), 'interactive-snippet')}
                      className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-zinc-300 hover:text-white transition-all"
                    >
                      {copiedCode === 'interactive-snippet' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto max-h-[320px]">
                    <code>{getInteractiveSnippet()}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Function & Tool Calling */}
          {activeSection === 'tools' && (
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-400 mb-2">
                  <span>SPECIFICATION</span>
                  <span>OpenAI Tool Calling Protocol</span>
                </div>
                <h1 className="text-3xl font-black text-white">Function & Tool Calling</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Connect open foundation models to external APIs, databases, and custom business logic. Models hosted on YOYO (such as <code className="text-zinc-200">qwen-2.5-coder-32b</code> and <code className="text-zinc-200">llama-3.3-70b</code>) natively output structured <code className="text-zinc-200">tool_calls</code> matching OpenAI wire specifications.
                </p>
              </div>

              {/* Execution Flow Diagram */}
              <div className="p-5 rounded-2xl bg-[#0A0B10] border border-white/[0.08] space-y-4 font-mono text-xs">
                <span className="text-xs font-semibold text-zinc-400 block">Agentic Tool Loop Flow</span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-cyan-400 font-bold block mb-1">1. Define Tools</span>
                    <p className="text-[11px] text-zinc-400 font-sans">Provide function declarations & JSON schemas in <code className="text-zinc-200 font-mono">tools</code></p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-purple-400 font-bold block mb-1">2. Model Decision</span>
                    <p className="text-[11px] text-zinc-400 font-sans">Model outputs structured <code className="text-zinc-200 font-mono">tool_calls</code> payload</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-amber-400 font-bold block mb-1">3. Execute Tool</span>
                    <p className="text-[11px] text-zinc-400 font-sans">Your app runs the function with model arguments</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-emerald-400 font-bold block mb-1">4. Synthesize</span>
                    <p className="text-[11px] text-zinc-400 font-sans">Feed tool result back to model for final answer</p>
                  </div>
                </div>
              </div>

              {/* Tool Calling Code Example */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">Complete Working Example</h3>
                <div className="rounded-2xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400 font-bold">Python SDK: Tool Calling Loop</span>
                    <button
                      onClick={() =>
                        copy(
                          `from openai import OpenAI
import json

client = OpenAI(
    base_url="https://api.yoyo.ai/v1",
    api_key="sk_live_your_actual_key_here"
)

# 1. Define tool schemas
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_stock_quote",
            "description": "Get real-time market quote for a stock ticker symbol",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string", "description": "Ticker symbol, e.g. NVDA, AAPL"},
                    "currency": {"type": "string", "enum": ["USD", "EUR"], "default": "USD"}
                },
                "required": ["ticker"]
            }
        }
    }
]

messages = [
    {"role": "user", "content": "What is NVIDIA trading at right now?"}
]

# 2. Invoke model with tools enabled
response = client.chat.completions.create(
    model="qwen-2.5-coder-32b",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

msg = response.choices[0].message
if msg.tool_calls:
    for tool_call in msg.tool_calls:
        func_name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        print(f"Model called {func_name} with args: {args}")
        
        # 3. Execute function locally
        tool_result = {"ticker": args["ticker"], "price": 142.50, "currency": "USD"}
        
        # 4. Append assistant tool_calls message and tool result
        messages.append(msg)
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(tool_result)
        })

    # 5. Get final synthesized natural language response
    final_response = client.chat.completions.create(
        model="qwen-2.5-coder-32b",
        messages=messages
    )
    print("Final answer:", final_response.choices[0].message.content)`,
                          'python-tool-calling'
                        )
                      }
                      className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-zinc-300 hover:text-white transition-all"
                    >
                      {copiedCode === 'python-tool-calling' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto max-h-[380px]">
                    <code>{`from openai import OpenAI
import json

client = OpenAI(
    base_url="https://api.yoyo.ai/v1",
    api_key="sk_live_your_actual_key_here"
)

# 1. Define tool schemas
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_stock_quote",
            "description": "Get real-time market quote for a stock ticker symbol",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string", "description": "Ticker symbol, e.g. NVDA, AAPL"},
                    "currency": {"type": "string", "enum": ["USD", "EUR"], "default": "USD"}
                },
                "required": ["ticker"]
            }
        }
    }
]

messages = [
    {"role": "user", "content": "What is NVIDIA trading at right now?"}
]

# 2. Invoke model with tools enabled
response = client.chat.completions.create(
    model="qwen-2.5-coder-32b",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

msg = response.choices[0].message
if msg.tool_calls:
    for tool_call in msg.tool_calls:
        func_name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        print(f"Model called {func_name} with args: {args}")
        
        # 3. Execute function locally
        tool_result = {"ticker": args["ticker"], "price": 142.50, "currency": "USD"}
        
        # 4. Append assistant message and tool response
        messages.append(msg)
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(tool_result)
        })

    # 5. Get final synthesized response
    final_response = client.chat.completions.create(
        model="qwen-2.5-coder-32b",
        messages=messages
    )
    print("Final answer:", final_response.choices[0].message.content)`}</code>
                  </pre>
                </div>
              </div>

              {/* Best Practices for Tool Calling with Open Models */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] space-y-2">
                  <h4 className="text-xs font-semibold text-cyan-400">Recommended Models for Tool Use</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    For high reliability, use <strong className="text-white font-mono">qwen-2.5-coder-32b</strong> or <strong className="text-white font-mono">llama-3.3-70b</strong>. These models have been specifically instruction-tuned on function calling benchmarks (Berkeley Function-Calling Leaderboard).
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] space-y-2">
                  <h4 className="text-xs font-semibold text-purple-400">Strict Schema Validation</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Always include <code className="text-zinc-200 font-mono">"required"</code> array and detailed field <code className="text-zinc-200 font-mono">"description"</code> properties in your JSON schema to prevent hallucinated parameter keys.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Embeddings */}
          {activeSection === 'embeddings' && (
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-xs font-mono text-purple-400 mb-2">
                  <span>POST</span>
                  <span>/v1/embeddings</span>
                </div>
                <h1 className="text-3xl font-black text-white">Embeddings</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Generate high-dimensional vector representations of text for semantic search and retrieval-augmented generation (RAG).
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] p-4">
                  <span className="text-[11px] text-zinc-500 block mb-1">Target Model</span>
                  <span className="text-cyan-400 font-bold font-mono text-xs">nomic-embed-text</span>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] p-4">
                  <span className="text-[11px] text-zinc-500 block mb-1">Embedding Dimensions</span>
                  <span className="text-emerald-400 font-bold font-mono text-xs">768 floats</span>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] p-4">
                  <span className="text-[11px] text-zinc-500 block mb-1">Max Context</span>
                  <span className="text-zinc-200 font-bold font-mono text-xs">8,192 tokens</span>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] p-4">
                  <span className="text-[11px] text-zinc-500 block mb-1">Pricing</span>
                  <span className="text-purple-400 font-bold font-mono text-xs">$0.02 / 1M tokens</span>
                </div>
              </div>

              {/* Embeddings Parameters Table */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">Request Parameters</h3>
                <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0A0B10]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0D0F16] border-b border-white/[0.06] text-zinc-400 text-xs font-medium">
                      <tr>
                        <th className="py-2.5 px-4">Parameter</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Required</th>
                        <th className="py-2.5 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">model</td>
                        <td className="py-3 px-4 text-purple-400">string</td>
                        <td className="py-3 px-4 text-emerald-400">Required</td>
                        <td className="py-3 px-4 text-zinc-400">Embedding model identifier (e.g. <code className="text-zinc-200">nomic-embed-text</code>).</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">input</td>
                        <td className="py-3 px-4 text-purple-400">string | string[]</td>
                        <td className="py-3 px-4 text-emerald-400">Required</td>
                        <td className="py-3 px-4 text-zinc-400">Input text string or array of text strings to embed.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">encoding_format</td>
                        <td className="py-3 px-4 text-purple-400">string</td>
                        <td className="py-3 px-4 text-zinc-500">Optional</td>
                        <td className="py-3 px-4 text-zinc-400">Format to return the embeddings. Pass <code className="text-zinc-200">"float"</code> (default) or <code className="text-zinc-200">"base64"</code>.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Embeddings Code Tabs */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06]">
                  <div className="flex items-center space-x-2">
                    {(['curl', 'python', 'typescript'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setEmbedTab(tab)}
                        className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all ${
                          embedTab === tab
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {tab === 'curl' ? 'cURL' : tab === 'python' ? 'Python SDK' : 'TypeScript SDK'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const code =
                        embedTab === 'curl'
                          ? `curl https://api.yoyo.ai/v1/embeddings \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer sk_live_your_actual_key_here" \\\n  -d '{\n    "model": "nomic-embed-text",\n    "input": "High-performance GPU inference engine on Kubernetes."\n  }'`
                          : embedTab === 'python'
                          ? `from yoyo import Yoyo\n\nclient = Yoyo(api_key="sk_live_your_actual_key_here")\nresponse = client.embeddings.create(\n    model="nomic-embed-text",\n    input="High-performance GPU inference engine on Kubernetes."\n)\n\nprint("Vector dimensions:", len(response.data[0].embedding))`
                          : `import { Yoyo } from '@yoyo-ai/sdk';\n\nconst client = new Yoyo({ apiKey: 'sk_live_your_actual_key_here' });\nconst response = await client.embeddings.create({\n  model: 'nomic-embed-text',\n  input: 'High-performance GPU inference engine on Kubernetes.',\n});\n\nconsole.log('Embedding length:', response.data[0].embedding.length);`;
                      copy(code, 'embed-code');
                    }}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-mono transition-colors"
                  >
                    {copiedCode === 'embed-code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-zinc-300">
                  <pre>
                    {embedTab === 'curl' && `curl https://api.yoyo.ai/v1/embeddings \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_live_your_actual_key_here" \\
  -d '{
    "model": "nomic-embed-text",
    "input": "High-performance GPU inference engine on Kubernetes."
  }'`}
                    {embedTab === 'python' && `from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_actual_key_here")

response = client.embeddings.create(
    model="nomic-embed-text",
    input="High-performance GPU inference engine on Kubernetes."
)

print("Vector dimensions:", len(response.data[0].embedding))
# Output: Vector dimensions: 768`}
                    {embedTab === 'typescript' && `import { Yoyo } from '@yoyo-ai/sdk';

const client = new Yoyo({
  apiKey: process.env.YOYO_API_KEY || 'sk_live_your_actual_key_here',
});

const response = await client.embeddings.create({
  model: 'nomic-embed-text',
  input: 'High-performance GPU inference engine on Kubernetes.',
});

console.log('Embedding length:', response.data[0].embedding.length);
// Output: Embedding length: 768`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Rerank */}
          {activeSection === 'rerank' && (
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 mb-2">
                  <span>POST</span>
                  <span>/v1/rerank</span>
                </div>
                <h1 className="text-3xl font-black text-white">Semantic Reranker</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Two-stage retrieval reranking using state-of-the-art cross-encoders (<code className="text-zinc-200">bge-reranker-large</code>). Improves search and RAG relevance by up to 35% over vector cosine similarity alone.
                </p>
              </div>

              {/* Rerank Specs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] p-4">
                  <span className="text-[11px] text-zinc-500 block mb-1">Resident Model</span>
                  <span className="text-cyan-400 font-bold font-mono text-xs">bge-reranker-large</span>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] p-4">
                  <span className="text-[11px] text-zinc-500 block mb-1">p95 Latency</span>
                  <span className="text-emerald-400 font-bold font-mono text-xs">&lt; 15ms</span>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] p-4">
                  <span className="text-[11px] text-zinc-500 block mb-1">Max Documents</span>
                  <span className="text-zinc-200 font-bold font-mono text-xs">1,000 / req</span>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] p-4">
                  <span className="text-[11px] text-zinc-500 block mb-1">Pricing</span>
                  <span className="text-purple-400 font-bold font-mono text-xs">$0.05 / 1k queries</span>
                </div>
              </div>

              {/* Two-Stage Retrieval Architecture Callout */}
              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 space-y-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-semibold text-cyan-300">Why Two-Stage Retrieval (Bi-Encoder + Cross-Encoder)?</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Standard vector databases use <em>bi-encoders</em> to independently project queries and documents into vector space. While fast, bi-encoders cannot capture token-to-token cross-attention between question and answer. YOYO's <code className="text-cyan-300 font-mono">/v1/rerank</code> uses a true <em>cross-encoder</em> to jointly attend across both sequences simultaneously, filtering false positives and ordering results with benchmark-topping precision.
                </p>
              </div>

              {/* Request Parameters Table */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">Request Parameters</h3>
                <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0A0B10]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0D0F16] border-b border-white/[0.06] text-zinc-400 text-xs font-medium">
                      <tr>
                        <th className="py-2.5 px-4">Parameter</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Required</th>
                        <th className="py-2.5 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">model</td>
                        <td className="py-3 px-4 text-purple-400">string</td>
                        <td className="py-3 px-4 text-emerald-400">Required</td>
                        <td className="py-3 px-4 text-zinc-400">Target reranking model (e.g. <code className="text-zinc-200">bge-reranker-large</code>).</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">query</td>
                        <td className="py-3 px-4 text-purple-400">string</td>
                        <td className="py-3 px-4 text-emerald-400">Required</td>
                        <td className="py-3 px-4 text-zinc-400">The search query or reference question to score documents against.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">documents</td>
                        <td className="py-3 px-4 text-purple-400">string[] | object[]</td>
                        <td className="py-3 px-4 text-emerald-400">Required</td>
                        <td className="py-3 px-4 text-zinc-400">List of candidate text strings or objects with a <code className="text-zinc-200">text</code> field.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">top_n</td>
                        <td className="py-3 px-4 text-purple-400">integer</td>
                        <td className="py-3 px-4 text-zinc-500">Optional</td>
                        <td className="py-3 px-4 text-zinc-400">Number of top-ranked results to return. Default: returns all documents.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-cyan-400 font-bold">return_documents</td>
                        <td className="py-3 px-4 text-purple-400">boolean</td>
                        <td className="py-3 px-4 text-zinc-500">Optional</td>
                        <td className="py-3 px-4 text-zinc-400">If true, returns the document text within each result object. Default: <code className="text-zinc-200">false</code>.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rerank Code Tabs */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#0D0F16] border-b border-white/[0.06]">
                  <div className="flex items-center space-x-2">
                    {(['curl', 'python', 'typescript'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setRerankTab(tab)}
                        className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all ${
                          rerankTab === tab
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {tab === 'curl' ? 'cURL' : tab === 'python' ? 'Python SDK' : 'TypeScript SDK'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const code =
                        rerankTab === 'curl'
                          ? `curl https://api.yoyo.ai/v1/rerank \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer sk_live_your_actual_key_here" \\\n  -d '{\n    "model": "bge-reranker-large",\n    "query": "What are the storage guarantees of Kubernetes StatefulSets?",\n    "documents": [\n      "Fastify is an extremely low-overhead web framework for Node.js.",\n      "Kubernetes StatefulSets provide persistent volume storage guarantees across pod rescheduling.",\n      "Redis is an in-memory key-value data store used for fast caching."\n    ],\n    "top_n": 2,\n    "return_documents": true\n  }'`
                          : rerankTab === 'python'
                          ? `from yoyo import Yoyo\n\nclient = Yoyo(api_key="sk_live_your_actual_key_here")\n\nresponse = client.rerank(\n    model="bge-reranker-large",\n    query="What are the storage guarantees of Kubernetes StatefulSets?",\n    documents=[\n        "Fastify is an extremely low-overhead web framework for Node.js.",\n        "Kubernetes StatefulSets provide persistent volume storage guarantees across pod rescheduling.",\n        "Redis is an in-memory key-value data store used for fast caching."\n    ],\n    top_n=2,\n    return_documents=True\n)\n\nfor doc in response.results:\n    print(f"Rank #{doc.index} (Score: {doc.relevance_score:.4f}): {doc.document.get('text')}")`
                          : `import { Yoyo } from '@yoyo-ai/sdk';\n\nconst client = new Yoyo({\n  apiKey: process.env.YOYO_API_KEY || 'sk_live_your_actual_key_here',\n});\n\nconst response = await client.rerank.create({\n  model: 'bge-reranker-large',\n  query: 'What are the storage guarantees of Kubernetes StatefulSets?',\n  documents: [\n    'Fastify is an extremely low-overhead web framework for Node.js.',\n    'Kubernetes StatefulSets provide persistent volume storage guarantees across pod rescheduling.',\n    'Redis is an in-memory key-value data store used for fast caching.',\n  ],\n  top_n: 2,\n  return_documents: true,\n});\n\nresponse.results.forEach((res) => {\n  console.log(\`Rank #\${res.index} Score: \${res.relevance_score}\`);\n});`;
                      copy(code, 'rerank-code');
                    }}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-mono transition-colors"
                  >
                    {copiedCode === 'rerank-code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-zinc-300">
                  <pre>
                    {rerankTab === 'curl' && `curl https://api.yoyo.ai/v1/rerank \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_live_your_actual_key_here" \\
  -d '{
    "model": "bge-reranker-large",
    "query": "What are the storage guarantees of Kubernetes StatefulSets?",
    "documents": [
      "Fastify is an extremely low-overhead web framework for Node.js.",
      "Kubernetes StatefulSets provide persistent volume storage guarantees across pod rescheduling.",
      "Redis is an in-memory key-value data store used for fast caching."
    ],
    "top_n": 2,
    "return_documents": true
  }'`}
                    {rerankTab === 'python' && `from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_actual_key_here")

response = client.rerank(
    model="bge-reranker-large",
    query="What are the storage guarantees of Kubernetes StatefulSets?",
    documents=[
        "Fastify is an extremely low-overhead web framework for Node.js.",
        "Kubernetes StatefulSets provide persistent volume storage guarantees across pod rescheduling.",
        "Redis is an in-memory key-value data store used for fast caching."
    ],
    top_n=2,
    return_documents=True
)

for doc in response.results:
    print(f"Rank #{doc.index} (Score: {doc.relevance_score:.4f}): {doc.document.get('text')}")`}
                    {rerankTab === 'typescript' && `import { Yoyo } from '@yoyo-ai/sdk';

const client = new Yoyo({
  apiKey: process.env.YOYO_API_KEY || 'sk_live_your_actual_key_here',
});

const response = await client.rerank.create({
  model: 'bge-reranker-large',
  query: 'What are the storage guarantees of Kubernetes StatefulSets?',
  documents: [
    'Fastify is an extremely low-overhead web framework for Node.js.',
    'Kubernetes StatefulSets provide persistent volume storage guarantees across pod rescheduling.',
    'Redis is an in-memory key-value data store used for fast caching.',
  ],
  top_n: 2,
  return_documents: true,
});

response.results.forEach((res) => {
  console.log(\`Rank #\${res.index} Score: \${res.relevance_score}\`);
});`}
                  </pre>
                </div>
              </div>

              {/* Rerank Response Schema */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">Response Format</h3>
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] p-4 text-xs font-mono text-zinc-300 overflow-x-auto">
                  <pre>{`{
  "id": "rerank-c89b2f41",
  "results": [
    {
      "index": 1,
      "relevance_score": 0.9654,
      "document": {
        "text": "Kubernetes StatefulSets provide persistent volume storage guarantees across pod rescheduling."
      }
    },
    {
      "index": 0,
      "relevance_score": 0.3128,
      "document": {
        "text": "Fastify is an extremely low-overhead web framework for Node.js."
      }
    }
  ],
  "meta": {
    "api_version": { "version": "1" },
    "billed_units": { "search_units": 1 }
  }
}`}</pre>
                </div>
              </div>
            </div>
          )}

          {/* Models */}
          {activeSection === 'models' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 mb-2">
                    <span>GET</span>
                    <span>/v1/models</span>
                  </div>
                  <h1 className="text-3xl font-black text-white">Available Foundation Models</h1>
                  <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                    Returns all resident open-weights models served across YOYO cloud GPU clusters. Drop-in compatible with standard OpenAI SDK <code className="text-zinc-200">client.models.list()</code>.
                  </p>
                </div>
                <Link
                  href="/dashboard/models"
                  className="px-4 py-2 rounded-xl bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-500/20 text-cyan-400 font-mono text-xs font-bold transition-all self-start md:self-auto flex items-center space-x-1.5"
                >
                  <span>Explore in Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Models Reference Table */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">Cloud Compute Catalog</h3>
                <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0A0B10]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0D0F16] border-b border-white/[0.06] text-zinc-400 text-xs font-medium">
                      <tr>
                        <th className="py-2.5 px-4">Identifier</th>
                        <th className="py-2.5 px-4">Provider</th>
                        <th className="py-2.5 px-4">Context</th>
                        <th className="py-2.5 px-4">Precision</th>
                        <th className="py-2.5 px-4">Input / Output Price</th>
                        <th className="py-2.5 px-4">Hardware Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                      {[
                        {
                          id: 'llama-3.3-70b',
                          provider: 'Meta',
                          context: '131,072',
                          precision: 'FP16',
                          price: '$0.20 / $0.40',
                          hardware: '2x NVIDIA H100 80GB',
                        },
                        {
                          id: 'llama3.3:8b',
                          provider: 'Meta',
                          context: '131,072',
                          precision: 'Q4_K_M',
                          price: '$0.15 / $0.30',
                          hardware: '1x NVIDIA A100 80GB',
                        },
                        {
                          id: 'qwen-2.5-coder-32b',
                          provider: 'Alibaba Cloud',
                          context: '131,072',
                          precision: 'FP16',
                          price: '$0.40 / $0.80',
                          hardware: '2x NVIDIA H100 80GB',
                        },
                        {
                          id: 'qwen2.5-coder:7b',
                          provider: 'Alibaba Cloud',
                          context: '131,072',
                          precision: 'Q4_K_M',
                          price: '$0.18 / $0.35',
                          hardware: '1x NVIDIA A100 80GB',
                        },
                        {
                          id: 'deepseek-r1-70b',
                          provider: 'DeepSeek',
                          context: '131,072',
                          precision: 'FP16',
                          price: '$0.80 / $1.60',
                          hardware: '2x NVIDIA H100 80GB',
                        },
                        {
                          id: 'deepseek-r1:8b',
                          provider: 'DeepSeek',
                          context: '65,536',
                          precision: 'Q4_K_M',
                          price: '$0.20 / $0.40',
                          hardware: '1x NVIDIA A100 80GB',
                        },
                        {
                          id: 'mistral-large-2411',
                          provider: 'Mistral AI',
                          context: '131,072',
                          precision: 'FP16',
                          price: '$1.20 / $2.40',
                          hardware: '4x NVIDIA A100 80GB',
                        },
                        {
                          id: 'nomic-embed-text:latest',
                          provider: 'Nomic',
                          context: '8,192',
                          precision: 'FP16',
                          price: '$0.02 / $0.02',
                          hardware: '1x NVIDIA A100 80GB',
                        },
                      ].map((m) => (
                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-cyan-400 font-bold">{m.id}</td>
                          <td className="py-3 px-4 text-zinc-300">{m.provider}</td>
                          <td className="py-3 px-4 text-purple-400">{m.context}</td>
                          <td className="py-3 px-4 text-zinc-400">{m.precision}</td>
                          <td className="py-3 px-4 text-emerald-400">{m.price}</td>
                          <td className="py-3 px-4 text-zinc-400">{m.hardware}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Wire Protocol Response Example */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">Wire Protocol Response JSON</h3>
                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0A0B10] font-mono text-xs text-zinc-300 overflow-x-auto">
                  <pre>
                    <code>{`{
  "object": "list",
  "data": [
    {
      "id": "llama-3.3-70b",
      "object": "model",
      "created": 1730000000,
      "owned_by": "meta"
    },
    {
      "id": "qwen-2.5-coder-32b",
      "object": "model",
      "created": 1730000000,
      "owned_by": "alibaba-cloud"
    },
    {
      "id": "deepseek-r1-70b",
      "object": "model",
      "created": 1730000000,
      "owned_by": "deepseek"
    },
    {
      "id": "mistral-large-2411",
      "object": "model",
      "created": 1730000000,
      "owned_by": "mistral-ai"
    },
    {
      "id": "nomic-embed-text:latest",
      "object": "model",
      "created": 1730000000,
      "owned_by": "nomic"
    }
  ]
}`}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Batches API */}
          {activeSection === 'batches' && (
            <div className="space-y-8">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Batch Inference</span>
                <div className="flex items-center space-x-3 mt-1">
                  <h1 className="text-3xl font-black text-white">Batch API</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    50% Discount (24h SLA)
                  </span>
                </div>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Execute non-latency-sensitive workloads (evaluations, synthetic data generation, summarization) asynchronously across cloud GPU clusters at 50% of the standard real-time token cost.
                </p>
              </div>

              {/* JSONL Format Guide */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">1. Prepare your JSONL File</h3>
                <p className="text-xs text-zinc-400">
                  Each line in the file must be a JSON object containing a <code className="text-cyan-400">custom_id</code>, HTTP method, target URL, and inference body.
                </p>
                <div className="relative rounded-xl border border-white/[0.08] bg-[#0A0B10] p-4 font-mono text-xs overflow-x-auto text-zinc-300">
                  <pre><code>{`{"custom_id": "eval-001", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "Explain general relativity."}]}}
{"custom_id": "eval-002", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "qwen-2.5-coder-32b", "messages": [{"role": "user", "content": "Write an async LRU cache in Rust."}]}}`}</code></pre>
                </div>
              </div>

              {/* Code Samples */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-white">2. Submit & Monitor Batch Jobs</h3>
                
                {/* Python SDK */}
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/[0.06] bg-[#0D0F16] flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-300">Python SDK</span>
                    <button
                      onClick={() =>
                        copy(
                          `from yoyo import Yoyo

client = Yoyo(api_key="sk_live_...")

# 1. Upload JSONL dataset
file_obj = client.files.create(
    file_content='{"custom_id": "req-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "Hello world"}]}}',
    purpose="batch"
)

# 2. Queue batch inference job (50% off)
batch = client.batches.create(
    input_file_id=file_obj["id"],
    endpoint="/v1/chat/completions",
    completion_window="24h"
)
print("Batch queued:", batch["id"])

# 3. Check status & retrieve results
status = client.batches.retrieve(batch["id"])
if status["status"] == "COMPLETED":
    results = client.files.content(status["output_file_id"])
    print(results)`,
                          'python-batch-sample'
                        )
                      }
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      {copiedCode === 'python-batch-sample' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto">
                    <code>{`from yoyo import Yoyo

client = Yoyo(api_key="sk_live_...")

# 1. Upload JSONL dataset
file_obj = client.files.create(
    file_content='{"custom_id": "req-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "Hello world"}]}}',
    purpose="batch"
)

# 2. Queue batch inference job (50% off)
batch = client.batches.create(
    input_file_id=file_obj["id"],
    endpoint="/v1/chat/completions",
    completion_window="24h"
)
print("Batch queued:", batch["id"])

# 3. Check status & retrieve results
status = client.batches.retrieve(batch["id"])
if status["status"] == "COMPLETED":
    results = client.files.content(status["output_file_id"])
    print(results)`}</code>
                  </pre>
                </div>

                {/* cURL */}
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/[0.06] bg-[#0D0F16] flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-300">cURL REST API</span>
                    <button
                      onClick={() =>
                        copy(
                          `# Upload file
curl https://api.yoyo.ai/v1/files \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"filename": "inputs.jsonl", "content": "{\\"custom_id\\": \\"1\\", \\"method\\": \\"POST\\", \\"url\\": \\"/v1/chat/completions\\", \\"body\\": {\\"model\\": \\"llama-3.3-70b\\", \\"messages\\": [{\\"role\\": \\"user\\", \\"content\\": \\"Hi\\"}]}}", "purpose": "batch"}'

# Queue batch
curl https://api.yoyo.ai/v1/batches \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input_file_id": "file_123456", "endpoint": "/v1/chat/completions", "completion_window": "24h"}'`,
                          'curl-batch-sample'
                        )
                      }
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      {copiedCode === 'curl-batch-sample' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto">
                    <code>{`# 1. Upload file
curl https://api.yoyo.ai/v1/files \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"filename": "inputs.jsonl", "content": "{\\"custom_id\\": \\"1\\", \\"method\\": \\"POST\\", \\"url\\": \\"/v1/chat/completions\\", \\"body\\": {\\"model\\": \\"llama-3.3-70b\\", \\"messages\\": [{\\"role\\": \\"user\\", \\"content\\": \\"Hi\\"}]}}", "purpose": "batch"}'

# 2. Queue batch (50% discount)
curl https://api.yoyo.ai/v1/batches \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input_file_id": "file_123456", "endpoint": "/v1/chat/completions", "completion_window": "24h"}'`}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Webhooks API */}
          {activeSection === 'webhooks' && (
            <div className="space-y-8">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Webhooks</span>
                <h1 className="text-3xl font-black text-white mt-1">Webhooks & HMAC Verification</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Receive cryptographically signed HTTP POST notifications for batch completions, usage limit thresholds, and platform lifecycle events.
                </p>
              </div>

              {/* Signature Spec */}
              <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0A0B10] space-y-3">
                <h3 className="text-base font-semibold text-white">HMAC-SHA256 Signature Header</h3>
                <p className="text-xs text-zinc-400">
                  Every outgoing webhook request includes a <code className="text-cyan-400">X-Yoyo-Signature</code> header in the format:
                </p>
                <div className="p-3 rounded-lg bg-[#0D0F16] border border-white/[0.06] font-mono text-xs text-cyan-300">
                  X-Yoyo-Signature: t=1730000000,v1=9b82c7d9e4a1f...
                </div>
                <p className="text-xs text-zinc-400">
                  The signature is computed over <code className="text-zinc-200">{"${t}.${rawRequestBody}"}</code> using your endpoint secret (<code className="text-zinc-200">whsec_...</code>).
                </p>
              </div>

              {/* Signature Verification Snippets */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-white">Signature Verification Implementations</h3>

                {/* Python Verification */}
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/[0.06] bg-[#0D0F16] flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-300">Python (FastAPI / Flask)</span>
                    <button
                      onClick={() =>
                        copy(
                          `import hmac
import hashlib
import time

def verify_yoyo_signature(payload_bytes: bytes, sig_header: str, secret: str, tolerance_sec: int = 300) -> bool:
    parts = dict(item.split("=") for item in sig_header.split(","))
    timestamp = parts.get("t")
    signature = parts.get("v1")
    
    if not timestamp or not signature:
        return False
        
    if abs(time.time() - int(timestamp)) > tolerance_sec:
        return False  # Replay attack protection
        
    to_sign = f"{timestamp}.".encode("utf-8") + payload_bytes
    expected = hmac.new(secret.encode("utf-8"), to_sign, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)`,
                          'python-webhook-verify'
                        )
                      }
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      {copiedCode === 'python-webhook-verify' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto">
                    <code>{`import hmac
import hashlib
import time

def verify_yoyo_signature(payload_bytes: bytes, sig_header: str, secret: str, tolerance_sec: int = 300) -> bool:
    parts = dict(item.split("=") for item in sig_header.split(","))
    timestamp = parts.get("t")
    signature = parts.get("v1")
    
    if not timestamp or not signature:
        return False
        
    # Replay attack defense
    if abs(time.time() - int(timestamp)) > tolerance_sec:
        return False
        
    to_sign = f"{timestamp}.".encode("utf-8") + payload_bytes
    expected = hmac.new(secret.encode("utf-8"), to_sign, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)`}</code>
                  </pre>
                </div>

                {/* Node.js Verification */}
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/[0.06] bg-[#0D0F16] flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-300">Node.js (Express / Fastify)</span>
                    <button
                      onClick={() =>
                        copy(
                          `import crypto from 'crypto';

export function verifyYoyoSignature(rawBody: string | Buffer, sigHeader: string, secret: string): boolean {
  const parts = Object.fromEntries(sigHeader.split(',').map((p) => p.split('=')));
  const { t, v1 } = parts;
  if (!t || !v1) return false;

  const toSign = \`\${t}.\${typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')}\`;
  const expected = crypto.createHmac('sha256', secret).update(toSign).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}`,
                          'node-webhook-verify'
                        )
                      }
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      {copiedCode === 'node-webhook-verify' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto">
                    <code>{`import crypto from 'crypto';

export function verifyYoyoSignature(rawBody: string | Buffer, sigHeader: string, secret: string): boolean {
  const parts = Object.fromEntries(sigHeader.split(',').map((p) => p.split('=')));
  const { t, v1 } = parts;
  if (!t || !v1) return false;

  const toSign = \`\${t}.\${typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')}\`;
  const expected = crypto.createHmac('sha256', secret).update(toSign).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}`}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {activeSection === 'errors' && (
            <div className="space-y-8">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">API Reference</span>
                <h1 className="text-3xl font-black text-white mt-1">HTTP Status Codes & Errors</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Standard HTTP response codes returned by the YOYO Fastify API Gateway.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0A0B10]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0D0F16] border-b border-white/[0.06] text-zinc-400 text-xs font-medium">
                    <tr>
                      <th className="py-2.5 px-4">Code</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Meaning & Remediation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                    <tr>
                      <td className="py-3 px-4 text-emerald-400 font-bold">200 OK</td>
                      <td className="py-3 px-4">Success</td>
                      <td className="py-3 px-4 text-zinc-400">Request executed successfully and completions/embeddings returned.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-amber-400 font-bold">400 Bad Request</td>
                      <td className="py-3 px-4">Invalid Syntax</td>
                      <td className="py-3 px-4 text-zinc-400">Malformed JSON body, missing required parameters (<code className="text-zinc-200">model</code>, <code className="text-zinc-200">messages</code>), or invalid types.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-red-400 font-bold">401 Unauthorized</td>
                      <td className="py-3 px-4">Invalid Key</td>
                      <td className="py-3 px-4 text-zinc-400">Missing, invalid, expired, or revoked <code className="text-zinc-200">sk_live_...</code> API key.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-red-400 font-bold">403 Forbidden</td>
                      <td className="py-3 px-4">Scope / Quota Denied</td>
                      <td className="py-3 px-4 text-zinc-400">Target model is not permitted by API key scope, account is suspended, or prepaid compute balance is \$0.00.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-amber-400 font-bold">404 Not Found</td>
                      <td className="py-3 px-4">Model Not Found</td>
                      <td className="py-3 px-4 text-zinc-400">Requested model identifier does not exist in the active catalog (<code className="text-zinc-200">GET /v1/models</code>).</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-amber-400 font-bold">429 Rate Limit</td>
                      <td className="py-3 px-4">Too Many Requests</td>
                      <td className="py-3 px-4 text-zinc-400">Exceeded RPM (Requests Per Minute) or sliding-window TPM (Tokens Per Minute) limit for this API key.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-red-400 font-bold">500 Internal Error</td>
                      <td className="py-3 px-4">Inference Error</td>
                      <td className="py-3 px-4 text-zinc-400">Unexpected runtime exception during generation or serialization.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-red-400 font-bold">503 Service Unavailable</td>
                      <td className="py-3 px-4">All Workers Busy</td>
                      <td className="py-3 px-4 text-zinc-400">All cloud GPU inference workers are temporarily busy or offline. Least-connections failover loop exhausted.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Standard Error Response Schema */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">Error Response Payload</h3>
                <p className="text-xs text-zinc-400">
                  All 4xx and 5xx responses emit standard OpenAI wire-protocol error objects:
                </p>
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0B10] p-4 text-xs font-mono text-zinc-300 overflow-x-auto">
                  <pre>{`{
  "error": {
    "message": "Token rate limit exceeded for key. Used: 62400 / 60000 TPM. Reset in 42s.",
    "type": "tokens_per_minute_exceeded",
    "param": null,
    "code": 429
  }
}`}</pre>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
