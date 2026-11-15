import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { FineTuningService } from './fine-tuning.service';
import { CreateFineTuningJobDto } from './dto/create-fine-tuning-job.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@Controller('v1/fine_tuning/jobs')
@UseGuards(ApiKeyGuard)
export class FineTuningController {
  constructor(private fineTuningService: FineTuningService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async createJob(@Req() req: FastifyRequest, @Body() dto: CreateFineTuningJobDto) {
    const user = (req as any).user;
    const organizationId = (req as any).organizationId;
    return this.fineTuningService.createJob(user.id, dto, organizationId);
  }

  @Get()
  async listJobs(
    @Req() req: FastifyRequest,
    @Query('limit') limit?: string
  ) {
    const user = (req as any).user;
    const organizationId = (req as any).organizationId;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.fineTuningService.listJobs(user.id, limitNum, organizationId);
  }

  @Get(':id')
  async getJob(@Req() req: FastifyRequest, @Param('id') id: string) {
    const user = (req as any).user;
    const organizationId = (req as any).organizationId;
    return this.fineTuningService.getJob(user.id, id, organizationId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelJob(@Req() req: FastifyRequest, @Param('id') id: string) {
    const user = (req as any).user;
    const organizationId = (req as any).organizationId;
    return this.fineTuningService.cancelJob(user.id, id, organizationId);
  }

  @Get(':id/events')
  async listEvents(@Req() req: FastifyRequest, @Param('id') id: string) {
    const user = (req as any).user;
    const organizationId = (req as any).organizationId;
    return this.fineTuningService.listEvents(user.id, id, organizationId);
  }
}
