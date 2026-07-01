import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Severity, TestRunStatus } from '../../generated/prisma/enums.js';

export class CreateTestRunDto {
  @ApiProperty({ example: 'a3f1c2e4-1234-4abc-9def-0123456789ab' })
  @IsUUID()
  testCaseId: string;

  @ApiProperty({ enum: TestRunStatus, example: TestRunStatus.FAIL })
  @IsEnum(TestRunStatus)
  status: TestRunStatus;

  @ApiProperty({ example: 'App crashed on submit', required: false })
  @IsOptional()
  @IsString()
  actualResult?: string;

  @ApiProperty({ example: 'Reproduced on Chrome 124', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ enum: Severity, example: Severity.HIGH, required: false })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @ApiProperty({ example: true, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isBug?: boolean;

  @ApiProperty({
    example: 'Null pointer exception thrown on submit',
    required: false,
  })
  @IsOptional()
  @IsString()
  bugDetails?: string;

  @ApiProperty({
    example: 'a3f1c2e4-1234-4abc-9def-0123456789ab',
    required: false,
    description: 'id of a previous FAILed run this run is a retest of',
  })
  @IsOptional()
  @IsUUID()
  retestOfRunId?: string;
}
