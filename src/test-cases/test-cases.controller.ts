import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TestCasesService } from './test-cases.service';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { FindTestCasesQueryDto } from './dto/find-test-cases-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('test-cases')
@ApiBearerAuth()
@Controller('test-cases')
export class TestCasesController {
  constructor(private readonly testCasesService: TestCasesService) {}

  @Post()
  @Roles(Role.LEAD, Role.TESTER)
  @ApiOperation({ summary: 'Create a test case (Lead/Tester only)' })
  create(
    @Body() dto: CreateTestCaseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.testCasesService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List test cases for a project' })
  findByProject(@Query() query: FindTestCasesQueryDto) {
    return this.testCasesService.findByProject(query.projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single test case with full details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.testCasesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.LEAD, Role.TESTER)
  @ApiOperation({ summary: 'Update a test case (Lead/Tester only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestCaseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.testCasesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(Role.LEAD)
  @ApiOperation({ summary: 'Delete a test case (Lead only)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.testCasesService.remove(id, user.id);
  }
}
