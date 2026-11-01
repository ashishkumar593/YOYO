"""
Official Python Client for the YOYO Cloud AI Model API Platform.
Compatible with standard OpenAI SDK semantics.
"""

from typing import List, Dict, Any, Generator, AsyncGenerator, Optional
import json
import urllib.request
import urllib.error
import asyncio


class YoyoError(Exception):
    """Base exception for all YOYO API errors."""
    pass


class YoyoAuthenticationError(YoyoError):
    """Raised when API key is missing, invalid, or revoked (HTTP 401)."""
    pass


class YoyoRateLimitError(YoyoError):
    """Raised when rate limits (RPM/TPM) or credit balance are exhausted (HTTP 429)."""
    pass


class YoyoNotFoundError(YoyoError):
    """Raised when requested model or resource is not found (HTTP 404)."""
    pass


def _map_http_error(e: urllib.error.HTTPError) -> YoyoError:
    try:
        body = e.read().decode("utf-8")
        parsed = json.loads(body)
        msg = parsed.get("error", {}).get("message") or body
    except Exception:
        msg = str(e)

    if e.code == 401:
        return YoyoAuthenticationError(f"HTTP 401 Unauthorized: {msg}")
    elif e.code == 429:
        return YoyoRateLimitError(f"HTTP 429 Rate Limit Exceeded: {msg}")
    elif e.code == 404:
        return YoyoNotFoundError(f"HTTP 404 Not Found: {msg}")
    return YoyoError(f"HTTP {e.code} API Error: {msg}")


class ChatCompletions:
    def __init__(self, client: "Yoyo"):
        self.client = client

    def create(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        top_p: float = 0.9,
        max_tokens: int = 2048,
        stream: bool = False,
        stop: Optional[Any] = None,
        **kwargs: Any,
    ) -> Any:
        url = f"{self.client.base_url}/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p,
            "max_tokens": max_tokens,
            "stream": stream,
            **kwargs,
        }
        if stop is not None:
            payload["stop"] = stop

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.client.api_key}",
                "User-Agent": "Yoyo-Python-SDK/1.0.0",
            },
            method="POST",
        )

        if not stream:
            try:
                with urllib.request.urlopen(req, timeout=self.client.timeout) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                raise _map_http_error(e)
            except Exception as e:
                raise YoyoError(f"Network error: {str(e)}")
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
            raise _map_http_error(e)
        except Exception as e:
            raise YoyoError(f"Stream interrupted: {str(e)}")


class Chat:
    def __init__(self, client: "Yoyo"):
        self.completions = ChatCompletions(client)

    def create(self, *args: Any, **kwargs: Any) -> Any:
        """Shortcut for client.chat.completions.create(...)."""
        return self.completions.create(*args, **kwargs)


class Models:
    def __init__(self, client: "Yoyo"):
        self.client = client

    def list(self) -> Dict[str, Any]:
        url = f"{self.client.base_url}/models"
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {self.client.api_key}",
                "User-Agent": "Yoyo-Python-SDK/1.0.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=self.client.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raise _map_http_error(e)
        except Exception as e:
            raise YoyoError(f"Network error: {str(e)}")


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
                "User-Agent": "Yoyo-Python-SDK/1.0.0",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.client.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raise _map_http_error(e)
        except Exception as e:
            raise YoyoError(f"Network error: {str(e)}")


class Yoyo:
    """YOYO Cloud AI Model API Client (Synchronous)."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.yoyo.ai/v1",
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


class AsyncChatCompletions:
    def __init__(self, client: "AsyncYoyo"):
        self.client = client
        self._sync_completions = ChatCompletions(client)  # type: ignore

    async def create(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        top_p: float = 0.9,
        max_tokens: int = 2048,
        stream: bool = False,
        stop: Optional[Any] = None,
        **kwargs: Any,
    ) -> Any:
        loop = asyncio.get_event_loop()
        if not stream:
            return await loop.run_in_executor(
                None,
                lambda: self._sync_completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    top_p=top_p,
                    max_tokens=max_tokens,
                    stream=False,
                    stop=stop,
                    **kwargs,
                ),
            )
        else:
            return self._async_stream_generator(
                model=model,
                messages=messages,
                temperature=temperature,
                top_p=top_p,
                max_tokens=max_tokens,
                stop=stop,
                **kwargs,
            )

    async def _async_stream_generator(self, **kwargs: Any) -> AsyncGenerator[Dict[str, Any], None]:
        loop = asyncio.get_event_loop()
        sync_gen = self._sync_completions.create(stream=True, **kwargs)

        def get_next():
            try:
                return next(sync_gen), False
            except StopIteration:
                return None, True

        while True:
            item, done = await loop.run_in_executor(None, get_next)
            if done:
                break
            yield item


class AsyncChat:
    def __init__(self, client: "AsyncYoyo"):
        self.completions = AsyncChatCompletions(client)

    async def create(self, *args: Any, **kwargs: Any) -> Any:
        """Shortcut for await client.chat.completions.create(...)."""
        return await self.completions.create(*args, **kwargs)


class AsyncYoyo:
    """YOYO Cloud AI Model API Client (Asynchronous)."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.yoyo.ai/v1",
        timeout: int = 60,
    ):
        if not api_key:
            raise ValueError("api_key must be provided (format: sk_live_...)")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.chat = AsyncChat(self)
        self.models = Models(self)  # type: ignore
        self.embeddings = Embeddings(self)  # type: ignore
