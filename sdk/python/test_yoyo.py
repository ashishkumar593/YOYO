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

    def test_missing_api_key_raises(self):
        with self.assertRaises(ValueError):
            Yoyo(api_key="")

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


if __name__ == "__main__":
    unittest.main()

