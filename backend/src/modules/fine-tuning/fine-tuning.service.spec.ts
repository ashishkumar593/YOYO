import { Test, TestingModule } from '@nestjs/testing';
import { FineTuningService } from './fine-tuning.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FineTuningStatus } from '@prisma/client';

describe('FineTuningService', () => {
  let service: FineTuningService;
  let prisma: any;

  const mockPrismaService = {
    model: {
      findFirst: jest.fn(),
    },
    batchFile: {
      findFirst: jest.fn(),
    },
    fineTuningJob: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    fineTuningEvent: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    modelAdapter: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FineTuningService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FineTuningService>(FineTuningService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should throw NotFoundException if base model does not exist', async () => {
      prisma.model.findFirst.mockResolvedValue(null);

      await expect(
        service.createJob('user-1', {
          model: 'non-existent-model',
          training_file: 'file-123',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if training file does not exist', async () => {
      prisma.model.findFirst.mockResolvedValue({
        id: 'model-1',
        apiIdentifier: 'llama-3.3-70b',
      });
      prisma.batchFile.findFirst.mockResolvedValue(null);

      await expect(
        service.createJob('user-1', {
          model: 'llama-3.3-70b',
          training_file: 'file-missing',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should create fine-tuning job and schedule background progression', async () => {
      prisma.model.findFirst.mockResolvedValue({
        id: 'model-1',
        apiIdentifier: 'llama-3.3-70b',
      });
      prisma.batchFile.findFirst.mockResolvedValue({
        id: 'file-123',
        userId: 'user-1',
        filename: 'train.jsonl',
        bytes: 12000,
      });

      const now = new Date();
      prisma.fineTuningJob.create.mockResolvedValue({
        id: 'ftjob-abc',
        userId: 'user-1',
        organizationId: null,
        model: 'llama-3.3-70b',
        trainingFileId: 'file-123',
        validationFileId: null,
        suffix: 'legal-v1',
        fineTunedModel: 'llama-3.3-70b:legal-v1',
        status: FineTuningStatus.VALIDATING_FILES,
        hyperparameters: { n_epochs: 3 },
        trainedTokens: 4000,
        createdAt: now,
        finishedAt: null,
        error: null,
      });

      prisma.fineTuningJob.update.mockResolvedValue({});
      prisma.fineTuningEvent.createMany.mockResolvedValue({});
      prisma.modelAdapter.findUnique.mockResolvedValue(null);
      prisma.modelAdapter.create.mockResolvedValue({});

      const result = await service.createJob('user-1', {
        model: 'llama-3.3-70b',
        training_file: 'file-123',
        suffix: 'legal-v1',
      });

      expect(result.id).toBe('ftjob-abc');
      expect(result.object).toBe('fine_tuning.job');
      expect(result.model).toBe('llama-3.3-70b');
      expect(result.status).toBe('validating_files');
      expect(prisma.fineTuningJob.create).toHaveBeenCalled();
      expect(prisma.fineTuningEvent.createMany).toHaveBeenCalled();
    });
  });

  describe('listJobs', () => {
    it('should list fine-tuning jobs for user', async () => {
      prisma.fineTuningJob.findMany.mockResolvedValue([
        {
          id: 'ftjob-1',
          model: 'llama-3.3-70b',
          trainingFileId: 'file-1',
          status: FineTuningStatus.SUCCEEDED,
          fineTunedModel: 'llama-3.3-70b:ft-1',
          createdAt: new Date(),
          finishedAt: new Date(),
        },
      ]);

      const res = await service.listJobs('user-1', 10);
      expect(res.object).toBe('list');
      expect(res.data).toHaveLength(1);
      expect(res.data[0].id).toBe('ftjob-1');
      expect(res.data[0].fine_tuned_model).toBe('llama-3.3-70b:ft-1');
    });
  });

  describe('getJob', () => {
    it('should throw NotFoundException if job does not exist', async () => {
      prisma.fineTuningJob.findFirst.mockResolvedValue(null);

      await expect(service.getJob('user-1', 'job-none')).rejects.toThrow(NotFoundException);
    });

    it('should return job if found', async () => {
      prisma.fineTuningJob.findFirst.mockResolvedValue({
        id: 'ftjob-99',
        model: 'deepseek-r1-70b',
        trainingFileId: 'file-99',
        status: FineTuningStatus.RUNNING,
        createdAt: new Date(),
        finishedAt: null,
      });

      const res = await service.getJob('user-1', 'ftjob-99');
      expect(res.id).toBe('ftjob-99');
      expect(res.status).toBe('running');
    });
  });

  describe('cancelJob', () => {
    it('should throw BadRequestException if job already succeeded', async () => {
      prisma.fineTuningJob.findFirst.mockResolvedValue({
        id: 'ftjob-done',
        status: FineTuningStatus.SUCCEEDED,
      });

      await expect(service.cancelJob('user-1', 'ftjob-done')).rejects.toThrow(BadRequestException);
    });

    it('should cancel running job', async () => {
      prisma.fineTuningJob.findFirst.mockResolvedValue({
        id: 'ftjob-running',
        status: FineTuningStatus.RUNNING,
        createdAt: new Date(),
      });
      prisma.fineTuningJob.update.mockResolvedValue({
        id: 'ftjob-running',
        status: FineTuningStatus.CANCELLED,
        createdAt: new Date(),
        finishedAt: new Date(),
      });
      prisma.fineTuningEvent.create.mockResolvedValue({});

      const res = await service.cancelJob('user-1', 'ftjob-running');
      expect(res.status).toBe('cancelled');
      expect(prisma.fineTuningJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ftjob-running' },
          data: expect.objectContaining({ status: FineTuningStatus.CANCELLED }),
        })
      );
    });
  });

  describe('listEvents', () => {
    it('should return list of events for job', async () => {
      prisma.fineTuningJob.findFirst.mockResolvedValue({
        id: 'ftjob-1',
        createdAt: new Date(),
        status: FineTuningStatus.RUNNING,
      });
      prisma.fineTuningEvent.findMany.mockResolvedValue([
        {
          id: 'ev-1',
          jobId: 'ftjob-1',
          level: 'info',
          message: 'Files validated',
          createdAt: new Date(),
        },
      ]);

      const res = await service.listEvents('user-1', 'ftjob-1');
      expect(res.object).toBe('list');
      expect(res.data).toHaveLength(1);
      expect(res.data[0].message).toBe('Files validated');
    });
  });
});
