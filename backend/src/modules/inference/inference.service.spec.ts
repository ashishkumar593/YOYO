import { Test, TestingModule } from '@nestjs/testing';
import { InferenceService } from './inference.service';
import { ModelsService } from '../models/models.service';
import { OllamaProvider } from './providers/ollama.provider';
import { VllmProvider } from './providers/vllm.provider';
import { MockProvider } from './providers/mock.provider';
import { PrismaService } from '../../database/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('InferenceService', () => {
  let service: InferenceService;
  let prismaService: any;
  let modelsService: any;

  beforeEach(async () => {
    prismaService = {
      model: {
        findUnique: jest.fn(),
      },
      modelWorker: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      apiRequest: {
        create: jest.fn().mockResolvedValue({ id: 'req_123' }),
      },
      userQuota: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      creditBalance: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      modelPricing: {
        findFirst: jest.fn().mockResolvedValue({
          inputCostPerMillion: 0.20,
          outputCostPerMillion: 0.40,
        }),
      },
      modelAdapter: {
        findUnique: jest.fn(),
      },
    };

    modelsService = {
      findActiveWorkerForModel: jest.fn(),
      findActiveWorkersForModel: jest.fn().mockResolvedValue([]),
      incrementConcurrency: jest.fn().mockResolvedValue(undefined),
      decrementConcurrency: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InferenceService,
        MockProvider,
        OllamaProvider,
        VllmProvider,
        { provide: PrismaService, useValue: prismaService },
        { provide: ModelsService, useValue: modelsService },
      ],
    }).compile();

    service = module.get<InferenceService>(InferenceService);
  });

  it('should block model execution if API key restricts to another model', async () => {
    await expect(
      service.chatCompletion(
        {
          model: 'qwen2.5-coder:7b',
          messages: [{ role: 'user', content: 'test' }],
        },
        { id: 'user_1' },
        { keyId: 'key_1', allowedModels: ['llama3.3:8b'] } // Restricted
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException if model does not exist in registry', async () => {
    prismaService.model.findUnique.mockResolvedValue(null);

    await expect(
      service.chatCompletion(
        {
          model: 'non-existent-model',
          messages: [{ role: 'user', content: 'test' }],
        },
        { id: 'user_1' },
        { keyId: 'key_1', allowedModels: ['*'] }
      )
    ).rejects.toThrow(NotFoundException);
  });

  it('should execute completion when model is active and allowed', async () => {
    process.env.FEATURE_MOCK_INFERENCE = 'true';

    prismaService.model.findUnique.mockResolvedValue({
      id: 'm_123',
      apiIdentifier: 'llama3.3:8b',
      isActive: true,
      defaultContextWindow: 8192,
    });

    const result = await service.chatCompletion(
      {
        model: 'llama3.3:8b',
        messages: [{ role: 'user', content: 'test' }],
      },
      { id: 'user_1' },
      { keyId: 'key_1', allowedModels: ['*'] }
    );

    expect(result).toBeDefined();
    expect(result.choices[0].message.content).toContain('YOYO AI Mock Response');
  });

  it('should rerank documents successfully in descending order of relevance', async () => {
    const res = await service.rerank({
      model: 'bge-reranker-large',
      query: 'deep learning transformers',
      documents: [
        'A recipe for sourdough bread.',
        'Attention is All You Need introduced the Transformer deep learning architecture.',
        'The weather forecast for Seattle tomorrow is cloudy.',
      ],
      top_n: 2,
      return_documents: true,
    });

    expect(res).toBeDefined();
    expect(res.results.length).toBe(2);
    expect(res.results[0].relevance_score).toBeGreaterThanOrEqual(res.results[1].relevance_score);
    expect(res.results[0].document?.text).toContain('Transformer');
  });

  it('should format tool calls properly when tools parameter is provided in mock mode', async () => {
    process.env.FEATURE_MOCK_INFERENCE = 'true';
    prismaService.model.findUnique.mockResolvedValue({
      id: 'm_123',
      apiIdentifier: 'llama3.3:8b',
      isActive: true,
      defaultContextWindow: 8192,
    });

    const res = await service.chatCompletion(
      {
        model: 'llama3.3:8b',
        messages: [{ role: 'user', content: 'What is the weather in SF?' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_current_weather',
              description: 'Get current weather',
              parameters: { type: 'object', properties: { location: { type: 'string' } } },
            },
          },
        ],
      },
      { id: 'user_1' },
      { keyId: 'key_1', allowedModels: ['*'] }
    );

    expect(res.choices[0].finish_reason).toBe('tool_calls');
    expect(res.choices[0].message.tool_calls).toBeDefined();
    expect(res.choices[0].message.tool_calls![0].function.name).toBe('get_current_weather');
  });

  it('should return valid JSON when json_schema response_format is provided in mock mode', async () => {
    process.env.FEATURE_MOCK_INFERENCE = 'true';
    prismaService.model.findUnique.mockResolvedValue({
      id: 'm_123',
      apiIdentifier: 'llama3.3:8b',
      isActive: true,
      defaultContextWindow: 8192,
    });

    const res = await service.chatCompletion(
      {
        model: 'llama3.3:8b',
        messages: [{ role: 'user', content: 'Extract data' }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'UserExtraction',
            strict: true,
            schema: { type: 'object', properties: { name: { type: 'string' } } },
          },
        },
      },
      { id: 'user_1' },
      { keyId: 'key_1', allowedModels: ['*'] }
    );

    expect(res.choices[0].finish_reason).toBe('stop');
    const parsed = JSON.parse(res.choices[0].message.content as string);
    expect(parsed.schema_name).toBe('UserExtraction');
    expect(parsed.status).toBe('success');
  });

  it('should probe worker nodes and update status during checkAllWorkersHealth', async () => {
    prismaService.modelWorker.findMany.mockResolvedValue([
      {
        id: 'w-1',
        workerName: 'vllm-primary',
        endpointUrl: 'http://localhost:8000',
        engineType: 'VLLM',
        status: 'OFFLINE',
      },
    ]);

    // Mock VllmProvider checkHealth
    const vllm = (service as any).vllmProvider;
    jest.spyOn(vllm, 'checkHealth').mockResolvedValue({
      isHealthy: true,
      engine: 'VLLM',
      latencyMs: 15,
      activeModels: ['llama-3.3-70b'],
    });

    const result = await service.checkAllWorkersHealth();
    expect(result.online).toBe(1);
    expect(result.offline).toBe(0);
    expect(prismaService.modelWorker.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'w-1' },
        data: expect.objectContaining({ status: 'ONLINE' }),
      })
    );
  });

  it('should automatically route to fallback model when primary model workers fail', async () => {
    delete process.env.FEATURE_MOCK_INFERENCE;

    // Primary model: llama-3.3-70b
    // Fallback model: llama3.3:8b
    prismaService.model.findUnique.mockImplementation(({ where }: any) => {
      if (where.apiIdentifier === 'llama-3.3-70b') {
        return Promise.resolve({
          id: 'm_70b',
          apiIdentifier: 'llama-3.3-70b',
          isActive: true,
          defaultContextWindow: 131072,
          fallbackModelIds: ['llama3.3:8b'],
        });
      }
      if (where.apiIdentifier === 'llama3.3:8b') {
        return Promise.resolve({
          id: 'm_8b',
          apiIdentifier: 'llama3.3:8b',
          isActive: true,
          defaultContextWindow: 8192,
        });
      }
      return Promise.resolve(null);
    });

    const failingWorker = {
      id: 'deploy_fail',
      worker: {
        workerName: 'gpu-node-failing',
        endpointUrl: 'http://localhost:9999',
        engineType: 'OLLAMA',
      },
    };

    const healthyWorker = {
      id: 'deploy_healthy',
      worker: {
        workerName: 'gpu-node-healthy',
        endpointUrl: 'http://localhost:11434',
        engineType: 'OLLAMA',
      },
    };

    modelsService.findActiveWorkersForModel.mockImplementation((modelName: string) => {
      if (modelName === 'llama-3.3-70b') {
        return Promise.resolve([failingWorker]);
      }
      if (modelName === 'llama3.3:8b') {
        return Promise.resolve([healthyWorker]);
      }
      return Promise.resolve([]);
    });

    const ollama = (service as any).ollamaProvider;
    jest.spyOn(ollama, 'chatCompletion').mockImplementation((endpoint: string, req: any) => {
      if (endpoint === 'http://localhost:9999') {
        return Promise.reject(new Error('CUDA Out of Memory (OOM) 503'));
      }
      return Promise.resolve({
        id: 'chatcmpl-fallback',
        object: 'chat.completion',
        created: Date.now(),
        model: req.model,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Fallback response from 8B model' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      });
    });

    const result = await service.chatCompletion(
      {
        model: 'llama-3.3-70b',
        messages: [{ role: 'user', content: 'Complex analysis' }],
      },
      { id: 'user_1' },
      { keyId: 'key_1', allowedModels: ['*'] }
    );

    expect(result).toBeDefined();
    expect(result.choices[0].message.content).toBe('Fallback response from 8B model');
    expect((result as any)._fallbackInfo).toBeDefined();
    expect((result as any)._fallbackInfo.fallbackTriggered).toBe(true);
    expect((result as any)._fallbackInfo.originalModel).toBe('llama-3.3-70b');
    expect((result as any)._fallbackInfo.servedModel).toBe('llama3.3:8b');
  });

  it('should apply 50% discount for cached prompt tokens during telemetry recording', async () => {
    prismaService.model.findUnique.mockResolvedValue({
      id: 'model_uuid_1',
      apiIdentifier: 'llama3.3:8b',
      defaultContextWindow: 8192,
      isActive: true,
    });

    modelsService.findActiveWorkersForModel.mockResolvedValue([
      {
        id: 'dep_1',
        worker: {
          workerName: 'test-vllm-node',
          endpointUrl: 'http://localhost:8000',
          engineType: 'VLLM',
        },
      },
    ]);

    const vllm = (service as any).vllmProvider;
    jest.spyOn(vllm, 'chatCompletion').mockResolvedValue({
      id: 'chatcmpl-cached-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'llama3.3:8b',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Cached result' }, finish_reason: 'stop' }],
      usage: {
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500,
        prompt_tokens_details: {
          cached_tokens: 600, // 600 cached tokens (50% off)
        },
      },
    });

    const res = await service.chatCompletion(
      { model: 'llama3.3:8b', messages: [{ role: 'user', content: 'test prompt' }] },
      { id: 'user_cached_1' },
      { keyId: 'key_1', allowedModels: ['*'] }
    );

    expect(res).toBeDefined();
    expect(res.choices[0].message.content).toBe('Cached result');

    // Allow asynchronous telemetry promise queue to settle
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Expected pricing:
    // Uncached: 400 * 0.20 / 1M = 0.000080
    // Cached (50% off): 600 * 0.10 / 1M = 0.000060
    // Completion: 500 * 0.40 / 1M = 0.000200
    // Total cost = 0.000340
    expect(prismaService.apiRequest.create).toHaveBeenCalled();
    const createCallArg = prismaService.apiRequest.create.mock.calls[0][0];
    expect(createCallArg.data.usageRecord.create.computeCostUsd).toBe(0.00034);
    expect(prismaService.creditBalance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_cached_1' },
        data: { balanceUsd: { decrement: 0.00034 } },
      })
    );
  });

  it('should route custom LoRA adapter to base model GPU workers without failure', async () => {
    // Model findUnique returns null for adapter identifier
    prismaService.model.findUnique.mockResolvedValueOnce(null);

    // modelAdapter findUnique returns active adapter linked to base llama3.3:8b
    prismaService.modelAdapter.findUnique.mockResolvedValueOnce({
      id: 'adapter_1',
      apiIdentifier: 'llama3.3:8b:legal-v1',
      name: 'Legal LoRA',
      adapterPath: 'yoyo/legal-v1',
      isActive: true,
      baseModel: {
        id: 'base_uuid_1',
        apiIdentifier: 'llama3.3:8b',
        name: 'Meta Llama 3.3 8B',
        defaultContextWindow: 8192,
        isActive: true,
      },
    });

    modelsService.findActiveWorkersForModel.mockResolvedValueOnce([
      {
        id: 'dep_lora',
        worker: {
          workerName: 'gpu-lora-worker',
          endpointUrl: 'http://localhost:8000',
          engineType: 'VLLM',
        },
      },
    ]);

    const vllm = (service as any).vllmProvider;
    jest.spyOn(vllm, 'chatCompletion').mockResolvedValueOnce({
      id: 'chatcmpl-lora',
      object: 'chat.completion',
      created: Date.now(),
      model: 'llama3.3:8b:legal-v1',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Legal advice completed' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 20, completion_tokens: 20, total_tokens: 40 },
    });

    const res = await service.chatCompletion(
      { model: 'llama3.3:8b:legal-v1', messages: [{ role: 'user', content: 'draft clause' }] },
      { id: 'user_1' },
      { keyId: 'key_1', allowedModels: ['*'] }
    );

    expect(res).toBeDefined();
    expect(res.choices[0].message.content).toBe('Legal advice completed');
    expect(modelsService.findActiveWorkersForModel).toHaveBeenCalledWith('llama3.3:8b');
  });
});

