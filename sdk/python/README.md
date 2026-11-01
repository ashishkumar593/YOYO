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

### 3. Vector Embeddings

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

### 4. Custom Self-Hosted Base URL

```python
client = Yoyo(
    api_key="sk_live_...",
    base_url="https://api.yoyo.ai/v1"  # Or your self-hosted endpoint
)
```
