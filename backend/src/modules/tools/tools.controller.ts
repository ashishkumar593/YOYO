import {
  Controller,
  Get,
  Post,
  Body,
} from '@nestjs/common';
import { ToolsService } from './tools.service';

@Controller('api/tools')
export class ToolsController {
  constructor(private toolsService: ToolsService) {}

  @Get('catalog')
  getCatalog() {
    return {
      tools: this.toolsService.getToolDefinitions(),
    };
  }

  @Post('execute')
  executeTool(@Body() body: { name: string; args: Record<string, any> }) {
    return this.toolsService.executeTool(body.name, body.args);
  }

  @Post('agent-loop')
  runAgentLoop(
    @Body()
    body: {
      goal: string;
      model?: string;
      allowedTools?: string[];
    }
  ) {
    return this.toolsService.runAgentLoop(
      body.goal,
      body.model,
      body.allowedTools
    );
  }
}
