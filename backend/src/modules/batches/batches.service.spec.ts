import { Test, TestingModule } from '@nestjs/testing';
import { BatchesService } from './batches.service';
import { PrismaService } from '../../database/prisma.service';
import { InferenceService } from '../inference/inference.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BatchJobStatus } from '@prisma/client';

describe('BatchesService', () => {
  let service: BatchesService;
  let prismaService: any;
  let inferenceService: any;

  beforeEach(async () => {
    prismaService = {
      batchFile: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'file_123',
          ...data,
          createdAt: new Date(),
        })),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'file_123',
            filename: 'input.jsonl',
            purpose: 'batch',
            bytes: 128,
            createdAt: new Date(),
          },
        ]),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'file_123') {
            return Promise.resolve({
              id: 'file_123',
              userId: 'user_1',
              filename: 'input.jsonl',
              purpose: 'batch',
              bytes: 128,
              content: '{"custom_id": "req-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "Hi"}]}}',
              createdAt: new Date(),
            });
          }
          return Promise.resolve(null);
        }),
        delete: jest.fn().mockResolvedValue({ id: 'file_123' }),
      },
      batchJob: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'batch_123',
          ...data,
          createdAt: new Date(),
        })),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'batch_123',
            endpoint: '/v1/chat/completions',
            inputFileId: 'file_123',
            completionWindow: '24h',
            status: BatchJobStatus.IN_PROGRESS,
            totalRequests: 1,
            completedRequests: 0,
            failedRequests: 0,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 86400000),
          },
        ]),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'batch_123') {
            return Promise.resolve({
              id: 'batch_123',
              userId: 'user_1',
              endpoint: '/v1/chat/completions',
              inputFileId: 'file_123',
              completionWindow: '24h',
              status: BatchJobStatus.IN_PROGRESS,
              totalRequests: 1,
              completedRequests: 0,
              failedRequests: 0,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 86400000),
            });
          }
          return Promise.resolve(null);
        }),
        findUnique: jest.fn().mockResolvedValue({ status: BatchJobStatus.IN_PROGRESS }),
        update: jest.fn().mockImplementation(({ where, data }) => ({
          id: where.id,
          ...data,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        })),
      },
    };

    inferenceService = {
      chatCompletion: jest.fn().mockResolvedValue({
        id: 'chatcmpl_mock_1',
        choices: [{ message: { role: 'assistant', content: 'Batch response' } }],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchesService,
        { provide: PrismaService, useValue: prismaService },
        { provide: InferenceService, useValue: inferenceService },
      ],
    }).compile();

    service = module.get<BatchesService>(BatchesService);
  });

  describe('uploadFile', () => {
    it('should create and return file object for valid jsonl', async () => {
      const file = await service.uploadFile('user_1', 'test.jsonl', '{"custom_id": "1"}');
      expect(file.id).toBe('file_123');
      expect(file.bytes).toBeGreaterThan(0);
      expect(file.status).toBe('processed');
    });

    it('should throw BadRequestException if content is empty', async () => {
      await expect(service.uploadFile('user_1', 'empty.jsonl', '')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getFileContent', () => {
    it('should return plaintext content when file exists', async () => {
      const content = await service.getFileContent('user_1', 'file_123');
      expect(content).toContain('req-1');
    });

    it('should throw NotFoundException if file does not exist', async () => {
      await expect(service.getFileContent('user_1', 'unknown_file')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('createBatch', () => {
    it('should create batch job for valid input file', async () => {
      const batch = await service.createBatch(
        'user_1',
        {
          input_file_id: 'file_123',
        },
        false
      );
      expect(batch.id).toBe('batch_123');
      expect(batch.status).toBe('in_progress');
      expect(batch.request_counts.total).toBe(1);
    });

    it('should throw NotFoundException if input file does not exist', async () => {
      prismaService.batchFile.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.createBatch('user_1', { input_file_id: 'unknown' }, false)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelBatch', () => {
    it('should cancel active batch', async () => {
      const res = await service.cancelBatch('user_1', 'batch_123');
      expect(res.status).toBe('cancelled');
    });

    it('should throw BadRequestException if batch already completed', async () => {
      prismaService.batchJob.findFirst.mockResolvedValueOnce({
        id: 'batch_done',
        userId: 'user_1',
        status: BatchJobStatus.COMPLETED,
      });

      await expect(service.cancelBatch('user_1', 'batch_done')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('executeBatch', () => {
    it('should process lines, invoke inference, and produce output file', async () => {
      const lines = [
        '{"custom_id": "r1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "Hello"}]}}',
      ];

      await service.executeBatch('batch_123', 'user_1', lines);

      expect(inferenceService.chatCompletion).toHaveBeenCalled();
      expect(prismaService.batchFile.create).toHaveBeenCalled();
      expect(prismaService.batchJob.update).toHaveBeenCalled();
    });
  });
});
