import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeService } from './knowledge.service';
import { InferenceService } from '../inference/inference.service';

describe('KnowledgeService (RAG Pipeline)', () => {
  let service: KnowledgeService;
  let mockInferenceService: any;

  beforeEach(async () => {
    mockInferenceService = {
      embeddings: jest.fn().mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3, 0.4] }],
      }),
      chatCompletion: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Continuous batching improves throughput by up to 4x according to [Source 1].',
            },
          },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        {
          provide: InferenceService,
          useValue: mockInferenceService,
        },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should compute exact cosine similarity for identical vectors', () => {
    const v1 = [1, 2, 3];
    const v2 = [1, 2, 3];
    const sim = service.cosineSimilarity(v1, v2);
    expect(sim).toBeCloseTo(1.0, 5);
  });

  it('should compute zero cosine similarity for orthogonal vectors', () => {
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];
    const sim = service.cosineSimilarity(v1, v2);
    expect(sim).toBeCloseTo(0.0, 5);
  });

  it('should index and list documents cleanly', async () => {
    const doc = await service.addDocument(
      'Test Architecture Doc',
      'This is paragraph 1 about vLLM.\n\nThis is paragraph 2 about PagedAttention and prompt caching.',
      'Architecture'
    );

    expect(doc).toBeDefined();
    expect(doc.title).toBe('Test Architecture Doc');
    expect(doc.chunkCount).toBeGreaterThanOrEqual(1);

    const docs = service.listDocuments();
    expect(docs.some((d) => d.id === doc.id)).toBe(true);
  });

  it('should perform grounded RAG query and cite sources', async () => {
    await service.addDocument(
      'Continuous Batching Whitepaper',
      'Continuous batching reduces latency by 60% compared to static batching.',
      'Whitepaper'
    );

    const result = await service.queryKnowledge('How does continuous batching affect latency?');

    expect(result).toBeDefined();
    expect(result.answer).toContain('Continuous batching');
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0].docTitle).toBeDefined();
  });

  it('should delete a document and purge its vector chunks', async () => {
    const doc = await service.addDocument('Temporary Doc', 'Content to delete');
    expect(service.listDocuments().some((d) => d.id === doc.id)).toBe(true);

    const deleted = service.deleteDocument(doc.id);
    expect(deleted).toBe(true);
    expect(service.listDocuments().some((d) => d.id === doc.id)).toBe(false);
  });
});
