import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAdapterDto } from './dto/create-adapter.dto';
import { AdapterStatus } from '@prisma/client';

@Injectable()
export class AdaptersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateAdapterDto) {
    // 1. Verify base foundation model exists
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.baseModelId);
    const baseModel = await this.prisma.model.findFirst({
      where: isUuid
        ? { OR: [{ id: dto.baseModelId }, { apiIdentifier: dto.baseModelId }] }
        : { apiIdentifier: dto.baseModelId },
    });

    if (!baseModel) {
      throw new NotFoundException(`Base model '${dto.baseModelId}' does not exist.`);
    }

    // 2. Check identifier collisions
    const existingModel = await this.prisma.model.findUnique({
      where: { apiIdentifier: dto.apiIdentifier },
    });
    if (existingModel) {
      throw new BadRequestException(
        `API identifier '${dto.apiIdentifier}' conflicts with an existing base foundation model.`
      );
    }

    const existingAdapter = await this.prisma.modelAdapter.findUnique({
      where: { apiIdentifier: dto.apiIdentifier },
    });
    if (existingAdapter) {
      throw new BadRequestException(
        `LoRA adapter with identifier '${dto.apiIdentifier}' is already registered.`
      );
    }

    const adapter = await this.prisma.modelAdapter.create({
      data: {
        userId,
        baseModelId: baseModel.id,
        name: dto.name,
        apiIdentifier: dto.apiIdentifier,
        adapterPath: dto.adapterPath,
        description: dto.description,
        status: AdapterStatus.READY,
      },
      include: {
        baseModel: {
          select: {
            id: true,
            name: true,
            apiIdentifier: true,
            defaultContextWindow: true,
          },
        },
      },
    });

    (this.prisma as any).auditLog?.create?.({
      data: {
        userId,
        action: 'ADAPTER_REGISTERED',
        resourceType: 'ModelAdapter',
        resourceId: adapter.id,
        metadata: { name: dto.name, apiIdentifier: dto.apiIdentifier, baseModelId: dto.baseModelId },
      },
    }).catch(() => {});

    return adapter;
  }

  async findAll() {
    return this.prisma.modelAdapter.findMany({
      where: { isActive: true },
      include: {
        baseModel: {
          select: {
            id: true,
            name: true,
            apiIdentifier: true,
            defaultContextWindow: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const adapter = await this.prisma.modelAdapter.findUnique({
      where: { id },
      include: {
        baseModel: true,
      },
    });

    if (!adapter) {
      throw new NotFoundException(`Model adapter '${id}' not found.`);
    }

    return adapter;
  }

  async findByApiIdentifier(apiIdentifier: string) {
    return this.prisma.modelAdapter.findUnique({
      where: { apiIdentifier },
      include: {
        baseModel: true,
      },
    });
  }

  async delete(userId: string, id: string, userRole?: string) {
    const adapter = await this.prisma.modelAdapter.findUnique({
      where: { id },
    });

    if (!adapter) {
      throw new NotFoundException(`Model adapter '${id}' not found.`);
    }

    if (adapter.userId && adapter.userId !== userId && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You do not have permission to delete this adapter.');
    }

    await this.prisma.modelAdapter.delete({
      where: { id },
    });

    (this.prisma as any).auditLog?.create?.({
      data: {
        userId,
        action: 'ADAPTER_DELETED',
        resourceType: 'ModelAdapter',
        resourceId: id,
        metadata: { name: adapter.name, apiIdentifier: adapter.apiIdentifier },
      },
    }).catch(() => {});

    return { success: true, message: `Adapter '${adapter.name}' successfully unregistered.` };
  }
}
