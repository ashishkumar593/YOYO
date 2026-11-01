import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserStatus, EngineType } from '@prisma/client';

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

  @Post('workers')
  async registerWorker(
    @Body()
    body: {
      workerName: string;
      endpointUrl: string;
      engineType?: EngineType;
      gpuModelName?: string;
      totalVramBytes?: number;
    }
  ) {
    return this.adminService.registerWorker(body);
  }

  @Delete('workers/:id')
  async deleteWorker(@Param('id') id: string) {
    return this.adminService.deleteWorker(id);
  }

  @Post('workers/:id/deploy')
  async deployModel(
    @Param('id') workerId: string,
    @Body('modelId') modelId: string
  ) {
    return this.adminService.deployModelToWorker(workerId, modelId);
  }

  @Post('workers/:id/verify')
  async verifyWorker(@Param('id') workerId: string) {
    return this.adminService.verifyWorkerHealth(workerId);
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

