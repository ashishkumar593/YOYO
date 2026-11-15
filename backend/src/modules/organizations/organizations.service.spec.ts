import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../database/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrgRole } from '@prisma/client';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      organization: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      organizationMember: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      project: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('should create an organization with OWNER membership and default project', async () => {
    prisma.organization.findUnique.mockResolvedValueOnce(null);
    prisma.organization.create.mockResolvedValueOnce({
      id: 'org_1',
      name: 'Acme AI Corp',
      slug: 'acme-ai-corp',
      members: [{ userId: 'user_1', role: OrgRole.OWNER }],
      projects: [{ id: 'proj_1', name: 'Default Project', slug: 'default' }],
    });

    const res = await service.create('user_1', { name: 'Acme AI Corp' });

    expect(res).toBeDefined();
    expect(res.id).toBe('org_1');
    expect(prisma.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Acme AI Corp',
          slug: 'acme-ai-corp',
          members: {
            create: { userId: 'user_1', role: OrgRole.OWNER },
          },
        }),
      })
    );
  });

  it('should list all organizations for a user with member and project counts', async () => {
    prisma.organizationMember.findMany.mockResolvedValueOnce([
      {
        id: 'mem_1',
        role: OrgRole.OWNER,
        organization: {
          id: 'org_1',
          name: 'Acme Corp',
          slug: 'acme-corp',
          members: [{ id: 'mem_1' }, { id: 'mem_2' }],
          projects: [{ id: 'proj_1' }],
        },
      },
    ]);

    const res = await service.findAllForUser('user_1');

    expect(res).toHaveLength(1);
    expect(res[0].name).toBe('Acme Corp');
    expect(res[0].userRole).toBe(OrgRole.OWNER);
    expect(res[0].memberCount).toBe(2);
    expect(res[0].projectCount).toBe(1);
  });

  it('should throw ForbiddenException if user is not a member when viewing org', async () => {
    prisma.organizationMember.findUnique.mockResolvedValueOnce(null);

    await expect(service.findOne('user_outsider', 'org_1')).rejects.toThrow(ForbiddenException);
  });

  it('should invite a new member if caller is OWNER or ADMIN', async () => {
    prisma.organizationMember.findUnique
      .mockResolvedValueOnce({ role: OrgRole.OWNER }) // Caller membership check
      .mockResolvedValueOnce(null); // Target not yet member

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user_colleague',
      email: 'colleague@acme.com',
    });

    prisma.organizationMember.create.mockResolvedValueOnce({
      id: 'mem_new',
      organizationId: 'org_1',
      userId: 'user_colleague',
      role: OrgRole.DEVELOPER,
      user: { id: 'user_colleague', email: 'colleague@acme.com' },
    });

    const res = await service.inviteMember('user_1', 'org_1', {
      email: 'colleague@acme.com',
      role: OrgRole.DEVELOPER,
    });

    expect(res.id).toBe('mem_new');
    expect(res.role).toBe(OrgRole.DEVELOPER);
  });

  it('should prevent non-admin/non-owner from inviting team members', async () => {
    prisma.organizationMember.findUnique.mockResolvedValueOnce({ role: OrgRole.DEVELOPER });

    await expect(
      service.inviteMember('user_dev', 'org_1', {
        email: 'friend@acme.com',
        role: OrgRole.DEVELOPER,
      })
    ).rejects.toThrow(ForbiddenException);
  });

  it('should prevent demoting the only remaining Owner', async () => {
    prisma.organizationMember.findUnique
      .mockResolvedValueOnce({ role: OrgRole.OWNER }) // caller is owner
      .mockResolvedValueOnce({ id: 'mem_target', organizationId: 'org_1', role: OrgRole.OWNER }); // target is owner

    prisma.organizationMember.count.mockResolvedValueOnce(1); // only 1 owner remaining

    await expect(
      service.updateMemberRole('user_1', 'org_1', 'mem_target', { role: OrgRole.DEVELOPER })
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow Owner or Admin to remove a member', async () => {
    prisma.organizationMember.findUnique
      .mockResolvedValueOnce({ role: OrgRole.ADMIN }) // caller is admin
      .mockResolvedValueOnce({ id: 'mem_target', organizationId: 'org_1', role: OrgRole.DEVELOPER });

    prisma.organizationMember.delete.mockResolvedValueOnce({ id: 'mem_target' });

    const res = await service.removeMember('user_admin', 'org_1', 'mem_target');

    expect(res.success).toBe(true);
    expect(prisma.organizationMember.delete).toHaveBeenCalledWith({ where: { id: 'mem_target' } });
  });

  it('should block BILLING_VIEWER from creating projects', async () => {
    prisma.organizationMember.findUnique.mockResolvedValueOnce({ role: OrgRole.BILLING_VIEWER });

    await expect(
      service.createProject('user_billing', 'org_1', { name: 'New Service' })
    ).rejects.toThrow(ForbiddenException);
  });

  describe('Enterprise SSO Management', () => {
    it('should throw ForbiddenException if user is not a member when fetching SSO config', async () => {
      prisma.organizationMember.findUnique.mockResolvedValueOnce(null);

      await expect(service.getSsoConfig('user_outsider', 'org_1')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should return SSO config for organization member', async () => {
      prisma.organizationMember.findUnique.mockResolvedValueOnce({ role: OrgRole.DEVELOPER });
      prisma.organization.findUnique.mockResolvedValueOnce({
        id: 'org_1',
        name: 'Acme',
        slug: 'acme',
        ssoEnabled: true,
        ssoProvider: 'SAML',
        ssoDomain: 'acme.com',
      });

      const config = await service.getSsoConfig('user_dev', 'org_1');
      expect(config.ssoEnabled).toBe(true);
      expect(config.ssoProvider).toBe('SAML');
      expect(config.ssoDomain).toBe('acme.com');
    });

    it('should throw ForbiddenException if non-admin/owner tries to update SSO config', async () => {
      prisma.organizationMember.findUnique.mockResolvedValueOnce({ role: OrgRole.DEVELOPER });

      await expect(
        service.updateSsoConfig('user_dev', 'org_1', { ssoEnabled: true })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Owner to update SSO config', async () => {
      prisma.organizationMember.findUnique.mockResolvedValueOnce({ role: OrgRole.OWNER });
      prisma.organization.update.mockResolvedValueOnce({
        id: 'org_1',
        name: 'Acme',
        slug: 'acme',
        ssoEnabled: true,
        ssoProvider: 'OKTA',
        ssoDomain: 'acme.com',
      });

      const updated = await service.updateSsoConfig('user_owner', 'org_1', {
        ssoEnabled: true,
        ssoProvider: 'OKTA',
        ssoDomain: 'ACME.COM ',
      });

      expect(updated.ssoEnabled).toBe(true);
      expect(updated.ssoProvider).toBe('OKTA');
      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'org_1' },
          data: expect.objectContaining({ ssoDomain: 'acme.com', ssoProvider: 'OKTA' }),
        })
      );
    });
  });
});

