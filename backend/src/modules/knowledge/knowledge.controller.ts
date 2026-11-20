import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';

@Controller('api/knowledge')
export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  @Get('documents')
  listDocuments() {
    return this.knowledgeService.listDocuments();
  }

  @Post('documents')
  addDocument(
    @Body() body: { title: string; content: string; category?: string }
  ) {
    return this.knowledgeService.addDocument(body.title, body.content, body.category);
  }

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string) {
    return { success: this.knowledgeService.deleteDocument(id) };
  }

  @Post('query')
  queryKnowledge(
    @Body() body: { query: string; topK?: number; model?: string }
  ) {
    return this.knowledgeService.queryKnowledge(body.query, body.topK, body.model);
  }
}
