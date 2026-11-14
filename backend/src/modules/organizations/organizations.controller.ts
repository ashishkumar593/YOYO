import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-org.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user.id, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.organizationsService.findAllForUser(user.id);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.organizationsService.findOne(user.id, id);
  }

  @Post(':id/members')
  async inviteMember(
    @CurrentUser() user: any,
    @Param('id') orgId: string,
    @Body() dto: InviteMemberDto
  ) {
    return this.organizationsService.inviteMember(user.id, orgId, dto);
  }

  @Patch(':id/members/:memberId')
  async updateMemberRole(
    @CurrentUser() user: any,
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto
  ) {
    return this.organizationsService.updateMemberRole(user.id, orgId, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @CurrentUser() user: any,
    @Param('id') orgId: string,
    @Param('memberId') memberId: string
  ) {
    return this.organizationsService.removeMember(user.id, orgId, memberId);
  }

  @Get(':id/projects')
  async listProjects(@CurrentUser() user: any, @Param('id') orgId: string) {
    return this.organizationsService.listProjects(user.id, orgId);
  }

  @Post(':id/projects')
  async createProject(
    @CurrentUser() user: any,
    @Param('id') orgId: string,
    @Body() dto: CreateProjectDto
  ) {
    return this.organizationsService.createProject(user.id, orgId, dto);
  }
}

