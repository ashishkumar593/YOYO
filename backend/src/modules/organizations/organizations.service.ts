import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrganizationDto } from './dto/create-org.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { OrgRole } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(userId: string, dto: CreateOrganizationDto) {
    let baseSlug = dto.slug || this.slugify(dto.name);
    if (!baseSlug) baseSlug = `org-${Date.now()}`;

    // Ensure unique slug
    let finalSlug = baseSlug;
    let counter = 1;
    while (await this.prisma.organization.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const org = await this.prisma.$transaction(async (tx) => {
      const createdOrg = await tx.organization.create({
        data: {
          name: dto.name,
          slug: finalSlug,
          members: {
            create: {
              userId,
              role: OrgRole.OWNER,
            },
          },
          projects: {
            create: {
              name: 'Default Project',
              slug: 'default',
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  profile: true,
                },
              },
            },
          },
          projects: true,
        },
      });

      return createdOrg;
    });

    return org;
  }

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: true,
                  },
                },
              },
            },
            projects: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      ...m.organization,
      userRole: m.role,
      memberCount: m.organization.members.length,
      projectCount: m.organization.projects.length,
    }));
  }

  async findOne(userId: string, orgId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization.');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        projects: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found.');
    }

    return {
      ...org,
      userRole: membership.role,
    };
  }

  async inviteMember(callerId: string, orgId: string, dto: InviteMemberDto) {
    const callerMembership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: callerId,
        },
      },
    });

    if (!callerMembership || (callerMembership.role !== OrgRole.OWNER && callerMembership.role !== OrgRole.ADMIN)) {
      throw new ForbiddenException('Only organization Owners and Admins can invite team members.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!targetUser) {
      throw new NotFoundException(`No user found with email '${dto.email}'. The user must register for YOYO first.`);
    }

    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException(`User '${dto.email}' is already a member of this organization.`);
    }

    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: targetUser.id,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
    });

    return member;
  }

  async updateMemberRole(callerId: string, orgId: string, memberId: string, dto: UpdateMemberDto) {
    const callerMembership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: callerId,
        },
      },
    });

    if (!callerMembership || (callerMembership.role !== OrgRole.OWNER && callerMembership.role !== OrgRole.ADMIN)) {
      throw new ForbiddenException('Only organization Owners and Admins can modify member roles.');
    }

    const targetMember = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      throw new NotFoundException('Member not found in this organization.');
    }

    // Protect last owner
    if (targetMember.role === OrgRole.OWNER && dto.role !== OrgRole.OWNER) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: OrgRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot demote the only remaining Owner of the organization.');
      }
    }

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
    });
  }

  async removeMember(callerId: string, orgId: string, memberId: string) {
    const callerMembership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: callerId,
        },
      },
    });

    if (!callerMembership) {
      throw new ForbiddenException('You do not have access to this organization.');
    }

    const targetMember = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      throw new NotFoundException('Member not found in this organization.');
    }

    // Allow self-removal or Owner/Admin removal
    const isSelf = targetMember.userId === callerId;
    const canManage = callerMembership.role === OrgRole.OWNER || callerMembership.role === OrgRole.ADMIN;

    if (!isSelf && !canManage) {
      throw new ForbiddenException('Only Owners or Admins can remove other team members.');
    }

    if (targetMember.role === OrgRole.OWNER) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: OrgRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the only remaining Owner of the organization.');
      }
    }

    await this.prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return { success: true, message: 'Member successfully removed.' };
  }

  async listProjects(userId: string, orgId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization.');
    }

    return this.prisma.project.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createProject(userId: string, orgId: string, dto: CreateProjectDto) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!membership || membership.role === OrgRole.BILLING_VIEWER) {
      throw new ForbiddenException('Billing viewers cannot create projects.');
    }

    let baseSlug = dto.slug || this.slugify(dto.name);
    if (!baseSlug) baseSlug = `proj-${Date.now()}`;

    let finalSlug = baseSlug;
    let counter = 1;
    while (
      await this.prisma.project.findUnique({
        where: {
          organizationId_slug: {
            organizationId: orgId,
            slug: finalSlug,
          },
        },
      })
    ) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    return this.prisma.project.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        slug: finalSlug,
      },
    });
  }
}
