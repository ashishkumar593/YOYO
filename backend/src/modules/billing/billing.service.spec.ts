import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('BillingService', () => {
  let service: BillingService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      creditBalance: {
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => ({
          userId: data.userId,
          balanceUsd: data.balanceUsd,
          currency: 'USD',
          autoRecharge: false,
          updatedAt: new Date(),
        })),
        upsert: jest.fn().mockResolvedValue({ balanceUsd: 35.0 }),
      },
      modelPricing: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      model: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'm1',
            apiIdentifier: 'llama-3.3-70b',
            name: 'Meta Llama 3.3 70B',
            category: 'GENERAL',
            defaultContextWindow: 131072,
          },
        ]),
      },
      billingTransaction: {
        create: jest.fn().mockResolvedValue({ id: 'tx_1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(prismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('getBalance', () => {
    it('should return existing credit balance if found', async () => {
      prismaService.creditBalance.findUnique.mockResolvedValue({
        balanceUsd: 42.5,
        currency: 'USD',
        autoRecharge: true,
        updatedAt: new Date(),
      });

      const res = await service.getBalance('user_1');
      expect(res.balanceUsd).toBe(42.5);
      expect(res.autoRecharge).toBe(true);
    });

    it('should provision complimentary $10 starter balance for new accounts', async () => {
      prismaService.creditBalance.findUnique.mockResolvedValue(null);

      const res = await service.getBalance('user_new');
      expect(res.balanceUsd).toBe(10.0);
      expect(prismaService.creditBalance.create).toHaveBeenCalled();
    });
  });

  describe('createTopup', () => {
    it('should reject amounts below minimum $5 threshold', async () => {
      await expect(service.createTopup('user_1', 2)).rejects.toThrow(BadRequestException);
    });

    it('should reject amounts exceeding maximum $1000 limit', async () => {
      await expect(service.createTopup('user_1', 1500)).rejects.toThrow(BadRequestException);
    });

    it('should credit balance and create transaction record', async () => {
      const res = await service.createTopup('user_1', 50);
      expect(res.success).toBe(true);
      expect(res.amountUsd).toBe(50);
      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('getPricing', () => {
    it('should return model pricing schedule', async () => {
      const pricing = await service.getPricing();
      expect(pricing.length).toBeGreaterThan(0);
      expect(pricing[0].modelIdentifier).toBe('llama-3.3-70b');
    });
  });
});

