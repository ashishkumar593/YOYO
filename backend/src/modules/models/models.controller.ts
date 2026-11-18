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


