import {
  generateApiKey,
  hashApiKey,
  extractKeyPrefix,
} from './api-key.util';

describe('ApiKeyUtil', () => {
  it('should generate a properly formatted API key', () => {
    const keyData = generateApiKey();

    expect(keyData.plaintextKey).toMatch(/^sk_live_[a-zA-Z0-9_-]{8}_[a-zA-Z0-9_-]{24}$/);
    expect(keyData.keyPrefix).toMatch(/^sk_live_[a-zA-Z0-9_-]{8}$/);
    expect(keyData.keyHash).toHaveLength(64); // SHA-256 hex digest length
    expect(keyData.maskedKey).toMatch(/^sk_live_[a-zA-Z0-9_-]{8}\.\.\.[a-zA-Z0-9_-]{4}$/);
  });

  it('should produce identical SHA-256 hashes for the same key string', () => {
    const key = 'sk_live_testprefix_randomsecretbytes123456';
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should accurately extract key prefixes for O(1) database lookup', () => {
    const key = 'sk_live_a7f9c2d1_9KxL2pQ8mRt5vW1yZ3bN7cV4';
    const prefix = extractKeyPrefix(key);

    expect(prefix).toBe('sk_live_a7f9c2d1');
  });

  it('should return null for invalid key formats', () => {
    expect(extractKeyPrefix('invalid_key_prefix_1234')).toBeNull();
    expect(extractKeyPrefix('')).toBeNull();
  });
});

