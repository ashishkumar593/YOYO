import { IsNotEmpty, IsString, IsOptional, IsArray, IsInt, Min, Max } from 'class-validator';

export class CreateApiKeyDto {
  @IsNotEmpty({ message: 'A descriptive key name is required.' })
  @IsString()
  name!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedModels?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  rateLimitRpm?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(10000000)
  rateLimitTpm?: number;

  @IsOptional()
  expiresAt?: string;
}

