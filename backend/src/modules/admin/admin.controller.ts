import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserStatus } from '@prisma/client';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('workers')
  async getWorkers() {
    return this.adminService.getWorkers();
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminService.getUsers(pageNum, limitNum);
  }

  @Patch('users/:id/status')
  async setStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus
  ) {
    return this.adminService.updateUserStatus(id, status);
  }

  @Patch('users/:id/quota')
  async setQuota(
    @Param('id') id: string,
    @Body('monthlyTokenLimit') limit: number
  ) {
    return this.adminService.updateUserQuota(id, limit);
  }
}

