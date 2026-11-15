import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { GuardrailsService } from './guardrails.service';
import { ModerationRequest, ModerationResponse, GuardrailPolicy } from './guardrails.types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller()
export class GuardrailsController {
  constructor(private readonly guardrailsService: GuardrailsService) {}

  /**
   * OpenAI-compatible Moderation endpoint: POST /v1/moderations
   */
  @Post('v1/moderations')
  @HttpCode(HttpStatus.OK)
  createModeration(@Body() body: ModerationRequest): ModerationResponse {
    if (!body || !body.input) {
      throw new BadRequestException("Request body must include 'input' string or array of strings.");
    }
    return this.guardrailsService.evaluateModeration(body.input, body.model);
  }

  /**
   * Enterprise Policy Management: GET /api/guardrails/policy
   */
  @Get('api/guardrails/policy')
  getPolicy(): GuardrailPolicy {
    return this.guardrailsService.getPolicy();
  }

  /**
   * Enterprise Policy Management: PATCH /api/guardrails/policy
   */
  @Patch('api/guardrails/policy')
  @UseGuards(JwtAuthGuard)
  updatePolicy(@Body() updates: Partial<GuardrailPolicy>): GuardrailPolicy {
    return this.guardrailsService.updatePolicy(updates);
  }

  /**
   * Realtime Sanitize & Redact Preview: POST /api/guardrails/sanitize
   */
  @Post('api/guardrails/sanitize')
  @HttpCode(HttpStatus.OK)
  sanitizeText(@Body() body: { text: string; policy?: Partial<GuardrailPolicy> }) {
    if (!body || typeof body.text !== 'string') {
      throw new BadRequestException("Field 'text' is required.");
    }
    return this.guardrailsService.inspectAndSanitize(body.text, body.policy);
  }
}
