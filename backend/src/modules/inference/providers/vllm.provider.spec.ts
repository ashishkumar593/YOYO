import { VllmProvider } from './vllm.provider';

describe('VllmProvider', () => {
  let provider: VllmProvider;
  const originalFetch = global.fetch;

  beforeEach(() => {
    provider = new VllmProvider();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('chatCompletion', () => {
    it('should send formatted request to vLLM worker and return response', async () => {
      const mockResponse = {
        id: 'chatcmpl-vllm-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'llama-3.3-70b',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'vLLM response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const res = await provider.chatCompletion('http://vllm-worker:8000', {
        model: 'llama-3.3-70b',
        messages: [{ role: 'user', content: 'test prompt' }],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://vllm-worker:8000/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            model: 'llama-3.3-70b',
            messages: [{ role: 'user', content: 'test prompt' }],
            stream: false,
          }),
        })
      );
      expect(res.id).toBe('chatcmpl-vllm-123');
      expect(res.choices[0].message.content).toBe('vLLM response');
    });

    it('should throw error when worker response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: jest.fn().mockResolvedValue('Worker GPU Out of Memory'),
      });

      await expect(
        provider.chatCompletion('http://vllm-worker:8000', {
          model: 'llama-3.3-70b',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toThrow('vLLM worker responded with status 503');
    });
  });

  describe('checkHealth', () => {
    it('should return isHealthy: true and model list on 200 from /health', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/health')) {
          return Promise.resolve({ ok: true });
        }
        if (url.includes('/v1/models')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [{ id: 'llama-3.3-70b' }] }),
          });
        }
        return Promise.reject(new Error('Unknown url'));
      });

      const health = await provider.checkHealth('http://vllm-worker:8000');

      expect(health.isHealthy).toBe(true);
      expect(health.engine).toBe('VLLM');
      expect(health.activeModels).toContain('llama-3.3-70b');
    });

    it('should report isHealthy: false when worker is unreachable', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const health = await provider.checkHealth('http://unreachable-worker:8000');

      expect(health.isHealthy).toBe(false);
      expect(health.engine).toBe('VLLM');
    });
  });

  describe('embeddings', () => {
    it('should request embeddings from /v1/embeddings', async () => {
      const mockEmbedRes = {
        object: 'list',
        data: [{ object: 'embedding', index: 0, embedding: [0.1, 0.2, 0.3] }],
        model: 'nomic-embed-text',
        usage: { prompt_tokens: 5, total_tokens: 5 },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockEmbedRes),
      });

      const res = await provider.embeddings('http://vllm-worker:8000', {
        model: 'nomic-embed-text',
        input: 'hello embeddings',
      });

      expect(res.data[0].embedding).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('pullModel', () => {
    it('should yield pre-warmed status for vLLM persistent weights', async () => {
      const progress: any[] = [];
      for await (const p of provider.pullModel('http://vllm-worker:8000', 'llama-3.3-70b')) {
        progress.push(p);
      }
      expect(progress.length).toBe(1);
      expect(progress[0].percent).toBe(100);
    });
  });
});
