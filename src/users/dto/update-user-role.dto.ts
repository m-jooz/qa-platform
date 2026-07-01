import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: Role, example: Role.LEAD })
  @IsEnum(Role)
  role: Role;
}
