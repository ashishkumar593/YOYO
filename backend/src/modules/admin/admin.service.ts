import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserStatus, EngineType, DeploymentState, WorkerStatus } from '@prisma/client';

@Injectable()
export class AdminService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminService.name);
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Start automated background health check every 60s
    this.healthCheckInterval = setInterval(() => {
      this.pollAllWorkers().catch((err) => {
        this.logger.error(`Automated worker health check failed: ${err.message}`);
      });
    }, 60000);
    if (this.healthCheckInterval.unref) {
      this.healthCheckInterval.unref();
    }
  }

  onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  async pollAllWorkers() {
    const workers = await this.prisma.modelWorker.findMany();
    for (const worker of workers) {
      try {
        await this.verifyWorkerHealth(worker.id);
      } catch {}
    }
  }

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

  async registerWorker(data: {
    workerName: string;
    endpointUrl: string;
    engineType?: EngineType;
    gpuModelName?: string;
    totalVramBytes?: number;
  }) {
    return this.prisma.modelWorker.create({
      data: {
        workerName: data.workerName,
        endpointUrl: data.endpointUrl.replace(/\/$/, ''),
        engineType: data.engineType || EngineType.OLLAMA,
        gpuModelName: data.gpuModelName || 'NVIDIA Cloud GPU (H100/A100)',
        totalVramBytes: data.totalVramBytes ? BigInt(data.totalVramBytes) : BigInt(85899345920), // 80GB default
        status: 'ONLINE',
        lastHeartbeatAt: new Date(),
      },
    });
  }

  async deleteWorker(workerId: string) {
    const worker = await this.prisma.modelWorker.findUnique({ where: { id: workerId } });
    if (!worker) throw new NotFoundException('Worker node not found.');

    return this.prisma.modelWorker.delete({
      where: { id: workerId },
    });
  }

  async deployModelToWorker(workerId: string, modelId: string) {
    const [worker, model] = await Promise.all([
      this.prisma.modelWorker.findUnique({ where: { id: workerId } }),
      this.prisma.model.findUnique({ where: { id: modelId } }),
    ]);

    if (!worker) throw new NotFoundException('Worker node not found.');
    if (!model) throw new NotFoundException('Model not found.');

    return this.prisma.modelDeployment.upsert({
      where: {
        modelId_workerId: {
          modelId,
          workerId,
        },
      },
      update: {
        state: DeploymentState.LOADED,
        loadedAt: new Date(),
      },
      create: {
        workerId,
        modelId,
        state: DeploymentState.LOADED,
        loadedAt: new Date(),
      },
    });
  }

  async verifyWorkerHealth(workerId: string) {
    const worker = await this.prisma.modelWorker.findUnique({ where: { id: workerId } });
    if (!worker) throw new NotFoundException('Worker node not found.');

    const start = Date.now();
    const ep = worker.endpointUrl.replace(/\/$/, '');
    let isHealthy = false;
    let errorMessage: string | null = null;

    try {
      const testPath = worker.engineType === EngineType.OLLAMA ? `${ep}/api/tags` : `${ep}/health`;
      const res = await fetch(testPath, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        isHealthy = true;
      } else {
        const fallback = await fetch(`${ep}/v1/models`, { signal: AbortSignal.timeout(4000) });
        if (fallback.ok) isHealthy = true;
      }
    } catch (err: any) {
      errorMessage = err.message || 'Worker unreachable';
    }

    const latencyMs = Date.now() - start;
    const newStatus = isHealthy ? WorkerStatus.ONLINE : WorkerStatus.OFFLINE;

    await this.prisma.modelWorker.update({
      where: { id: workerId },
      data: {
        status: newStatus,
        lastHeartbeatAt: isHealthy ? new Date() : worker.lastHeartbeatAt,
      },
    });

    return {
      workerId,
      workerName: worker.workerName,
      status: newStatus,
      isHealthy,
      latencyMs: isHealthy ? latencyMs : null,
      errorMessage,
    };
  }

  async getUsers(
    page = 1,
    limit = 25,
    search?: string,
    statusFilter?: string,
    sortBy = 'createdAt'
  ) {
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter;
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { profile: { fullName: { contains: q, mode: 'insensitive' } } },
        { profile: { companyName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'tokensUsed') {
      orderBy = { quota: { currentMonthTokensUsed: 'desc' } };
    } else if (sortBy === 'tokenLimit') {
      orderBy = { quota: { monthlyTokenLimit: 'desc' } };
    } else if (sortBy === 'email') {
      orderBy = { email: 'asc' };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
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
          creditBalance: true,
          _count: {
            select: {
              apiKeys: true,
              apiRequests: true,
            },
          },
        },
        orderBy,
      }),
      this.prisma.user.count({ where: whereClause }),
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
        creditBalance: u.creditBalance ? Number(u.creditBalance.balanceUsd) : 0,
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

  async updateUserCredit(
    userId: string,
    balanceUsd: number,
    options?: { reason?: string; mode?: 'set' | 'adjust' }
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { creditBalance: true },
    });
    if (!user) throw new NotFoundException('User not found.');

    const mode = options?.mode || 'set';
    const currentBalance = user.creditBalance ? Number(user.creditBalance.balanceUsd) : 0;
    const finalBalance = mode === 'adjust' ? currentBalance + balanceUsd : balanceUsd;
    const delta = mode === 'adjust' ? balanceUsd : finalBalance - currentBalance;

    const updated = await this.prisma.creditBalance.upsert({
      where: { userId },
      update: { balanceUsd: Math.max(0, finalBalance) },
      create: { userId, balanceUsd: Math.max(0, finalBalance), currency: 'USD' },
    });

    if (delta !== 0 && this.prisma.billingTransaction?.create) {
      await this.prisma.billingTransaction.create({
        data: {
          userId,
          amountUsd: delta,
          type: delta > 0 ? 'ADMIN_CREDIT_GRANT' : 'ADMIN_CREDIT_DEDUCTION',
          description:
            options?.reason ||
            `Admin credit ${mode === 'adjust' ? (delta > 0 ? 'top-up' : 'deduction') : 'override'}`,
        },
      });
    }

    return updated;
  }

  async getUserBillingDetails(userId: string) {
    const user: any = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        quota: true,
        creditBalance: true,
        apiKeys: {
          select: {
            id: true,
            name: true,
            maskedKey: true,
            isActive: true,
            budgetLimitUsd: true,
            createdAt: true,
            lastUsedAt: true,
          },
        },
        billingTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) throw new NotFoundException('Developer not found.');

    const requestAgg = await this.prisma.apiRequest.aggregate({
      where: { userId },
      _count: true,
      _sum: { totalTokens: true },
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      profile: user.profile,
      quota: user.quota
        ? {
            ...user.quota,
            monthlyTokenLimit: Number(user.quota.monthlyTokenLimit),
            currentMonthTokensUsed: Number(user.quota.currentMonthTokensUsed),
          }
        : null,
      creditBalance: user.creditBalance
        ? {
            balanceUsd: Number(user.creditBalance.balanceUsd),
            currency: user.creditBalance.currency,
            autoRecharge: user.creditBalance.autoRecharge,
            updatedAt: user.creditBalance.updatedAt,
          }
        : { balanceUsd: 0, currency: 'USD', autoRecharge: false },
      apiKeys: user.apiKeys,
      transactions: (user.billingTransactions || []).map((tx) => ({
        id: tx.id,
        amountUsd: Number(tx.amountUsd),
        type: tx.type,
        description: tx.description,
        createdAt: tx.createdAt,
      })),
      usageSummary: {
        totalRequests: requestAgg._count,
        totalTokens: requestAgg._sum.totalTokens || 0,
      },
    };
  }

  async getBillingSummary() {
    const [
      totalDepositsAgg,
      totalCreditsAgg,
      totalUsersCount,
      recentTransactions,
      lowBalanceCount,
    ] = await Promise.all([
      this.prisma.billingTransaction.aggregate({
        where: { amountUsd: { gt: 0 } },
        _sum: { amountUsd: true },
      }),
      this.prisma.creditBalance.aggregate({
        _sum: { balanceUsd: true },
      }),
      this.prisma.user.count(),
      this.prisma.billingTransaction.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true, profile: { select: { fullName: true, companyName: true } } },
          },
        },
      }),
      this.prisma.creditBalance.count({
        where: { balanceUsd: { lte: 5 } },
      }),
    ]);

    const totalDeposited = totalDepositsAgg._sum.amountUsd ? Number(totalDepositsAgg._sum.amountUsd) : 0;
    const totalCirculatingCredits = totalCreditsAgg._sum.balanceUsd ? Number(totalCreditsAgg._sum.balanceUsd) : 0;

    return {
      totalDepositedUsd: totalDeposited,
      totalCirculatingCreditsUsd: totalCirculatingCredits,
      totalDevelopers: totalUsersCount,
      lowBalanceDevelopersCount: lowBalanceCount,
      recentTransactions: (recentTransactions || []).map((tx) => ({
        id: tx.id,
        userId: tx.userId,
        userEmail: tx.user?.email,
        developerName: tx.user?.profile?.fullName || tx.user?.email?.split('@')[0],
        company: tx.user?.profile?.companyName,
        amountUsd: Number(tx.amountUsd),
        type: tx.type,
        description: tx.description,
        createdAt: tx.createdAt,
      })),
    };
  }

  async updateBillingSettings(
    userId: string,
    data: { autoRecharge?: boolean; monthlyTokenLimit?: number; status?: UserStatus }
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    if (data.status) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: data.status },
      });
    }

    if (data.autoRecharge !== undefined) {
      await this.prisma.creditBalance.upsert({
        where: { userId },
        update: { autoRecharge: data.autoRecharge },
        create: { userId, balanceUsd: 10, currency: 'USD', autoRecharge: data.autoRecharge },
      });
    }

    if (data.monthlyTokenLimit !== undefined) {
      await this.prisma.userQuota.upsert({
        where: { userId },
        update: { monthlyTokenLimit: BigInt(data.monthlyTokenLimit) },
        create: {
          userId,
          monthlyTokenLimit: BigInt(data.monthlyTokenLimit),
          resetsAt: new Date(Date.now() + 30 * 86400000),
        },
      });
    }

    return this.getUserBillingDetails(userId);
  }

  async resetUserUsage(userId: string) {
    const quota = await this.prisma.userQuota.findUnique({ where: { userId } });
    if (!quota) throw new NotFoundException('User quota record not found.');

    return this.prisma.userQuota.update({
      where: { userId },
      data: {
        currentMonthTokensUsed: BigInt(0),
        currentMonthRequestsUsed: 0,
      },
    });
  }

  async getPlatformStats() {
    const [
      totalUsers,
      totalRequests,
      totalTokensResult,
      activeKeys,
      activeModelsCount,
      totalWorkersCount,
      healthyWorkersCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.apiRequest.count(),
      this.prisma.apiRequest.aggregate({
        _sum: { totalTokens: true },
      }),
      this.prisma.apiKey.count({ where: { isActive: true } }),
      this.prisma.model.count({ where: { isActive: true } }),
      this.prisma.modelWorker.count(),
      this.prisma.modelWorker.count({ where: { status: 'ONLINE' } }),
    ]);

    const totalTokens = totalTokensResult._sum.totalTokens || 0;
    const estimatedRevenueUsd = Number(((Number(totalTokens) / 1000000) * 0.5).toFixed(2));

    return {
      totalUsers,
      totalRequests,
      totalTokensConsumed: totalTokens,
      activeApiKeys: activeKeys,
      activeModelsCount,
      totalWorkersCount,
      healthyWorkersCount,
      estimatedRevenueUsd,
    };
  }
}

