import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import axios, { isAxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { JiraSearchResponse } from './types/jira-issue.type';
import { Project } from '../generated/prisma/client.js';

@Injectable()
export class JiraService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  private async getProjectOrThrow(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
    return project;
  }

  private assertJiraConfigured(project: Project): asserts project is Project & {
    jiraBaseUrl: string;
    jiraEmail: string;
    jiraApiToken: string;
  } {
    if (!project.jiraBaseUrl || !project.jiraEmail || !project.jiraApiToken) {
      throw new BadRequestException(
        'Project is missing Jira configuration (jiraBaseUrl, jiraEmail, jiraApiToken)',
      );
    }
  }

  private jiraBaseUrl(project: { jiraBaseUrl: string }): string {
    return project.jiraBaseUrl.replace(/\/+$/, '');
  }

  /** Jira Cloud requires Basic Auth (email:apiToken), not a Bearer token. */
  private authHeaders(project: { jiraEmail: string; jiraApiToken: string }) {
    const credentials = Buffer.from(
      `${project.jiraEmail}:${project.jiraApiToken}`,
    ).toString('base64');
    return { Authorization: `Basic ${credentials}` };
  }

  /**
   * Builds a diagnostic error message including Jira's HTTP status, its
   * own error body, and the URL that was called, instead of a generic
   * "failed to fetch" message that hides the actual cause.
   */
  private buildJiraErrorMessage(error: unknown, url: string): string {
    if (isAxiosError(error)) {
      if (error.response) {
        const body = error.response.data as
          | { errorMessages?: string[]; errors?: Record<string, string>; message?: string }
          | string
          | undefined;

        let jiraMessage: string;
        if (typeof body === 'string') {
          jiraMessage = body;
        } else if (body?.errorMessages?.length) {
          jiraMessage = body.errorMessages.join('; ');
        } else if (body?.errors && Object.keys(body.errors).length) {
          jiraMessage = Object.entries(body.errors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('; ');
        } else if (body?.message) {
          jiraMessage = body.message;
        } else {
          jiraMessage = error.response.statusText || 'No error body returned';
        }

        return `Failed to fetch tasks from Jira: HTTP ${error.response.status} at ${url} — ${jiraMessage}`;
      }

      return `Failed to fetch tasks from Jira: no response received from ${url} (${error.message})`;
    }

    return `Failed to fetch tasks from Jira: unexpected error calling ${url} (${String(error)})`;
  }

  /** Fetches the current status name of a Jira issue. */
  async getIssueStatus(
    projectId: string,
    jiraKey: string,
  ): Promise<string | null> {
    const project = await this.getProjectOrThrow(projectId);
    this.assertJiraConfigured(project);

    try {
      const response = await axios.get<{
        fields?: { status?: { name?: string } };
      }>(`${this.jiraBaseUrl(project)}/rest/api/2/issue/${jiraKey}`, {
        params: { fields: 'status' },
        headers: this.authHeaders(project),
      });
      return response.data.fields?.status?.name ?? null;
    } catch {
      throw new BadGatewayException('Failed to fetch issue status from Jira');
    }
  }

  /** Adds a comment to a Jira issue and returns the created comment's id. */
  async addComment(
    projectId: string,
    jiraKey: string,
    body: string,
  ): Promise<string> {
    const project = await this.getProjectOrThrow(projectId);
    this.assertJiraConfigured(project);

    try {
      const response = await axios.post<{ id: string }>(
        `${this.jiraBaseUrl(project)}/rest/api/2/issue/${jiraKey}/comment`,
        { body },
        { headers: this.authHeaders(project) },
      );
      return response.data.id;
    } catch {
      throw new BadGatewayException('Failed to add comment on Jira issue');
    }
  }

  /** Transitions a Jira issue to a new status using a transition id. */
  async transitionIssue(
    projectId: string,
    jiraKey: string,
    transitionId: string,
  ): Promise<void> {
    const project = await this.getProjectOrThrow(projectId);
    this.assertJiraConfigured(project);

    try {
      await axios.post(
        `${this.jiraBaseUrl(project)}/rest/api/2/issue/${jiraKey}/transitions`,
        { transition: { id: transitionId } },
        { headers: this.authHeaders(project) },
      );
    } catch {
      throw new BadGatewayException('Failed to transition Jira issue');
    }
  }

  /** Reassigns a Jira issue to another account. */
  async reassignIssue(
    projectId: string,
    jiraKey: string,
    accountId: string,
  ): Promise<void> {
    const project = await this.getProjectOrThrow(projectId);
    this.assertJiraConfigured(project);

    try {
      await axios.put(
        `${this.jiraBaseUrl(project)}/rest/api/2/issue/${jiraKey}`,
        { fields: { assignee: { accountId } } },
        { headers: this.authHeaders(project) },
      );
    } catch {
      throw new BadGatewayException('Failed to reassign Jira issue');
    }
  }

  async sync(projectId: string, userId: string) {
    const project = await this.getProjectOrThrow(projectId);

    if (
      !project.jiraBaseUrl ||
      !project.jiraProjectKey ||
      !project.jiraEmail ||
      !project.jiraApiToken
    ) {
      throw new BadRequestException(
        'Project is missing Jira configuration (jiraBaseUrl, jiraProjectKey, jiraEmail, jiraApiToken)',
      );
    }
    this.assertJiraConfigured(project);

    const searchUrl = `${project.jiraBaseUrl.replace(/\/+$/, '')}/rest/api/2/search`;

    let issues: JiraSearchResponse['issues'];
    try {
      const response = await axios.get<JiraSearchResponse>(searchUrl, {
        params: {
          jql: `project=${project.jiraProjectKey}`,
          fields: 'summary,status,assignee,updated',
          maxResults: 100,
        },
        headers: this.authHeaders(project),
      });
      issues = response.data.issues ?? [];
    } catch (error) {
      throw new BadGatewayException(
        this.buildJiraErrorMessage(error, searchUrl),
      );
    }

    const syncedTasks = await Promise.all(
      issues.map((issue) =>
        this.prisma.jiraTask.upsert({
          where: { projectId_jiraKey: { projectId, jiraKey: issue.key } },
          create: {
            projectId,
            jiraKey: issue.key,
            title: issue.fields.summary,
            currentStatus: issue.fields.status?.name,
            currentAssignee: issue.fields.assignee?.displayName,
            jiraUrl: `${project.jiraBaseUrl!.replace(/\/+$/, '')}/browse/${issue.key}`,
            jiraUpdatedAt: issue.fields.updated
              ? new Date(issue.fields.updated)
              : null,
          },
          update: {
            title: issue.fields.summary,
            currentStatus: issue.fields.status?.name,
            currentAssignee: issue.fields.assignee?.displayName,
            jiraUpdatedAt: issue.fields.updated
              ? new Date(issue.fields.updated)
              : null,
            syncedAt: new Date(),
          },
        }),
      ),
    );

    await this.activityLogs.log({
      userId,
      projectId,
      action: 'SYNC',
      entityType: 'PROJECT',
      entityId: projectId,
      newValue: { syncedCount: syncedTasks.length },
    });

    return { syncedCount: syncedTasks.length, tasks: syncedTasks };
  }

  async listTasks(projectId: string, userId: string) {
    await this.getProjectOrThrow(projectId);

    const tasks = await this.prisma.jiraTask.findMany({
      where: { projectId },
      orderBy: { syncedAt: 'desc' },
    });

    const views = await this.prisma.jiraTaskView.findMany({
      where: { userId, jiraTaskId: { in: tasks.map((t) => t.id) } },
    });
    const viewByTaskId = new Map(views.map((v) => [v.jiraTaskId, v]));

    return tasks.map((task) => ({
      ...task,
      unseen: this.isUnseen(
        task.jiraUpdatedAt,
        viewByTaskId.get(task.id)?.seenAt,
      ),
    }));
  }

  async getTask(projectId: string, taskId: string, userId: string) {
    await this.getProjectOrThrow(projectId);

    const task = await this.prisma.jiraTask.findFirst({
      where: { id: taskId, projectId },
    });
    if (!task) {
      throw new NotFoundException(
        `Jira task with id ${taskId} not found in this project`,
      );
    }

    const view = await this.prisma.jiraTaskView.findUnique({
      where: { jiraTaskId_userId: { jiraTaskId: taskId, userId } },
    });

    return { ...task, unseen: this.isUnseen(task.jiraUpdatedAt, view?.seenAt) };
  }

  async markSeen(projectId: string, taskId: string, userId: string) {
    await this.getProjectOrThrow(projectId);

    const task = await this.prisma.jiraTask.findFirst({
      where: { id: taskId, projectId },
    });
    if (!task) {
      throw new NotFoundException(
        `Jira task with id ${taskId} not found in this project`,
      );
    }

    return this.prisma.jiraTaskView.upsert({
      where: { jiraTaskId_userId: { jiraTaskId: taskId, userId } },
      create: { jiraTaskId: taskId, userId },
      update: { seenAt: new Date() },
    });
  }

  private isUnseen(
    jiraUpdatedAt: Date | null,
    seenAt: Date | undefined,
  ): boolean {
    if (!seenAt) return true;
    if (!jiraUpdatedAt) return false;
    return jiraUpdatedAt > seenAt;
  }
}
