import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../database/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  const mockLogs = [
    {
      id: 'log-1',
      userId: 'user-1',
      actorEmail: 'dev@yoyo.ai',
      organizationId: 'org-1',
      action: 'API_KEY_CREATED',
      resourceType: 'ApiKey',
      resourceId: 'key-123',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      metadata: { keyName: 'Prod Key', budgetLimitUsd: 100 },
      createdAt: new Date('2026-11-14T10:00:00Z'),
      user: { id: 'user-1', email: 'dev@yoyo.ai' },
    },
    {
      id: 'log-2',
      userId: 'user-1',
      actorEmail: 'dev@yoyo.ai',
      organizationId: 'org-1',
      action: 'ADAPTER_REGISTERED',
      resourceType: 'ModelAdapter',
      resourceId: 'llama-3.3-70b:legal-v1',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      metadata: { baseModelId: 'llama-3.3-70b' },
      createdAt: new Date('2026-11-14T11:00:00Z'),
      user: { id: 'user-1', email: 'dev@yoyo.ai' },
    },
  ];

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'log-new', ...data })),
        findMany: jest.fn().mockResolvedValue(mockLogs),
        count: jest.fn().mockResolvedValue(2),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log an audit event successfully', async () => {
    const result = await service.logEvent({
      userId: 'user-1',
      actorEmail: 'dev@yoyo.ai',
      organizationId: 'org-1',
      action: 'API_KEY_CREATED',
      resourceType: 'ApiKey',
      resourceId: 'key-123',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      metadata: { keyName: 'Test Key' },
    });

    expect(result).toBeDefined();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'API_KEY_CREATED',
        resourceType: 'ApiKey',
        resourceId: 'key-123',
      }),
    });
  });

  it('should safely handle database insertion errors without throwing', async () => {
    prisma.auditLog.create.mockRejectedValueOnce(new Error('DB Connection Timeout'));

    const result = await service.logEvent({
      action: 'CRITICAL_FAILURE_TEST',
      resourceType: 'System',
    });

    expect(result).toBeNull();
  });

  it('should retrieve paginated audit logs for a regular user scoped to their ID/org', async () => {
    const result = await service.findAll('user-1', 'USER', {
      organizationId: 'org-1',
      page: 1,
      limit: 10,
    });

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(1);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ userId: 'user-1' }]),
        }),
      })
    );
  });

  it('should allow admins to view all audit logs without user scope restrictions', async () => {
    await service.findAll('admin-user', 'ADMIN', { page: 1, limit: 10 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
  });

  it('should filter logs by action and resourceType', async () => {
    await service.findAll('admin-user', 'SUPER_ADMIN', {
      action: 'API_KEY_CREATED',
      resourceType: 'ApiKey',
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: 'API_KEY_CREATED',
          resourceType: 'ApiKey',
        }),
      })
    );
  });

  it('should return audit summary statistics including last 24h count', async () => {
    prisma.auditLog.count
      .mockResolvedValueOnce(42) // total
      .mockResolvedValueOnce(15); // last 24h

    const summary = await service.getSummary('user-1', 'USER', 'org-1');

    expect(summary.totalEvents).toBe(42);
    expect(summary.last24hEvents).toBe(15);
    expect(summary.complianceStatus).toBe('SOC2_TYPE_II_READY');
    expect(summary.retentionDays).toBe(365);
  });

  it('should generate a formatted RFC 4180 CSV export with escaped fields', async () => {
    const csv = await service.exportCsv('user-1', 'USER', 'org-1');

    expect(csv).toContain('Timestamp,ActorEmail,Action,ResourceType,ResourceId,IPAddress,UserAgent,Metadata');
    expect(csv).toContain('"API_KEY_CREATED"');
    expect(csv).toContain('"ADAPTER_REGISTERED"');
    expect(csv).toContain('"dev@yoyo.ai"');
  });
});
