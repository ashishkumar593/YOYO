import { Controller, Get, Param } from '@nestjs/common';
import { ModelsService } from './models.service';

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
  async getCatalog() {
    return this.modelsService.listCatalog();
  }
}

