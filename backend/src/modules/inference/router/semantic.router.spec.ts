import { SemanticRouter } from './semantic.router';
import { ChatMessage } from '../../../common/types/openai.types';

describe('SemanticRouter', () => {
  it('should route image/vision queries to vision model', () => {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe what you see in this chart' },
          { type: 'image_url', image_url: { url: 'https://example.com/chart.png' } },
        ],
      },
    ];
    const model = SemanticRouter.classifyQuery(messages, 'auto');
    expect(model).toBe('moondream');
  });

  it('should route code-heavy queries to coding model', () => {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: '```typescript\nexport async function computeHash(data: string) { return sha256(data); }\n```\nOptimize this function for high throughput.',
      },
    ];
    const model = SemanticRouter.classifyQuery(messages, 'auto');
    expect(model).toBe('qwen-2.5-coder-32b');
  });

  it('should route complex mathematical reasoning queries to deep reasoning model', () => {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: 'Please derive step by step the mathematical proof for Bellman optimality in reinforcement learning.',
      },
    ];
    const model = SemanticRouter.classifyQuery(messages, 'auto');
    expect(model).toBe('deepseek-r1-70b');
  });

  it('should route auto:fast and auto:cost-optimized to lightweight model', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'What is the capital of France?' },
    ];
    expect(SemanticRouter.classifyQuery(messages, 'auto:fast')).toBe('llama-3.3-8b');
    expect(SemanticRouter.classifyQuery(messages, 'auto:cost-optimized')).toBe('llama-3.3-8b');
  });

  it('should route auto:reasoning to deep reasoning model', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Simple question' },
    ];
    expect(SemanticRouter.classifyQuery(messages, 'auto:reasoning')).toBe('deepseek-r1-70b');
  });
});
