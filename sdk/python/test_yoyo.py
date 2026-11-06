import unittest
from yoyo import (
    Yoyo,
    AsyncYoyo,
    YoyoError,
    YoyoAuthenticationError,
    YoyoRateLimitError,
    YoyoNotFoundError,
)


class TestYoyoSDK(unittest.TestCase):
    def test_sync_client_initialization(self):
        client = Yoyo(
            api_key="sk_live_test_12345",
            base_url="https://api.yoyo.ai/v1",
            timeout=45,
        )
        self.assertEqual(client.api_key, "sk_live_test_12345")
        self.assertEqual(client.base_url, "https://api.yoyo.ai/v1")
        self.assertEqual(client.timeout, 45)
        self.assertTrue(callable(client.chat.create))
        self.assertTrue(callable(client.chat.completions.create))
        self.assertTrue(callable(client.models.list))
        self.assertTrue(callable(client.embeddings.create))
        self.assertTrue(callable(client.rerank))
        self.assertTrue(callable(client.rerank.create))
        self.assertTrue(callable(client.files.create))
        self.assertTrue(callable(client.files.list))
        self.assertTrue(callable(client.batches.create))
        self.assertTrue(callable(client.batches.list))

    def test_missing_api_key_raises(self):
        import os
        old = os.environ.pop("YOYO_API_KEY", None)
        try:
            with self.assertRaises(ValueError):
                Yoyo(api_key="")
        finally:
            if old is not None:
                os.environ["YOYO_API_KEY"] = old

    def test_env_var_api_key(self):
        import os
        old = os.environ.get("YOYO_API_KEY")
        os.environ["YOYO_API_KEY"] = "sk_live_from_env_var"
        try:
            client = Yoyo()
            self.assertEqual(client.api_key, "sk_live_from_env_var")
        finally:
            if old is not None:
                os.environ["YOYO_API_KEY"] = old
            else:
                os.environ.pop("YOYO_API_KEY", None)

    def test_async_client_initialization(self):
        client = AsyncYoyo(
            api_key="sk_live_async_12345",
            base_url="https://api.yoyo.ai/v1",
        )
        self.assertEqual(client.api_key, "sk_live_async_12345")
        self.assertTrue(callable(client.chat.create))
        self.assertTrue(callable(client.chat.completions.create))

    def test_error_hierarchy(self):
        self.assertTrue(issubclass(YoyoAuthenticationError, YoyoError))
        self.assertTrue(issubclass(YoyoRateLimitError, YoyoError))
        self.assertTrue(issubclass(YoyoNotFoundError, YoyoError))

    def test_trailing_slash_stripped(self):
        client = Yoyo(api_key="sk_live_test", base_url="https://api.yoyo.ai/v1/")
        self.assertEqual(client.base_url, "https://api.yoyo.ai/v1")

    def test_tool_calling_parameters_signature(self):
        import inspect
        sig = inspect.signature(Yoyo.create if hasattr(Yoyo, 'create') else Yoyo(api_key="sk_live_test").chat.completions.create)
        self.assertIn("tools", sig.parameters)
        self.assertIn("tool_choice", sig.parameters)
        self.assertIn("response_format", sig.parameters)
        self.assertIn("presence_penalty", sig.parameters)
        self.assertIn("frequency_penalty", sig.parameters)
        self.assertIn("seed", sig.parameters)


if __name__ == "__main__":
    unittest.main()

