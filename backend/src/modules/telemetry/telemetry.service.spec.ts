import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryService } from './telemetry.service';
import { PrismaService } from '../../database/prisma.service';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      userQuota: {
        findUnique: jest.fn(),
      },
      apiRequest: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      model: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      modelWorker: {
        count: jest.fn(),
      },
      modelDeployment: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserUsageSummary', () => {
    it('should aggregate token and invocation metrics for user', async () => {
      prisma.userQuota.findUnique.mockResolvedValue({
        monthlyTokenLimit: BigInt(10000000),
        currentMonthTokensUsed: BigInt(450000),
        monthlyRequestLimit: 20000,
        currentMonthRequestsUsed: 85,
        resetsAt: new Date(),
      });

      prisma.apiRequest.count
        .mockResolvedValueOnce(85) // totalRequests
        .mockResolvedValueOnce(12); // requestsToday

      prisma.apiRequest.groupBy.mockResolvedValue([
        {
          modelId: 'mod_1',
          _sum: { totalTokens: 300000, promptTokens: 100000, completionTokens: 200000 },
          _count: { id: 50 },
        },
      ]);

      prisma.model.findMany.mockResolvedValue([
        { id: 'mod_1', apiIdentifier: 'llama-3.3-70b', name: 'Llama 3.3 70B' },
      ]);

      const summary = await service.getUserUsageSummary('usr_1');

      expect(summary.totalRequests).toBe(85);
      expect(summary.requestsToday).toBe(12);
      expect(summary.quota?.monthlyTokenLimit).toBe(10000000);
      expect(summary.modelUsage.length).toBe(1);
      expect(summary.modelUsage[0].apiIdentifier).toBe('llama-3.3-70b');
    });
  });

  describe('getRecentRequests', () => {
    it('should return formatted request log items with calculated cost and ttft', async () => {
      prisma.apiRequest.findMany.mockResolvedValue([
        {
          id: 'req_123',
          endpoint: '/v1/chat/completions',
          statusCode: 200,
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
          latencyMs: 120,
          ttftMs: 25,
          ipAddress: '192.168.1.1',
          errorCode: null,
          createdAt: new Date(),
          model: {
            apiIdentifier: 'llama-3.3-70b',
            name: 'Llama 3.3 70B',
          },
          apiKey: {
            name: 'Production Key',
            maskedKey: 'sk_live_...9f2a',
          },
          usageRecord: {
            computeCostUsd: 0.0004,
          },
        },
      ]);

      const requests = await service.getRecentRequests('usr_1', 10);

      expect(requests.length).toBe(1);
      expect(requests[0].id).toBe('req_123');
      expect(requests[0].modelIdentifier).toBe('llama-3.3-70b');
      expect(requests[0].ttftMs).toBe(25);
      expect(requests[0].costUsd).toBe(0.0004);
    });

    it('should correctly apply status filters', async () => {
      prisma.apiRequest.findMany.mockResolvedValue([]);

      await service.getRecentRequests('usr_1', 20, '4xx');

      expect(prisma.apiRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'usr_1',
            statusCode: { gte: 400, lt: 500 },
          }),
        })
      );
    });
  });

  describe('getPublicSystemStatus', () => {
    it('should report OPERATIONAL when online workers exist', async () => {
      prisma.modelWorker.count
        .mockResolvedValueOnce(4) // total
        .mockResolvedValueOnce(4); // online
      prisma.model.count.mockResolvedValue(6);
      prisma.modelDeployment.count.mockResolvedValue(6);

      const status = await service.getPublicSystemStatus();

      expect(status.status).toBe('OPERATIONAL');
      expect(status.cluster.gpuHardware).toContain('H100 SXM5');
      expect(status.cluster.onlineNodes).toBe(4);
    });

    it('should report DEGRADED when 0 online workers are registered', async () => {
      prisma.modelWorker.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.model.count.mockResolvedValue(5);
      prisma.modelDeployment.count.mockResolvedValue(0);

      const status = await service.getPublicSystemStatus();

      expect(status.status).toBe('DEGRADED');
    });
  });
});
