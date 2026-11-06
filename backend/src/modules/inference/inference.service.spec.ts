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
});

