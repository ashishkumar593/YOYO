import { Module } from '@nestjs/common';
import { InferenceController } from './inference.controller';
import { InferenceService } from './inference.service';
import { OllamaProvider } from './providers/ollama.provider';
import { VllmProvider } from './providers/vllm.provider';
import { MockProvider } from './providers/mock.provider';

@Module({
  controllers: [InferenceController],
  providers: [InferenceService, OllamaProvider, VllmProvider, MockProvider],
  exports: [InferenceService, OllamaProvider, VllmProvider, MockProvider],
})
export class InferenceModule {}


