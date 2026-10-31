import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TelemetryService {
  constructor(private prisma: PrismaService) {}

  async getUserUsageSummary(userId: string) {
    const quota = await this.prisma.userQuota.findUnique({
      where: { userId },
    });

    const totalRequests = await this.prisma.apiRequest.count({
      where: { userId },
    });

    const requestsToday = await this.prisma.apiRequest.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const modelUsageRaw = await this.prisma.apiRequest.groupBy({
      by: ['modelId'],
      where: { userId },
      _sum: {
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
      },
      _count: {
        id: true,
      },
    });

    const modelIds = modelUsageRaw.map((m) => m.modelId).filter(Boolean) as string[];
    const models = await this.prisma.model.findMany({
      where: { id: { in: modelIds } },
      select: { id: true, apiIdentifier: true, name: true },
    });
    const modelMap = new Map(models.map((m) => [m.id, m]));

    const modelUsage = modelUsageRaw.map((item) => {
      const model = item.modelId ? modelMap.get(item.modelId) : null;
      return {
        modelId: item.modelId,
        modelName: model?.name || 'Unknown',
        apiIdentifier: model?.apiIdentifier || 'unknown',
        totalTokens: item._sum.totalTokens || 0,
        promptTokens: item._sum.promptTokens || 0,
        completionTokens: item._sum.completionTokens || 0,
        requestCount: item._count.id,
      };
    });

    return {
      quota: quota
        ? {
            monthlyTokenLimit: Number(quota.monthlyTokenLimit),
            currentMonthTokensUsed: Number(quota.currentMonthTokensUsed),
            monthlyRequestLimit: quota.monthlyRequestLimit,
            currentMonthRequestsUsed: quota.currentMonthRequestsUsed,
            resetsAt: quota.resetsAt,
          }
        : null,
      totalRequests,
      requestsToday,
      modelUsage,
    };
  }

  async getRecentRequests(userId: string, limit = 50) {
    const requests = await this.prisma.apiRequest.findMany({
      where: { userId },
      include: {
        model: {
          select: { apiIdentifier: true, name: true },
        },
        apiKey: {
          select: { name: true, maskedKey: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return requests.map((r) => ({
      id: r.id,
      endpoint: r.endpoint,
      modelName: r.model?.name || 'Unknown',
      modelIdentifier: r.model?.apiIdentifier || 'unknown',
      keyName: r.apiKey?.name || 'Direct / Default',
      maskedKey: r.apiKey?.maskedKey || 'N/A',
      statusCode: r.statusCode,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      totalTokens: r.totalTokens,
      latencyMs: r.latencyMs,
      createdAt: r.createdAt,
    }));
  }
}

