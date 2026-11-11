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
    const parsed = JSON.parse(res.choices[0].message.content!);
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
});

