import { Module } from '@nestjs/common';
import { FineTuningController } from './fine-tuning.controller';
import { FineTuningService } from './fine-tuning.service';
import { AdaptersModule } from '../adapters/adapters.module';

@Module({
  imports: [AdaptersModule],
  controllers: [FineTuningController],
  providers: [FineTuningService],
  exports: [FineTuningService],
})
export class FineTuningModule {}
