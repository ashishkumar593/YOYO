import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { InferenceService } from './inference.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import {
  ChatCompletionRequest,
  EmbeddingRequest,
  RerankRequest,
} from '../../common/types/openai.types';

@Controller('v1')
@UseGuards(ApiKeyGuard)
export class InferenceController {
  constructor(private inferenceService: InferenceService) {}

  @Post('chat/completions')
  @HttpCode(HttpStatus.OK)
  async chatCompletions(
    @Body() body: ChatCompletionRequest,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply
  ) {
    const user = (req as any).user;
    const apiKey = (req as any).apiKey;

    // Check if streaming response requested
    if (body.stream) {
      const abortController = new AbortController();

      req.raw.on('close', () => {
        abortController.abort();
      });

      // Set Server-Sent Events headers
      res.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.raw.setHeader('Cache-Control', 'no-cache, no-transform');
      res.raw.setHeader('Connection', 'keep-alive');
      res.raw.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx/proxy buffering
      res.raw.setHeader('x-yoyo-zero-data-retention', 'true');

      try {
        const stream = this.inferenceService.chatCompletionStream(
          body,
          abortController.signal,
          user,
          apiKey
        );

        for await (const chunk of stream) {
          if (res.raw.destroyed) break;
          res.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        res.raw.write('data: [DONE]\n\n');
        res.raw.end();
      } catch (err: any) {
        res.raw.write(
          `data: ${JSON.stringify({ error: { message: err.message, code: 500 } })}\n\n`
        );
        res.raw.end();
      }
      return;
    }

    // Standard non-streaming JSON response
    const result = await this.inferenceService.chatCompletion(body, user, apiKey);
    res.header('x-yoyo-zero-data-retention', 'true');
    return res.status(HttpStatus.OK).send(result);
  }

  @Post('embeddings')
  @HttpCode(HttpStatus.OK)
  async embeddings(
    @Body() body: EmbeddingRequest,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    res.header('x-yoyo-zero-data-retention', 'true');
    const user = (req as any).user;
    const apiKey = (req as any).apiKey;
    return this.inferenceService.embeddings(body, user, apiKey);
  }

  @Post('rerank')
  @HttpCode(HttpStatus.OK)
  async rerank(
    @Body() body: RerankRequest,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    res.header('x-yoyo-zero-data-retention', 'true');
    const user = (req as any).user;
    const apiKey = (req as any).apiKey;
    return this.inferenceService.rerank(body, user, apiKey);
  }
}

