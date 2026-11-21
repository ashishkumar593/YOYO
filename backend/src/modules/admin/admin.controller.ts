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
import { CircuitBreakerRegistry } from '../inference/resilience/circuit-breaker';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
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

  @Get('circuit-breakers')
  async getCircuitBreakers() {
    return CircuitBreakerRegistry.getInstance().getAllStatus();
  }

  @Post('circuit-breakers/reset')
  async resetCircuitBreakers() {
    CircuitBreakerRegistry.getInstance().resetAll();
    return { success: true, message: 'All circuit breakers reset to CLOSED' };
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') query?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 25;
    return this.adminService.getUsers(pageNum, limitNum, query, status, sortBy);
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

  @Post('users/:id/credit')
  async setCredit(
    @Param('id') id: string,
    @Body() body: { balanceUsd: number; reason?: string; mode?: 'set' | 'adjust' }
  ) {
    return this.adminService.updateUserCredit(id, body.balanceUsd, {
      reason: body.reason,
      mode: body.mode,
    });
  }

  @Get('users/:id/billing')
  async getUserBilling(@Param('id') id: string) {
    return this.adminService.getUserBillingDetails(id);
  }

  @Patch('users/:id/billing-settings')
  async updateBillingSettings(
    @Param('id') id: string,
    @Body() body: { autoRecharge?: boolean; monthlyTokenLimit?: number; status?: UserStatus }
  ) {
    return this.adminService.updateBillingSettings(id, body);
  }

  @Get('billing/overview')
  async getBillingOverview() {
    return this.adminService.getBillingSummary();
  }

  @Post('users/:id/reset-usage')
  async resetUsage(@Param('id') id: string) {
    return this.adminService.resetUserUsage(id);
  }
}

