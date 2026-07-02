import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ProjectType } from '../../generated/prisma/enums.js';

export class CreateProjectDto {
  @ApiProperty({ example: 'Mobile Banking App' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ProjectType, example: ProjectType.WEB })
  @IsEnum(ProjectType)
  type: ProjectType;

  @ApiProperty({
    example: 'QA tracking for the mobile banking web app',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'BANK', required: false })
  @IsOptional()
  @IsString()
  jiraProjectKey?: string;

  @ApiProperty({
    example: 'https://yourcompany.atlassian.net',
    required: false,
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  jiraBaseUrl?: string;

  @ApiProperty({ example: 'jane.doe@company.com' })
  @IsEmail()
  jiraEmail: string;

  @ApiProperty({ example: 'ATATT3xFfGF0...', required: false })
  @IsOptional()
  @IsString()
  jiraApiToken?: string;
}
