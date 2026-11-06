import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { hashApiKey } from '../../common/utils/api-key.util';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      apiKey: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'key_123',
          name: data.name,
          maskedKey: data.maskedKey,
          allowedModels: data.allowedModels,
          rateLimitRpm: data.rateLimitRpm,
          rateLimitTpm: data.rateLimitTpm,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
        })),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'key_123', isActive: false }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  describe('create', () => {
    it('should generate a valid key with sk_live_ prefix and return plaintext once', async () => {
      const result = await service.create('user_1', {
        name: 'Test Key',
        rateLimitRpm: 60,
        rateLimitTpm: 60000,
        allowedModels: ['*'],
      });

      expect(result.plaintextKey).toMatch(/^sk_live_[A-Za-z0-9_-]+$/);
      expect(result.apiKey.id).toBe('key_123');
      expect(result.apiKey.name).toBe('Test Key');
      expect(prismaService.apiKey.create).toHaveBeenCalled();
    });

    it('should reject creation if user has reached the 10-key limit', async () => {
      prismaService.apiKey.count.mockResolvedValue(10);

      await expect(
        service.create('user_1', { name: 'Exceeding Key' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('list', () => {
    it('should list all active keys for user with invocation counts', async () => {
      prismaService.apiKey.findMany.mockResolvedValue([
        { id: 'key_1', name: 'Primary', maskedKey: 'sk_live_...1234', _count: { apiRequests: 42 } },
      ]);

      const keys = await service.list('user_1');
      expect(keys.length).toBe(1);
      expect(keys[0].name).toBe('Primary');
      expect(keys[0].totalRequests).toBe(42);
    });
  });

  describe('revoke', () => {
    it('should deactivate an active key for owner', async () => {
      prismaService.apiKey.findUnique.mockResolvedValue({
        id: 'key_123',
        userId: 'user_1',
        keyHash: 'fake_hash',
      });

      const res = await service.revoke('user_1', 'key_123');
      expect(res.success).toBe(true);
      expect(prismaService.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key_123' },
        data: { isActive: false },
      });
    });

    it('should throw ForbiddenException if user tries to revoke key of another user', async () => {
      prismaService.apiKey.findUnique.mockResolvedValue({
        id: 'key_123',
        userId: 'different_user',
      });

      await expect(service.revoke('user_1', 'key_123')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if key does not exist', async () => {
      prismaService.apiKey.findUnique.mockResolvedValue(null);

      await expect(service.revoke('user_1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateKey', () => {
    it('should return null for invalid or revoked key', async () => {
      prismaService.apiKey.findUnique.mockResolvedValue(null);

      const res = await service.validateKey('sk_live_test_mock_invalid_key_for_testing');
      expect(res).toBeNull();
    });

    it('should return key payload for valid active key', async () => {
      const raw = 'sk_live_test_mock_valid_active_key_for_testing';
      prismaService.apiKey.findUnique.mockResolvedValue({
        id: 'key_1',
        keyHash: hashApiKey(raw),
        isActive: true,
        allowedModels: ['llama-3.3-70b'],
        rateLimitRpm: 60,
        rateLimitTpm: 60000,
        user: { id: 'user_1', status: 'ACTIVE', role: 'USER' },
      });

      const keyData = await service.validateKey(raw);
      expect(keyData).not.toBeNull();
      expect(keyData?.userId).toBe('user_1');
      expect(keyData?.allowedModels).toContain('llama-3.3-70b');
    });

    it('should reject key if user account is suspended', async () => {
      const raw = 'sk_live_test_mock_valid_active_key_for_testing';
      prismaService.apiKey.findUnique.mockResolvedValue({
        id: 'key_1',
        isActive: true,
        user: { id: 'user_1', status: 'SUSPENDED', role: 'USER' },
      });

      const keyData = await service.validateKey(raw);
      expect(keyData).toBeNull();
    });
  });

  describe('checkRateLimit', () => {
    it('should allow request by default if Redis is offline', async () => {
      const res = await service.checkRateLimit('key_1', 60);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(60);
    });

    it('should allow token rate limit by default if Redis is offline', async () => {
      const res = await service.checkTokenRateLimit('key_1', 60000, 150);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(60000);
    });
  });
});
