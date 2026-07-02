import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TestRunsService } from './test-runs.service';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { ApproveBugDto } from './dto/approve-bug.dto';
import { RejectBugDto } from './dto/reject-bug.dto';
import { FindTestRunsQueryDto } from './dto/find-test-runs-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('test-runs')
@ApiBearerAuth()
@Controller('test-runs')
export class TestRunsController {
  constructor(private readonly testRunsService: TestRunsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LEAD, Role.TESTER)
  @ApiOperation({ summary: 'Submit a test run result' })
  create(
    @Body() dto: CreateTestRunDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.testRunsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List test runs for a test case (paginated)' })
  findByTestCase(@Query() query: FindTestRunsQueryDto) {
    return this.testRunsService.findByTestCase(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single test run with full details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.testRunsService.findOne(id);
  }

  @Patch(':id/bug/approve')
  @Roles(Role.ADMIN, Role.LEAD)
  @ApiOperation({
    summary: 'Approve a bug report and sync it to Jira (Lead/Admin only)',
  })
  approveBug(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveBugDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.testRunsService.approveBug(id, dto, user.id);
  }

  @Patch(':id/bug/reject')
  @Roles(Role.ADMIN, Role.LEAD)
  @ApiOperation({ summary: 'Reject a bug report (Lead/Admin only)' })
  rejectBug(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectBugDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.testRunsService.rejectBug(id, dto, user.id);
  }
}
