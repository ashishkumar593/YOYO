import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateApiKeyDto } from './dto/create-key.dto';
import { generateApiKey, hashApiKey } from '../../common/utils/api-key.util';
import Redis from 'ioredis';

@Injectable()
export class ApiKeysService {
  private redis: Redis | null = null;

  constructor(private prisma: PrismaService) {
    try {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      this.redis.connect().catch(() => {});
    } catch {}
  }

  async create(userId: string, dto: CreateApiKeyDto) {
    // Check key limit per user (default max 5 keys)
    const existingCount = await this.prisma.apiKey.count({
      where: { userId, isActive: true },
    });

    if (existingCount >= 10) {
      throw new BadRequestException('API key limit reached (maximum 10 active keys per account).');
    }

    const { plaintextKey, keyPrefix, keyHash, maskedKey } = generateApiKey();

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name: dto.name,
        keyPrefix,
        keyHash,
        maskedKey,
        allowedModels: dto.allowedModels || ['*'],
        rateLimitRpm: dto.rateLimitRpm || 60,
        rateLimitTpm: dto.rateLimitTpm || 60000,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        maskedKey: true,
        allowedModels: true,
        rateLimitRpm: true,
        rateLimitTpm: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Cache key hash in Redis for fast sub-millisecond lookups
    if (this.redis && this.redis.status === 'ready') {
      const cacheData = JSON.stringify({
        keyId: apiKey.id,
        userId,
        allowedModels: apiKey.allowedModels,
        rateLimitRpm: apiKey.rateLimitRpm,
        rateLimitTpm: apiKey.rateLimitTpm,
        isActive: true,
      });
      await this.redis.set(`key:${keyHash}`, cacheData, 'EX', 300);
    }

    return {
      apiKey,
      plaintextKey, // Return plaintext ONCE to the user
    };
  }

  async list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        maskedKey: true,
        allowedModels: true,
        rateLimitRpm: true,
        rateLimitTpm: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!key) throw new NotFoundException('API key not found.');
    if (key.userId !== userId) throw new ForbiddenException('Unauthorized to modify this key.');

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    // Invalidate Redis cache immediately
    if (this.redis && this.redis.status === 'ready') {
      await this.redis.del(`key:${key.keyHash}`);
    }

    return { success: true, message: 'API key revoked successfully.' };
  }

  async validateKey(rawKey: string) {
    const hash = hashApiKey(rawKey);

    // 1. Try Redis cache first (< 1ms)
    if (this.redis && this.redis.status === 'ready') {
      try {
        const cached = await this.redis.get(`key:${hash}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.isActive) return parsed;
        }
      } catch {}
    }

    // 2. Fallback to Database query
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash: hash },
      include: {
        user: {
          select: {
            id: true,
            status: true,
            role: true,
          },
        },
      },
    });

    if (!key || !key.isActive || key.user.status === 'SUSPENDED') {
      return null;
    }

    if (key.expiresAt && new Date() > key.expiresAt) {
      return null;
    }

    const payload = {
      keyId: key.id,
      userId: key.user.id,
      userRole: key.user.role,
      allowedModels: key.allowedModels as string[],
      rateLimitRpm: key.rateLimitRpm,
      rateLimitTpm: key.rateLimitTpm,
      isActive: true,
    };

    // Repopulate cache (5 min TTL)
    if (this.redis && this.redis.status === 'ready') {
      this.redis.set(`key:${hash}`, JSON.stringify(payload), 'EX', 300).catch(() => {});
    }

    return payload;
  }

  async checkRateLimit(
    keyId: string,
    limitRpm: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    if (!this.redis || this.redis.status !== 'ready') {
      return { allowed: true, remaining: limitRpm };
    }

    const currentMinute = Math.floor(Date.now() / 60000);
    const redisKey = `ratelimit:rpm:${keyId}:${currentMinute}`;

    try {
      const count = await this.redis.incr(redisKey);
      if (count === 1) {
        await this.redis.expire(redisKey, 70); // Expire cleanly after current minute window
      }

      if (count > limitRpm) {
        return { allowed: false, remaining: 0 };
      }

      return { allowed: true, remaining: Math.max(0, limitRpm - count) };
    } catch {
      return { allowed: true, remaining: limitRpm };
    }
  }
}

