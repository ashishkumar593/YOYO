import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { BatchesService } from './batches.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@Controller('v1/batches')
@UseGuards(ApiKeyGuard)
export class BatchesController {
  constructor(private batchesService: BatchesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async createBatch(
    @Req() req: FastifyRequest,
    @Body()
    body: {
      input_file_id: string;
      endpoint?: string;
      completion_window?: string;
      metadata?: any;
    }
  ) {
    const user = (req as any).user;
    return this.batchesService.createBatch(user.id, body);
  }

  @Get()
  async listBatches(@Req() req: FastifyRequest) {
    const user = (req as any).user;
    return this.batchesService.listBatches(user.id);
  }

  @Get(':id')
  async getBatch(@Req() req: FastifyRequest, @Param('id') id: string) {
    const user = (req as any).user;
    return this.batchesService.getBatch(user.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelBatch(@Req() req: FastifyRequest, @Param('id') id: string) {
    const user = (req as any).user;
    return this.batchesService.cancelBatch(user.id, id);
  }
}
