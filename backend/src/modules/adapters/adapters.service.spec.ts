import { Test, TestingModule } from '@nestjs/testing';
import { AdaptersService } from './adapters.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdapterStatus } from '@prisma/client';

describe('AdaptersService', () => {
  let service: AdaptersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      model: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      modelAdapter: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdaptersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdaptersService>(AdaptersService);
  });

  it('should successfully register a new LoRA adapter linked to a base foundation model', async () => {
    prisma.model.findFirst.mockResolvedValueOnce({
      id: 'base_uuid_1',
      apiIdentifier: 'llama-3.3-70b',
      name: 'Meta Llama 3.3 70B',
      defaultContextWindow: 8192,
    });
    prisma.model.findUnique.mockResolvedValueOnce(null);
    prisma.modelAdapter.findUnique.mockResolvedValueOnce(null);
    prisma.modelAdapter.create.mockResolvedValueOnce({
      id: 'adapter_uuid_1',
      name: 'Legal Assistant LoRA',
      apiIdentifier: 'llama-3.3-70b:legal-v1',
      adapterPath: 'yoyo-lora/llama-3.3-70b-legal',
      status: AdapterStatus.READY,
      baseModel: {
        id: 'base_uuid_1',
        name: 'Meta Llama 3.3 70B',
        apiIdentifier: 'llama-3.3-70b',
      },
    });

    const res = await service.create('user_1', {
      name: 'Legal Assistant LoRA',
      baseModelId: 'llama-3.3-70b',
      apiIdentifier: 'llama-3.3-70b:legal-v1',
      adapterPath: 'yoyo-lora/llama-3.3-70b-legal',
    });

    expect(res).toBeDefined();
    expect(res.id).toBe('adapter_uuid_1');
    expect(res.apiIdentifier).toBe('llama-3.3-70b:legal-v1');
    expect(prisma.modelAdapter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_1',
          baseModelId: 'base_uuid_1',
          apiIdentifier: 'llama-3.3-70b:legal-v1',
        }),
      })
    );
  });

  it('should throw NotFoundException if base foundation model does not exist', async () => {
    prisma.model.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.create('user_1', {
        name: 'Unknown Base Adapter',
        baseModelId: 'non-existent-model',
        apiIdentifier: 'non-existent-model:adapter-1',
        adapterPath: 'path/to/weights',
      })
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if apiIdentifier conflicts with existing model', async () => {
    prisma.model.findFirst.mockResolvedValueOnce({ id: 'base_1', apiIdentifier: 'llama3.3:8b' });
    prisma.model.findUnique.mockResolvedValueOnce({ id: 'base_1', apiIdentifier: 'llama3.3:8b' });

    await expect(
      service.create('user_1', {
        name: 'Conflicting Name',
        baseModelId: 'llama3.3:8b',
        apiIdentifier: 'llama3.3:8b',
        adapterPath: 'path/to/weights',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('should list all active registered LoRA adapters', async () => {
    prisma.modelAdapter.findMany.mockResolvedValueOnce([
      {
        id: 'ad_1',
        apiIdentifier: 'llama3.3:8b:sql-pro',
        name: 'SQL Pro LoRA',
        baseModel: { apiIdentifier: 'llama3.3:8b' },
      },
    ]);

    const list = await service.findAll();
    expect(list).toHaveLength(1);
    expect(list[0].apiIdentifier).toBe('llama3.3:8b:sql-pro');
  });

  it('should enforce delete permissions for non-owner/non-admin', async () => {
    prisma.modelAdapter.findUnique.mockResolvedValueOnce({
      id: 'ad_1',
      userId: 'user_original_creator',
    });

    await expect(service.delete('user_other', 'ad_1', 'USER')).rejects.toThrow(ForbiddenException);
  });
});
