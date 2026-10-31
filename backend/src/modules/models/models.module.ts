import { Module, Global } from '@nestjs/common';
import { ModelsService } from './models.service';
import { ModelsController } from './models.controller';

@Global()
@Module({
  controllers: [ModelsController],
  providers: [ModelsService],
  exports: [ModelsService],
})
export class ModelsModule {}

