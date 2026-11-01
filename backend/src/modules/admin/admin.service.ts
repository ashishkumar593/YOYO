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

