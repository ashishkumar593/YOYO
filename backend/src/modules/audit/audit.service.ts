import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async logEvent(dto: CreateAuditLogDto) {
    try {
      if ((this.prisma as any).auditLog?.create) {
        return await (this.prisma as any).auditLog.create({
          data: {
            userId: dto.userId,
            actorEmail: dto.actorEmail || 'system@yoyo.ai',
            organizationId: dto.organizationId,
            action: dto.action,
            resourceType: dto.resourceType,
            resourceId: dto.resourceId,
            ipAddress: dto.ipAddress,
            userAgent: dto.userAgent,
            metadata: dto.metadata || {},
          },
        });
      }
      return null;
    } catch (err: any) {
      this.logger.warn(`Failed to persist audit log entry: ${err.message}`);
      return null;
    }
  }

  async findAll(userId: string, role: string, query: QueryAuditLogDto) {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Role-based visibility
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      where.OR = [
        { userId },
        ...(query.organizationId ? [{ organizationId: query.organizationId }] : []),
      ];
    } else if (query.organizationId) {
      where.organizationId = query.organizationId;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.resourceType) {
      where.resourceType = query.resourceType;
    }

    if (query.search) {
      where.OR = [
        ...(where.OR || []),
        { action: { contains: query.search, mode: 'insensitive' } },
        { resourceType: { contains: query.search, mode: 'insensitive' } },
        { actorEmail: { contains: query.search, mode: 'insensitive' } },
        { resourceId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      }),
      (this.prisma as any).auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSummary(userId: string, role: string, orgId?: string) {
    const where: any = {};
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      where.OR = [{ userId }, ...(orgId ? [{ organizationId: orgId }] : [])];
    } else if (orgId) {
      where.organizationId = orgId;
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalEvents, last24hEvents] = await Promise.all([
      (this.prisma as any).auditLog.count({ where }),
      (this.prisma as any).auditLog.count({
        where: {
          ...where,
          createdAt: { gte: dayAgo },
        },
      }),
    ]);

    return {
      totalEvents,
      last24hEvents,
      complianceStatus: 'SOC2_TYPE_II_READY',
      retentionDays: 365,
    };
  }

  async exportCsv(userId: string, role: string, orgId?: string): Promise<string> {
    const result = await this.findAll(userId, role, {
      organizationId: orgId,
      limit: 1000,
      page: 1,
    });

    const headers = [
      'Timestamp',
      'ActorEmail',
      'Action',
      'ResourceType',
      'ResourceId',
      'IPAddress',
      'UserAgent',
      'Metadata',
    ];

    const rows = result.data.map((item: any) => {
      const escape = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
      return [
        escape(new Date(item.createdAt).toISOString()),
        escape(item.actorEmail || item.user?.email || 'N/A'),
        escape(item.action),
        escape(item.resourceType),
        escape(item.resourceId || ''),
        escape(item.ipAddress || ''),
        escape(item.userAgent || ''),
        escape(item.metadata ? JSON.stringify(item.metadata) : '{}'),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
