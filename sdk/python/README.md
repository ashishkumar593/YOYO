# YOYO Python Client

Lightweight, zero-dependency Python client for the **YOYO AI Model API Platform**. Works out of the box with pure Python standard library (`urllib`).

Alternatively, YOYO is 100% compatible with the official `openai` Python package.

---

## Direct Usage

```python
from yoyo import Yoyo

client = Yoyo(
    api_key="sk_live_a7f9c2d1_...",
    base_url="http://localhost:4000/v1"
)

# 1. Non-streaming chat completion
response = client.chat.completions.create(
    model="llama3.3:8b",
    messages=[
        {"role": "system", "content": "You are a concise AI assistant."},
        {"role": "user", "content": "What is the capital of France?"}
    ]
)
print(response["choices"][0]["message"]["content"])

# 2. Streaming chat completion
stream = client.chat.completions.create(
    model="llama3.3:8b",
    messages=[{"role": "user", "content": "Count from 1 to 5"}],
    stream=True
)

for chunk in stream:
    delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
    print(delta, end="", flush=True)
```

---

## Using Official OpenAI SDK

Because YOYO implements strict OpenAI endpoint parity, you can also use `pip install openai`:

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:4000/v1",
    api_key="sk_live_a7f9c2d1_..."
)

stream = client.chat.completions.create(
    model="llama3.3:8b",
    messages=[{"role": "user", "content": "Hello!"}],
    stream=True
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
```

