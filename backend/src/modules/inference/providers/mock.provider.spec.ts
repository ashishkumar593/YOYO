import { MockProvider } from './mock.provider';
import { ChatCompletionRequest, ChatCompletionChunk } from '../../../common/types/openai.types';

describe('MockProvider', () => {
  let provider: MockProvider;

  beforeEach(() => {
    provider = new MockProvider();
  });

  it('should generate a valid non-streaming chat completion with usage metrics', async () => {
    const request: ChatCompletionRequest = {
      model: 'llama3.3:8b',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const response = await provider.chatCompletion('http://localhost:11434', request);

    expect(response.id).toMatch(/^chatcmpl-/);
    expect(response.object).toBe('chat.completion');
    expect(response.choices).toHaveLength(1);
    expect(response.choices[0].finish_reason).toBe('stop');
    expect(response.choices[0].message.content).toContain('[YOYO AI Mock Response from llama3.3:8b]');
    expect(response.usage.prompt_tokens).toBeGreaterThan(0);
    expect(response.usage.completion_tokens).toBeGreaterThan(0);
    expect(response.usage.total_tokens).toBe(
      response.usage.prompt_tokens + response.usage.completion_tokens
    );
  });

  it('should stream chunks sequentially and emit finish chunk with usage', async () => {
    const request: ChatCompletionRequest = {
      model: 'llama3.3:8b',
      messages: [{ role: 'user', content: 'Stream test' }],
      stream: true,
    };

    const chunks: ChatCompletionChunk[] = [];
    for await (const chunk of provider.chatCompletionStream('http://localhost:11434', request)) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(5);
    const lastChunk = chunks[chunks.length - 1];
    expect(lastChunk.choices[0].finish_reason).toBe('stop');
    expect(lastChunk.usage).toBeDefined();
    expect(lastChunk.usage?.total_tokens).toBeGreaterThan(0);
  });

  it('should generate embeddings with expected dimensions', async () => {
    const response = await provider.embeddings('http://localhost:11434', {
      model: 'nomic-embed-text:latest',
      input: ['Text 1', 'Text 2'],
    });

    expect(response.object).toBe('list');
    expect(response.data).toHaveLength(2);
    expect(response.data[0].embedding).toHaveLength(768);
    expect(response.data[1].embedding).toHaveLength(768);
  });
});
