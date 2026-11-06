# YOYO AI — Official Python SDK

Ultra-low-latency, lightweight Python client for the YOYO Cloud AI Model API Platform. Drop-in compatible with standard OpenAI SDK parameters, with zero external dependencies (uses standard `urllib`).

---

## Installation

```bash
pip install yoyo-ai
# Or local editable install:
pip install -e .
```

---

## Quickstart

### 1. Chat Completion (Non-Streaming)

```python
from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_api_key_here")

response = client.chat.completions.create(
    model="llama-3.3-70b",
    messages=[
        {"role": "system", "content": "You are a concise code assistant."},
        {"role": "user", "content": "Write a Python function to compute moving averages."}
    ],
    temperature=0.7,
    max_tokens=1024,
)

print(response["choices"][0]["message"]["content"])
```

---

### 2. Live SSE Streaming

```python
from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_api_key_here")

stream = client.chat.completions.create(
    model="qwen-2.5-coder-32b",
    messages=[
        {"role": "user", "content": "Explain Redis token bucket rate limiting in two sentences."}
    ],
    stream=True
)

for chunk in stream:
    delta = chunk["choices"][0]["delta"].get("content", "")
    print(delta, end="", flush=True)
print()
```

---

### 3. Asynchronous Streaming (`AsyncYoyo` for FastAPI & Asyncio)

```python
import asyncio
from yoyo import AsyncYoyo

async def main():
    client = AsyncYoyo(api_key="sk_live_your_api_key_here")
    
    stream = await client.chat.completions.create(
        model="llama-3.3-70b",
        messages=[{"role": "user", "content": "Write an async worker loop."}],
        stream=True
    )
    
    async for chunk in stream:
        delta = chunk["choices"][0]["delta"].get("content", "")
        print(delta, end="", flush=True)
    print()

asyncio.run(main())
```

---

### 4. Vector Embeddings (`/v1/embeddings`)

```python
from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_api_key_here")

embeddings = client.embeddings.create(
    model="nomic-embed-text:latest",
    input="Cloud GPU inference cluster optimization"
)

vector = embeddings["data"][0]["embedding"]
print(f"Embedding vector dimensions: {len(vector)}")
```

---

### 5. Semantic Reranking (`/v1/rerank`)

```python
from yoyo import Yoyo

client = Yoyo()  # Reads YOYO_API_KEY from environment

ranked = client.rerank(
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

for item in ranked["results"]:
    print(f"Rank {item['index']} (Score: {item['relevance_score']:.4f}): {item['document']['text']}")
```

---

### 6. Asynchronous Batch Inference (50% Off)

```python
from yoyo import Yoyo

client = Yoyo()

# 1. Upload JSONL file
file_record = client.files.create(
    filename="eval_batch.jsonl",
    file_content='{"custom_id": "req-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "Explain quantum computing."}]}}',
    purpose="batch"
)

# 2. Queue batch with 24-hour turnaround SLA
batch = client.batches.create(
    input_file_id=file_record["id"],
    endpoint="/v1/chat/completions",
    completion_window="24h"
)

print(f"Batch {batch['id']} queued with 50% discount!")
```

---

### 7. Custom Self-Hosted Base URL & Ambient API Key

```python
import os

# Set ambient API key
os.environ["YOYO_API_KEY"] = "sk_live_..."

# Client automatically reads the environment variable:
client = Yoyo()

# Or configure a custom self-hosted gateway:
client = Yoyo(
    api_key="sk_live_...",
    base_url="https://api.yoyo.ai/v1"  # Or your self-hosted endpoint
)
```
