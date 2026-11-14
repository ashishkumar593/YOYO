import { IsString, MinLength, MaxLength, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAdapterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  baseModelId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  apiIdentifier: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  adapterPath: string;

  @IsOptional()
  @IsString()
  description?: string;
}
