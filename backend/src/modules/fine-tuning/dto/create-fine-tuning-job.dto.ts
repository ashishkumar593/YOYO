import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateFineTuningJobDto {
  @IsString()
  @IsNotEmpty()
  model: string;

  @IsString()
  @IsNotEmpty()
  training_file: string;

  @IsOptional()
  @IsString()
  validation_file?: string;

  @IsOptional()
  @IsObject()
  hyperparameters?: {
    n_epochs?: number;
    batch_size?: number;
    learning_rate_multiplier?: number;
  };

  @IsOptional()
  @IsString()
  suffix?: string;
}
