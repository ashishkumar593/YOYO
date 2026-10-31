import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/usage')
@UseGuards(JwtAuthGuard)
export class TelemetryController {
  constructor(private telemetryService: TelemetryService) {}

  @Get('summary')
  async getSummary(@CurrentUser() user: any) {
    return this.telemetryService.getUserUsageSummary(user.id);
  }

  @Get('requests')
  async getRequests(
    @CurrentUser() user: any,
    @Query('limit') limit?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.telemetryService.getRecentRequests(user.id, limitNum);
  }
}

