import {
  estimateTokens,
  estimateMessagesTokens,
} from './token-estimator';
import { ChatMessage } from '../types/openai.types';

describe('TokenEstimator', () => {
  it('should return 0 for empty strings', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('should estimate token counts with appropriate safety buffer', () => {
    const text = 'Hello world, this is a test prompt for token estimation.';
    const tokens = estimateTokens(text);

    // 56 characters / 4 = 14 tokens * 1.15 buffer = ~17 tokens
    expect(tokens).toBeGreaterThan(10);
    expect(tokens).toBeLessThan(25);
  });

  it('should calculate conversation envelope tokens including overhead', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Explain quantum computing in simple terms.' },
    ];

    const totalTokens = estimateMessagesTokens(messages);

    // Messages overhead: 2 messages * 4 = 8 + priming 3 = 11 + content tokens (~18) = ~29 tokens
    expect(totalTokens).toBeGreaterThan(20);
    expect(totalTokens).toBeLessThan(45);
  });

  it('should accurately calculate multi-modal vision tokens with image_url parts', () => {
    const visionMessages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is inside this architectural diagram?' },
          {
            type: 'image_url',
            image_url: {
              url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              detail: 'auto',
            },
          },
        ],
      },
    ];

    const visionTokens = estimateMessagesTokens(visionMessages);
    // 500 vision tokens + text tokens + envelope overhead > 510
    expect(visionTokens).toBeGreaterThan(500);
    expect(visionTokens).toBeLessThan(550);
  });
});

