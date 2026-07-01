import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import {
  Platform,
  Priority,
  TestRunStatus,
} from '../../generated/prisma/enums.js';

export class ReportFiltersDto {
  @ApiProperty({ enum: Platform, required: false })
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @ApiProperty({ enum: Priority, required: false })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiProperty({ enum: TestRunStatus, required: false })
  @IsOptional()
  @IsEnum(TestRunStatus)
  status?: TestRunStatus;

  @ApiProperty({ example: '2026-01-01', required: false })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ example: '2026-12-31', required: false })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
