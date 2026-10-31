import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getWorkers() {
    const workers = await this.prisma.modelWorker.findMany({
      include: {
        deployments: {
          include: { model: true },
        },
      },
    });

    return workers.map((w) => ({
      id: w.id,
      workerName: w.workerName,
      endpointUrl: w.endpointUrl,
      engineType: w.engineType,
      status: w.status,
      gpuDeviceIndex: w.gpuDeviceIndex,
      gpuModelName: w.gpuModelName,
      totalVramBytes: Number(w.totalVramBytes),
      lastHeartbeatAt: w.lastHeartbeatAt,
      deployments: w.deployments.map((d) => ({
        id: d.id,
        modelName: d.model.name,
        apiIdentifier: d.model.apiIdentifier,
        state: d.state,
        activeConcurrency: d.activeConcurrency,
      })),
    }));
  }

  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          profile: true,
          quota: true,
          _count: {
            select: {
              apiKeys: true,
              apiRequests: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users: users.map((u) => ({
        ...u,
        quota: u.quota
          ? {
              ...u.quota,
              monthlyTokenLimit: Number(u.quota.monthlyTokenLimit),
              currentMonthTokensUsed: Number(u.quota.currentMonthTokensUsed),
            }
          : null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserStatus(userId: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, email: true, status: true },
    });
  }

  async updateUserQuota(userId: string, tokenLimit: number) {
    const quota = await this.prisma.userQuota.findUnique({ where: { userId } });
    if (!quota) throw new NotFoundException('User quota record not found.');

    return this.prisma.userQuota.update({
      where: { userId },
      data: { monthlyTokenLimit: BigInt(tokenLimit) },
    });
  }

  async getPlatformStats() {
    const [totalUsers, totalRequests, totalTokensResult, activeKeys] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.apiRequest.count(),
      this.prisma.apiRequest.aggregate({
        _sum: { totalTokens: true },
      }),
      this.prisma.apiKey.count({ where: { isActive: true } }),
    ]);

    return {
      totalUsers,
      totalRequests,
      totalTokensConsumed: totalTokensResult._sum.totalTokens || 0,
      activeApiKeys: activeKeys,
    };
  }
}

