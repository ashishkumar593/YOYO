import { Module } from '@nestjs/common';
import { InferenceController } from './inference.controller';
import { InferenceService } from './inference.service';
import { OllamaProvider } from './providers/ollama.provider';
import { VllmProvider } from './providers/vllm.provider';
import { MockProvider } from './providers/mock.provider';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { GuardrailsModule } from '../guardrails/guardrails.module';

@Module({
  imports: [TelemetryModule, GuardrailsModule],
  controllers: [InferenceController],
  providers: [InferenceService, OllamaProvider, VllmProvider, MockProvider],
  exports: [InferenceService, OllamaProvider, VllmProvider, MockProvider],
})
export class InferenceModule {}


