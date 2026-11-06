import { Test, TestingModule } from '@nestjs/testing';
import { ModelsService } from './models.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ModelCategory } from '@prisma/client';

describe('ModelsService', () => {
  let service: ModelsService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      model: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'm1',
            apiIdentifier: 'llama-3.3-70b',
            name: 'Llama 3.3 70B Instruct',
            providerFamily: 'Meta',
            category: ModelCategory.GENERAL,
            description: 'State of the art open model',
            license: 'Community',
            isActive: true,
            isPublic: true,
            defaultContextWindow: 131072,
            createdAt: new Date('2026-01-01'),
            versions: [
              {
                tag: '70b-fp16',
                quantizationLevel: 'FP16',
                parameterSize: BigInt(70000000000),
                vramRequiredBytes: BigInt(80000000000),
              },
            ],
            deployments: [{ state: 'LOADED', worker: {} }],
          },
        ]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.apiIdentifier === 'llama-3.3-70b' || where.id === 'm1') {
            return Promise.resolve({
              id: 'm1',
              apiIdentifier: 'llama-3.3-70b',
              name: 'Llama 3.3 70B Instruct',
              providerFamily: 'Meta',
              isActive: true,
              isPublic: true,
              createdAt: new Date('2026-01-01'),
            });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'm_new',
          ...data,
          createdAt: new Date(),
        })),
        update: jest.fn().mockImplementation(({ where, data }) => ({
          id: where.id,
          ...data,
        })),
        delete: jest.fn().mockResolvedValue({ id: 'm1' }),
      },
      modelPricing: {
        findMany: jest.fn().mockResolvedValue([
          {
            modelIdentifier: 'llama-3.3-70b',
            inputCostPerMillion: 0.2,
            outputCostPerMillion: 0.4,
          },
        ]),
        upsert: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => {
        return cb(prismaService);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelsService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ModelsService>(ModelsService);
  });

  describe('listOpenAiModels', () => {
    it('should format models into OpenAI list response structure', async () => {
      const res = await service.listOpenAiModels();
      expect(res.object).toBe('list');
      expect(res.data.length).toBe(1);
      expect(res.data[0].id).toBe('llama-3.3-70b');
      expect(res.data[0].owned_by).toBe('meta');
      expect(res.data[0].object).toBe('model');
    });
  });

  describe('getOpenAiModel', () => {
    it('should return a single model object when found and active', async () => {
      const res = await service.getOpenAiModel('llama-3.3-70b');
      expect(res.id).toBe('llama-3.3-70b');
      expect(res.owned_by).toBe('meta');
    });

    it('should throw NotFoundException when model does not exist', async () => {
      await expect(service.getOpenAiModel('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('listCatalog', () => {
    it('should return catalog models with mapped pricing and loaded state', async () => {
      const catalog = await service.listCatalog();
      expect(catalog.length).toBe(1);
      expect(catalog[0].apiIdentifier).toBe('llama-3.3-70b');
      expect(catalog[0].pricing.inputCostPerMillion).toBe(0.2);
      expect(catalog[0].isLoaded).toBe(true);
    });
  });

  describe('createModel', () => {
    it('should create new model inside transaction', async () => {
      prismaService.model.findUnique.mockResolvedValueOnce(null);

      const res = await service.createModel({
        apiIdentifier: 'qwen-2.5-coder-32b',
        name: 'Qwen 2.5 Coder',
        providerFamily: 'Alibaba Cloud',
        defaultContextWindow: 131072,
      });

      expect(res).toBeDefined();
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if apiIdentifier already exists', async () => {
      prismaService.model.findUnique.mockResolvedValueOnce({ id: 'existing' });

      await expect(
        service.createModel({
          apiIdentifier: 'llama-3.3-70b',
          name: 'Llama Duplicate',
          providerFamily: 'Meta',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateModel', () => {
    it('should update existing model', async () => {
      const updated = await service.updateModel('m1', {
        name: 'Updated Name',
      });
      expect(updated.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if model to update does not exist', async () => {
      prismaService.model.findUnique.mockResolvedValueOnce(null);
      await expect(service.updateModel('m_unknown', {})).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('deleteModel', () => {
    it('should deactivate model if found', async () => {
      prismaService.model.update.mockResolvedValueOnce({ id: 'm1', isActive: false });
      const res = await service.deleteModel('m1');
      expect(res.isActive).toBe(false);
    });

    it('should throw NotFoundException if model to delete does not exist', async () => {
      prismaService.model.findUnique.mockResolvedValueOnce(null);
      await expect(service.deleteModel('m_unknown')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
