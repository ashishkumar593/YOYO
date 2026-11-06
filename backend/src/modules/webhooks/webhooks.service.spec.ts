import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      webhookEndpoint: {
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'wh_123',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'wh_123',
            url: 'https://webhook.site/test',
            secret: 'whsec_abcdef1234567890abcdef1234567890',
            description: 'My Slack webhook',
            events: ['*'],
            status: 'ACTIVE',
            createdAt: new Date(),
            _count: { deliveries: 3 },
          },
        ]),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'wh_123') {
            return Promise.resolve({
              id: 'wh_123',
              userId: 'user_1',
              url: 'https://webhook.site/test',
              secret: 'whsec_abcdef1234567890abcdef1234567890',
              events: ['*'],
              status: 'ACTIVE',
              deliveries: [],
            });
          }
          return Promise.resolve(null);
        }),
        delete: jest.fn().mockResolvedValue({ id: 'wh_123' }),
      },
      webhookDelivery: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'del_123',
          ...data,
          createdAt: new Date(),
        })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  describe('createEndpoint', () => {
    it('should create webhook with generated whsec_ secret', async () => {
      const ep = await service.createEndpoint('user_1', {
        url: 'https://api.mycompany.com/webhooks/yoyo',
        description: 'Primary Alert Sink',
      });

      expect(ep.id).toBe('wh_123');
      expect(ep.secret).toMatch(/^whsec_[a-f0-9]{48}$/);
      expect(ep.events).toEqual(['*']);
    });

    it('should throw BadRequestException if URL is invalid', async () => {
      await expect(
        service.createEndpoint('user_1', { url: 'not-a-valid-url' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if max 10 endpoints reached', async () => {
      prismaService.webhookEndpoint.count.mockResolvedValueOnce(10);
      await expect(
        service.createEndpoint('user_1', { url: 'https://valid.com/wh' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listEndpoints', () => {
    it('should list user endpoints with masked secret', async () => {
      const list = await service.listEndpoints('user_1');
      expect(list.length).toBe(1);
      expect(list[0].secret).toContain('...');
      expect(list[0].totalDeliveries).toBe(3);
    });
  });

  describe('getEndpoint', () => {
    it('should return endpoint if found', async () => {
      const ep = await service.getEndpoint('user_1', 'wh_123');
      expect(ep.id).toBe('wh_123');
      expect(ep.url).toBe('https://webhook.site/test');
    });

    it('should throw NotFoundException if not found', async () => {
      prismaService.webhookEndpoint.findFirst.mockResolvedValueOnce(null);
      await expect(service.getEndpoint('user_1', 'unknown')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('deleteEndpoint', () => {
    it('should delete endpoint if found', async () => {
      const res = await service.deleteEndpoint('user_1', 'wh_123');
      expect(res.deleted).toBe(true);
    });

    it('should throw NotFoundException if endpoint does not exist', async () => {
      prismaService.webhookEndpoint.findFirst.mockResolvedValueOnce(null);
      await expect(service.deleteEndpoint('user_1', 'unknown')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
