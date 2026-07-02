import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  Platform,
  Priority,
  TestCaseType,
} from '../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindTestCasesQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: 'a3f1c2e4-1234-4abc-9def-0123456789ab' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ enum: Platform })
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ enum: TestCaseType })
  @IsOptional()
  @IsEnum(TestCaseType)
  type?: TestCaseType;
}
