import * as crypto from 'crypto';

export interface GeneratedApiKey {
  plaintextKey: string;
  keyPrefix: string;
  keyHash: string;
  maskedKey: string;
}

const API_KEY_PREFIX = 'sk_live_';

export function generateApiKey(): GeneratedApiKey {
  const entropy = crypto.randomBytes(24).toString('base64url');
  const prefixPart = entropy.slice(0, 8);
  const secretPart = entropy.slice(8);
  const plaintextKey = `${API_KEY_PREFIX}${prefixPart}_${secretPart}`;

  const keyHash = hashApiKey(plaintextKey);
  const maskedKey = `${API_KEY_PREFIX}${prefixPart}...${secretPart.slice(-4)}`;

  return {
    plaintextKey,
    keyPrefix: `${API_KEY_PREFIX}${prefixPart}`,
    keyHash,
    maskedKey,
  };
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex');
}

export function extractKeyPrefix(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed.startsWith(API_KEY_PREFIX)) return null;
  return trimmed.slice(0, API_KEY_PREFIX.length + 8);
}

