import { Module } from '@nestjs/common';
import { InferenceController } from './inference.controller';
import { InferenceService } from './inference.service';
import { OllamaProvider } from './providers/ollama.provider';
import { MockProvider } from './providers/mock.provider';

@Module({
  controllers: [InferenceController],
  providers: [InferenceService, OllamaProvider, MockProvider],
  exports: [InferenceService, OllamaProvider, MockProvider],
})
export class InferenceModule {}

