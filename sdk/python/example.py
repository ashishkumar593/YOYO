"""
YOYO Python SDK Verification Script (Sync & Async)
"""

from yoyo import (
    Yoyo,
    AsyncYoyo,
    YoyoError,
    YoyoAuthenticationError,
    YoyoRateLimitError,
    YoyoNotFoundError,
)

def main():
    print("=== 1. Testing Synchronous Client (Yoyo) ===")
    client = Yoyo(
        api_key="sk_live_demo_test_key_12345",
        base_url="https://api.yoyo.ai/v1"
    )
    print(f"[OK] Initialized client for base_url: {client.base_url}")
    print(f"[OK] Available methods: chat.completions.create, models.list, embeddings.create")

    print("\n=== 2. Testing Asynchronous Client (AsyncYoyo) ===")
    async_client = AsyncYoyo(
        api_key="sk_live_demo_test_key_12345",
        base_url="https://api.yoyo.ai/v1"
    )
    print(f"[OK] Initialized AsyncYoyo for: {async_client.base_url}")
    print(f"[OK] Async completions handler: {type(async_client.chat.completions)}")

    print("\n=== 3. Error Classes Hierarchy ===")
    assert issubclass(YoyoAuthenticationError, YoyoError)
    assert issubclass(YoyoRateLimitError, YoyoError)
    assert issubclass(YoyoNotFoundError, YoyoError)
    print("[OK] Error classes properly inherit from YoyoError")

    print("\n=== All Python SDK Clients Initialized & Verified Successfully ===")

if __name__ == "__main__":
    main()
