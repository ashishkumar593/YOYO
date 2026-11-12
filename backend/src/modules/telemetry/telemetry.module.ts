import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [TelemetryController],
  providers: [TelemetryService, MetricsService],
  exports: [TelemetryService, MetricsService],
})
export class TelemetryModule {}

