import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  Platform,
  Priority,
  TestCaseType,
} from '../../generated/prisma/enums.js';

export class CreateTestCaseDto {
  @ApiProperty({ example: 'a3f1c2e4-1234-4abc-9def-0123456789ab' })
  @IsUUID()
  projectId: string;

  @ApiProperty({
    example: 'a3f1c2e4-1234-4abc-9def-0123456789ab',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  jiraTaskId?: string;

  @ApiProperty({ example: 'User can log in with valid credentials' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    example: '1. Open login page\n2. Enter valid credentials\n3. Click login',
  })
  @IsNotEmpty()
  @IsString()
  steps: string;

  @ApiProperty({ example: 'User is redirected to the dashboard' })
  @IsNotEmpty()
  @IsString()
  expectedResult: string;

  @ApiProperty({ enum: Platform, example: Platform.WEB })
  @IsEnum(Platform)
  platform: Platform;

  @ApiProperty({ enum: TestCaseType, example: TestCaseType.MANUAL })
  @IsEnum(TestCaseType)
  type: TestCaseType;

  @ApiProperty({ enum: Priority, example: Priority.MEDIUM, required: false })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}
