import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JiraService } from './jira.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { FindJiraTasksQueryDto } from './dto/find-jira-tasks-query.dto';

@ApiTags('jira')
@ApiBearerAuth()
@Controller('jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Post(':projectId/sync')
  @Roles(Role.ADMIN, Role.LEAD)
  @ApiOperation({
    summary:
      'Pull tasks from Jira and save/update jira_tasks (Admin/Lead only)',
  })
  sync(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jiraService.sync(projectId, user.id);
  }

  @Get(':projectId/tasks')
  @ApiOperation({
    summary:
      'List Jira tasks for a project with an unseen badge (paginated, searchable)',
  })
  listTasks(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FindJiraTasksQueryDto,
  ) {
    return this.jiraService.listTasks(projectId, user.id, query);
  }

  @Get(':projectId/tasks/:taskId')
  @ApiOperation({ summary: 'Get a single Jira task' })
  getTask(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jiraService.getTask(projectId, taskId, user.id);
  }

  @Post(':projectId/tasks/:taskId/seen')
  @ApiOperation({ summary: 'Mark a Jira task as seen by the current user' })
  markSeen(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jiraService.markSeen(projectId, taskId, user.id);
  }
}
