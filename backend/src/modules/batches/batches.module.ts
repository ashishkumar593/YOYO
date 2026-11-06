import { Module } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { BatchesController } from './batches.controller';
import { FilesController } from './files.controller';
import { InferenceModule } from '../inference/inference.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [InferenceModule, ApiKeysModule, WebhooksModule],
  controllers: [BatchesController, FilesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}
