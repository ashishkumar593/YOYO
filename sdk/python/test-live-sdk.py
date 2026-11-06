import os
import sys
import json
import urllib.request

# Ensure local yoyo.py is in path
sys.path.insert(0, os.path.dirname(__file__))
from yoyo import Yoyo

print("=== Testing Python SDK Against Live Fastify Backend ===")

# 0. Obtain a real API key via Admin login
login_req = urllib.request.Request(
    "http://localhost:4000/api/auth/login",
    data=json.dumps({"email": "admin@yoyo.ai", "password": "Admin@Yoyo2026!"}).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(login_req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["accessToken"]

# Prune old keys if near limit
list_req = urllib.request.Request(
    "http://localhost:4000/api/keys",
    headers={"Authorization": f"Bearer {token}"},
    method="GET"
)
try:
    with urllib.request.urlopen(list_req) as resp:
        existing = json.loads(resp.read().decode("utf-8"))
        if isinstance(existing, list) and len(existing) >= 8:
            for old in existing[:5]:
                del_req = urllib.request.Request(
                    f"http://localhost:4000/api/keys/{old['id']}",
                    headers={"Authorization": f"Bearer {token}"},
                    method="DELETE"
                )
                try:
                    urllib.request.urlopen(del_req)
                except Exception:
                    pass
except Exception:
    pass

key_req = urllib.request.Request(
    "http://localhost:4000/api/keys",
    data=json.dumps({"name": "Python SDK Test Key"}).encode("utf-8"),
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    method="POST"
)
with urllib.request.urlopen(key_req) as resp:
    real_api_key = json.loads(resp.read().decode("utf-8"))["plaintextKey"]

print(f"[OK] Live API Key created: {real_api_key[:16]}...")

# Create client pointing to live backend with the real key
client = Yoyo(api_key=real_api_key, base_url="http://localhost:4000/v1")

# 1. Models list
models = client.models.list()
print(f"[OK] Python SDK models.list(): {len(models.get('data', []))} models retrieved.")

# 1b. Chat, Embeddings & Rerank
chat = client.chat.create(
    model="llama-3.3-70b",
    messages=[{"role": "user", "content": "Testing Python SDK live."}],
)
print(f"[OK] Python SDK chat.create(): {chat['model']} response received.")

embed = client.embeddings.create(
    model="nomic-embed-text",
    input="Testing embeddings from Python SDK",
)
print(f"[OK] Python SDK embeddings.create(): {len(embed['data'][0]['embedding'])} dims")

rerank = client.rerank(
    model="bge-reranker-large",
    query="What is YOYO?",
    documents=[
        "YOYO is an enterprise cloud AI model API platform.",
        "Python is a high-level programming language.",
    ],
    top_n=1,
    return_documents=True,
)
print(f"[OK] Python SDK rerank(): Scored top doc with score {rerank['results'][0]['relevance_score']}")

# 2. File upload
file_res = client.files.create(
    filename="python_sdk_batch.jsonl",
    file_content='{"custom_id": "py-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "Hello from Python SDK"}]}}',
    purpose="batch"
)
print(f"[OK] Python SDK files.create(): File ID = {file_res['id']}")

# 3. File content retrieve
content = client.files.content(file_res['id'])
print(f"[OK] Python SDK files.content(): Retrieved {len(content)} chars.")

# 4. Batch creation
batch = client.batches.create(
    input_file_id=file_res['id'],
    endpoint="/v1/chat/completions",
    completion_window="24h"
)
print(f"[OK] Python SDK batches.create(): Batch ID = {batch['id']}, Status = {batch['status']}")

# 5. Batch retrieve
status = client.batches.retrieve(batch['id'])
print(f"[OK] Python SDK batches.retrieve(): Batch ID = {status['id']}, Status = {status['status']}")

print("=== All Python SDK Live End-to-End Checks Passed! ===")
