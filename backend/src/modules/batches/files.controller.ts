import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { BatchesService } from './batches.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@Controller('v1/files')
@UseGuards(ApiKeyGuard)
export class FilesController {
  constructor(private batchesService: BatchesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async uploadFile(@Req() req: FastifyRequest, @Body() body: any) {
    const user = (req as any).user;

    // Check if multipart or JSON payload
    let filename = body?.filename || 'batch_input.jsonl';
    let purpose = body?.purpose || 'batch';
    let content = body?.content || body?.file;

    // Handle multipart if available
    if (!content && typeof (req as any).file === 'function') {
      try {
        const data = await (req as any).file();
        if (data) {
          filename = data.filename || filename;
          const buffer = await data.toBuffer();
          content = buffer.toString('utf-8');
        }
      } catch {}
    }

    if (!content) {
      throw new BadRequestException(
        'File content required. Provide JSON payload {"filename": "requests.jsonl", "content": "..."} or multipart.'
      );
    }

    return this.batchesService.uploadFile(user.id, filename, content, purpose);
  }

  @Get()
  async listFiles(@Req() req: FastifyRequest) {
    const user = (req as any).user;
    return this.batchesService.listFiles(user.id);
  }

  @Get(':id')
  async getFile(@Req() req: FastifyRequest, @Param('id') id: string) {
    const user = (req as any).user;
    return this.batchesService.getFile(user.id, id);
  }

  @Get(':id/content')
  async getFileContent(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
    @Res() res: FastifyReply
  ) {
    const user = (req as any).user;
    const content = await this.batchesService.getFileContent(user.id, id);

    res.header('Content-Type', 'application/jsonl');
    res.header('Content-Disposition', `attachment; filename="${id}.jsonl"`);
    return res.send(content);
  }

  @Delete(':id')
  async deleteFile(@Req() req: FastifyRequest, @Param('id') id: string) {
    const user = (req as any).user;
    return this.batchesService.deleteFile(user.id, id);
  }
}
