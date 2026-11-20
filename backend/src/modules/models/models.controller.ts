import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ModelsService, CreateModelInput, UpdateModelInput } from './models.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller()
export class ModelsController {
  constructor(private modelsService: ModelsService) {}

  // OpenAI-compatible endpoint
  @Get('v1/models')
  async listV1Models() {
    return this.modelsService.listOpenAiModels();
  }

  // OpenAI-compatible endpoint
  @Get('v1/models/:model_id')
  async getV1Model(@Param('model_id') modelId: string) {
    return this.modelsService.getOpenAiModel(modelId);
  }

  // Platform Dashboard catalog endpoint
  @Get('api/models/catalog')
  async getCatalog(@Query('all') all?: string) {
    const includeInactive = all === 'true' || all === '1';
    return this.modelsService.listCatalog(includeInactive);
  }

  // Local Ollama Docker cluster status & installed models
  @Get('api/models/local/status')
  async getLocalStatus() {
    return this.modelsService.getLocalOllamaStatus();
  }

  // Local Ollama model pull with real-time SSE stream progress
  @Post('api/models/local/pull')
  async pullLocalModel(
    @Body() body: { model: string },
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply
  ) {
    res.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    res.raw.setHeader('Connection', 'keep-alive');
    res.raw.setHeader('X-Accel-Buffering', 'no');

    try {
      await this.modelsService.pullLocalModel(body.model, (progress) => {
        if (!res.raw.destroyed) {
          res.raw.write(`data: ${JSON.stringify(progress)}\n\n`);
        }
      });
      if (!res.raw.destroyed) {
        res.raw.write(`data: ${JSON.stringify({ status: 'success', completed: 100, percent: 100 })}\n\n`);
        res.raw.write('data: [DONE]\n\n');
        res.raw.end();
      }
    } catch (err: any) {
      if (!res.raw.destroyed) {
        res.raw.write(`data: ${JSON.stringify({ error: err.message, status: 'error' })}\n\n`);
        res.raw.end();
      }
    }
  }

  // Local Ollama model delete
  @Delete('api/models/local/:model')
  async deleteLocalModel(@Param('model') model: string) {
    return this.modelsService.deleteLocalModel(model);
  }

  // Admin: Create new model in platform catalog
  @Post('api/models')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createModel(@Body() body: CreateModelInput) {
    return this.modelsService.createModel(body);
  }

  // Admin: Update model metadata or state
  @Patch('api/models/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateModel(
    @Param('id') id: string,
    @Body() body: UpdateModelInput
  ) {
    return this.modelsService.updateModel(id, body);
  }

  // Admin: Deactivate model
  @Delete('api/models/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deleteModel(@Param('id') id: string) {
    return this.modelsService.deleteModel(id);
  }
}


