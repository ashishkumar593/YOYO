import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrgRole } from '@prisma/client';

export class UpdateMemberDto {
  @IsEnum(OrgRole)
  @IsNotEmpty()
  role: OrgRole;
}

