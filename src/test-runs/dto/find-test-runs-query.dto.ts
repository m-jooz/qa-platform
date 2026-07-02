import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindTestRunsQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: 'a3f1c2e4-1234-4abc-9def-0123456789ab' })
  @IsUUID()
  testCaseId: string;
}
