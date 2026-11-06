import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { UserStatus, EngineType, DeploymentState, WorkerStatus } from '@prisma/client';

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      modelWorker: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'w1',
            workerName: 'gpu-worker-01',
            endpointUrl: 'http://localhost:8000',
            engineType: EngineType.VLLM,
            status: WorkerStatus.ONLINE,
            gpuDeviceIndex: 0,
            gpuModelName: 'NVIDIA H100 80GB SXM5',
            totalVramBytes: BigInt(85899345920),
            lastHeartbeatAt: new Date(),
            deployments: [
              {
                id: 'dep1',
                model: { name: 'Llama 3.3 70B', apiIdentifier: 'llama-3.3-70b' },
                state: DeploymentState.LOADED,
                activeConcurrency: 0,
              },
            ],
          },
        ]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'w1') {
            return Promise.resolve({
              id: 'w1',
              workerName: 'gpu-worker-01',
              endpointUrl: 'http://localhost:8000',
              engineType: EngineType.VLLM,
              status: WorkerStatus.ONLINE,
              lastHeartbeatAt: new Date(),
            });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'w_new',
          ...data,
        })),
        update: jest.fn().mockImplementation(({ where, data }) => ({
          id: where.id,
          ...data,
        })),
        delete: jest.fn().mockResolvedValue({ id: 'w1' }),
      },
      model: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'm1') {
            return Promise.resolve({ id: 'm1', name: 'Llama 3.3 70B' });
          }
          return Promise.resolve(null);
        }),
      },
      modelDeployment: {
        upsert: jest.fn().mockResolvedValue({
          id: 'dep_1',
          state: DeploymentState.LOADED,
        }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'u1',
            email: 'dev@yoyo.ai',
            role: 'DEVELOPER',
            status: UserStatus.ACTIVE,
            emailVerified: true,
            createdAt: new Date(),
            profile: { fullName: 'Dev User' },
            quota: {
              monthlyTokenLimit: BigInt(5000000),
              currentMonthTokensUsed: BigInt(120000),
            },
          },
        ]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'u1') {
            return Promise.resolve({ id: 'u1', email: 'dev@yoyo.ai', status: UserStatus.ACTIVE });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => ({
          id: where.id,
          ...data,
        })),
        count: jest.fn().mockResolvedValue(1),
      },
      userQuota: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.userId === 'u1') {
            return Promise.resolve({ id: 'q1', userId: 'u1', monthlyTokenLimit: BigInt(5000000) });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => ({
          id: 'q1',
          userId: where.userId,
          monthlyTokenLimit: data.monthlyTokenLimit,
        })),
      },
      apiRequest: {
        count: jest.fn().mockResolvedValue(100),
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalTokens: 500000 } }),
      },
      apiKey: {
        count: jest.fn().mockResolvedValue(5),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('getWorkers', () => {
    it('should return mapped worker nodes with deployments', async () => {
      const workers = await service.getWorkers();
      expect(workers.length).toBe(1);
      expect(workers[0].workerName).toBe('gpu-worker-01');
      expect(workers[0].deployments.length).toBe(1);
      expect(workers[0].deployments[0].apiIdentifier).toBe('llama-3.3-70b');
    });
  });

  describe('registerWorker', () => {
    it('should register a new cloud worker node', async () => {
      const worker = await service.registerWorker({
        workerName: 'runpod-node-02',
        endpointUrl: 'https://xyz.proxy.runpod.net',
        engineType: EngineType.VLLM,
        gpuModelName: 'NVIDIA H100 80GB SXM5',
      });

      expect(worker.workerName).toBe('runpod-node-02');
      expect(prismaService.modelWorker.create).toHaveBeenCalled();
    });
  });

  describe('deleteWorker', () => {
    it('should delete worker if exists', async () => {
      const deleted = await service.deleteWorker('w1');
      expect(deleted.id).toBe('w1');
    });

    it('should throw NotFoundException if worker not found', async () => {
      prismaService.modelWorker.findUnique.mockResolvedValueOnce(null);
      await expect(service.deleteWorker('w_unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deployModelToWorker', () => {
    it('should upsert model deployment to loaded state', async () => {
      const dep = await service.deployModelToWorker('w1', 'm1');
      expect(dep.state).toBe(DeploymentState.LOADED);
      expect(prismaService.modelDeployment.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException if worker or model missing', async () => {
      prismaService.modelWorker.findUnique.mockResolvedValueOnce(null);
      await expect(service.deployModelToWorker('w_missing', 'm1')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getUsers', () => {
    it('should list tenants with converted BigInt token quotas', async () => {
      const res = await service.getUsers(1, 10);
      expect(res.users.length).toBe(1);
      expect(res.users[0].quota?.monthlyTokenLimit).toBe(5000000);
      expect(res.total).toBe(1);
    });
  });

  describe('updateUserStatus', () => {
    it('should toggle user status between ACTIVE and SUSPENDED', async () => {
      const updated = await service.updateUserStatus('u1', UserStatus.SUSPENDED);
      expect(updated.status).toBe(UserStatus.SUSPENDED);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.updateUserStatus('u_missing', UserStatus.SUSPENDED)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateUserQuota', () => {
    it('should update tenant monthly token quota ceiling', async () => {
      const updated = await service.updateUserQuota('u1', 25000000);
      expect(updated.monthlyTokenLimit).toBe(BigInt(25000000));
    });

    it('should throw NotFoundException if quota not found', async () => {
      prismaService.userQuota.findUnique.mockResolvedValueOnce(null);
      await expect(service.updateUserQuota('u_missing', 10000)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getPlatformStats', () => {
    it('should return high-level platform statistics', async () => {
      const stats = await service.getPlatformStats();
      expect(stats.totalUsers).toBe(1);
      expect(stats.totalRequests).toBe(100);
      expect(stats.totalTokensConsumed).toBe(500000);
      expect(stats.activeApiKeys).toBe(5);
    });
  });
});

