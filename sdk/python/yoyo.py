"""
Official Python Client for the YOYO AI Model API Platform.
Compatible with standard OpenAI SDK semantics.
"""

from typing import List, Dict, Any, Generator, Optional
import json
import urllib.request
import urllib.error


class YoyoError(Exception):
    pass


class ChatCompletions:
    def __init__(self, client: "Yoyo"):
        self.client = client

    def create(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        stream: bool = False,
        **kwargs: Any,
    ) -> Any:
        url = f"{self.client.base_url}/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
            **kwargs,
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.client.api_key}",
            },
            method="POST",
        )

        if not stream:
            try:
                with urllib.request.urlopen(req, timeout=self.client.timeout) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                raise YoyoError(f"HTTP {e.code}: {e.read().decode('utf-8')}")
        else:
            return self._stream_generator(req)

    def _stream_generator(self, req: urllib.request.Request) -> Generator[Dict[str, Any], None, None]:
        try:
            with urllib.request.urlopen(req, timeout=self.client.timeout) as resp:
                for line in resp:
                    decoded = line.decode("utf-8").strip()
                    if not decoded or not decoded.startswith("data: "):
                        continue
                    data_str = decoded[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        yield json.loads(data_str)
                    except json.JSONDecodeError:
                        continue
        except urllib.error.HTTPError as e:
            raise YoyoError(f"Stream error HTTP {e.code}: {e.read().decode('utf-8')}")


class Chat:
    def __init__(self, client: "Yoyo"):
        self.completions = ChatCompletions(client)


class Models:
    def __init__(self, client: "Yoyo"):
        self.client = client

    def list(self) -> Dict[str, Any]:
        url = f"{self.client.base_url}/models"
        req = urllib.request.Request(
            url,
            headers={"Authorization": f"Bearer {self.client.api_key}"},
        )
        try:
            with urllib.request.urlopen(req, timeout=self.client.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raise YoyoError(f"HTTP {e.code}: {e.read().decode('utf-8')}")


class Embeddings:
    def __init__(self, client: "Yoyo"):
        self.client = client

    def create(self, model: str, input: Any) -> Dict[str, Any]:
        url = f"{self.client.base_url}/embeddings"
        payload = {"model": model, "input": input}
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.client.api_key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.client.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raise YoyoError(f"HTTP {e.code}: {e.read().decode('utf-8')}")


class Yoyo:
    """YOYO AI Model API Client."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "http://localhost:4000/v1",
        timeout: int = 60,
    ):
        if not api_key:
            raise ValueError("api_key must be provided (format: sk_live_...)")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.chat = Chat(self)
        self.models = Models(self)
        self.embeddings = Embeddings(self)

