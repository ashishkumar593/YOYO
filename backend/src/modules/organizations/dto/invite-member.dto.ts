import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { OrgRole } from '@prisma/client';

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(OrgRole)
  role: OrgRole;
}
