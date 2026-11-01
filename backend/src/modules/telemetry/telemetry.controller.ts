import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class TelemetryController {
  constructor(private telemetryService: TelemetryService) {}

  // Public Platform Status API
  @Get('api/telemetry/status')
  async getStatus() {
    return this.telemetryService.getPublicSystemStatus();
  }

  @Get('api/usage/summary')
  @UseGuards(JwtAuthGuard)
  async getSummary(@CurrentUser() user: any) {
    return this.telemetryService.getUserUsageSummary(user.id);
  }

  @Get('api/usage/requests')
  @UseGuards(JwtAuthGuard)
  async getRequests(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('model') model?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.telemetryService.getRecentRequests(user.id, limitNum, status, model);
  }
}


