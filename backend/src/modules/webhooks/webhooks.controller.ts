import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body()
    body: {
      url: string;
      description?: string;
      events?: string[];
    }
  ) {
    return this.webhooksService.createEndpoint(user.id, body);
  }

  @Get()
  async list(@CurrentUser() user: any) {
    return this.webhooksService.listEndpoints(user.id);
  }

  @Get(':id')
  async getOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.getEndpoint(user.id, id);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.deleteEndpoint(user.id, id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  async triggerTestPing(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.triggerTestPing(user.id, id);
  }
}
