import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios, { isAxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import {
  JiraAssignableUser,
  JiraChangelogEntry,
  JiraChangelogResponse,
  JiraSearchResponse,
  JiraTransition,
  JiraTransitionsResponse,
} from './types/jira-issue.type';
import { Project } from '../generated/prisma/client.js';
import type { Prisma } from '../generated/prisma/client.js';
import { QaOverallStatus } from '../generated/prisma/enums.js';
import { FindJiraTasksQueryDto } from './dto/find-jira-tasks-query.dto';
import { SubmitQaResultDto } from './dto/submit-qa-result.dto';
import { paginate } from '../common/dto/pagination-query.dto';

const PASS_TRANSITION_KEYWORDS = [
  'done',
  'approved',
  'ready for release',
  'closed',
  'release',
];

const IN_PROGRESS_KEYWORDS = ['in progress'];

type QaStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'FAILED';

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);

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
      }>(`${this.jiraBaseUrl(project)}/rest/api/3/issue/${jiraKey}`, {
        params: { fields: 'status' },
        headers: this.authHeaders(project),
      });
      return response.data.fields?.status?.name ?? null;
    } catch {
      throw new BadGatewayException('Failed to fetch issue status from Jira');
    }
  }

  /**
   * API v3 requires comment bodies in Atlassian Document Format (ADF)
   * rather than a plain string.
   */
  private toAdf(text: string) {
    return {
      type: 'doc',
      version: 1,
      content: text.split('\n').map((line) => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : [],
      })),
    };
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
        `${this.jiraBaseUrl(project)}/rest/api/3/issue/${jiraKey}/comment`,
        { body: this.toAdf(body) },
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
        `${this.jiraBaseUrl(project)}/rest/api/3/issue/${jiraKey}/transitions`,
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
        `${this.jiraBaseUrl(project)}/rest/api/3/issue/${jiraKey}`,
        { fields: { assignee: { accountId } } },
        { headers: this.authHeaders(project) },
      );
    } catch {
      throw new BadGatewayException('Failed to reassign Jira issue');
    }
  }

  /** Adds a label to a Jira issue without removing existing labels. */
  async addLabel(
    projectId: string,
    jiraKey: string,
    label: string,
  ): Promise<void> {
    const project = await this.getProjectOrThrow(projectId);
    this.assertJiraConfigured(project);

    try {
      await axios.put(
        `${this.jiraBaseUrl(project)}/rest/api/3/issue/${jiraKey}`,
        { update: { labels: [{ add: label }] } },
        { headers: this.authHeaders(project) },
      );
    } catch {
      throw new BadGatewayException('Failed to add label on Jira issue');
    }
  }

  /** Lists the transitions currently available for a Jira issue. */
  async getTransitions(
    projectId: string,
    jiraKey: string,
  ): Promise<JiraTransition[]> {
    const project = await this.getProjectOrThrow(projectId);
    this.assertJiraConfigured(project);

    try {
      const response = await axios.get<JiraTransitionsResponse>(
        `${this.jiraBaseUrl(project)}/rest/api/3/issue/${jiraKey}/transitions`,
        { headers: this.authHeaders(project) },
      );
      return response.data.transitions ?? [];
    } catch {
      throw new BadGatewayException('Failed to fetch transitions from Jira');
    }
  }

  /** Picks the best-matching "done-like" transition for an all-pass QA submission. */
  private pickPassTransition(
    transitions: JiraTransition[],
  ): JiraTransition | null {
    for (const keyword of PASS_TRANSITION_KEYWORDS) {
      const match = transitions.find((t) =>
        (t.to?.name ?? t.name).toLowerCase().includes(keyword),
      );
      if (match) return match;
    }
    return null;
  }

  /** Best-effort match for "In Progress", used only to pre-select the frontend dropdown. */
  pickInProgressTransition(
    transitions: JiraTransition[],
  ): JiraTransition | null {
    for (const keyword of IN_PROGRESS_KEYWORDS) {
      const match = transitions.find((t) =>
        (t.to?.name ?? t.name).toLowerCase().includes(keyword),
      );
      if (match) return match;
    }
    return null;
  }

  /** Fetches the assignable members for the project's Jira project. */
  async getAssignableMembers(projectId: string) {
    const project = await this.getProjectOrThrow(projectId);
    if (!project.jiraProjectKey) {
      throw new BadRequestException(
        'Project is missing Jira configuration (jiraProjectKey)',
      );
    }
    this.assertJiraConfigured(project);

    try {
      const response = await axios.get<JiraAssignableUser[]>(
        `${this.jiraBaseUrl(project)}/rest/api/3/user/assignable/search`,
        {
          params: { project: project.jiraProjectKey },
          headers: this.authHeaders(project),
        },
      );
      return response.data.map((user) => ({
        accountId: user.accountId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrls?.['48x48'],
      }));
    } catch {
      throw new BadGatewayException(
        'Failed to fetch assignable members from Jira',
      );
    }
  }

  /** Fetches the full changelog (paginated) for a Jira issue. */
  private async getChangelog(
    project: Project & { jiraBaseUrl: string; jiraEmail: string; jiraApiToken: string },
    jiraKey: string,
  ): Promise<JiraChangelogEntry[]> {
    const entries: JiraChangelogEntry[] = [];
    let startAt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await axios.get<JiraChangelogResponse>(
        `${this.jiraBaseUrl(project)}/rest/api/3/issue/${jiraKey}/changelog`,
        {
          params: { startAt, maxResults: 100 },
          headers: this.authHeaders(project),
        },
      );
      entries.push(...(response.data.values ?? []));
      if (response.data.isLast !== false) break;
      startAt += response.data.values?.length ?? 100;
      if (!response.data.values?.length) break;
    }
    return entries;
  }

  /**
   * Replays a Jira issue's changelog to find when it most recently moved
   * into "Testing" status, who moved it, and who was assigned right before
   * that hand-off.
   */
  private deriveQaHandoff(entries: JiraChangelogEntry[]): {
    sentToQaAt?: Date;
    qaRequestedById?: string;
    qaRequestedByName?: string;
    previousAssigneeId?: string;
    previousAssigneeName?: string;
  } {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime(),
    );

    let currentAssigneeId: string | undefined;
    let currentAssigneeName: string | undefined;

    let result: ReturnType<typeof this.deriveQaHandoff> = {};

    for (const entry of sorted) {
      for (const item of entry.items) {
        if (item.field === 'assignee') {
          currentAssigneeId = item.to ?? undefined;
          currentAssigneeName = item.toString ?? undefined;
        }
        if (
          item.field === 'status' &&
          (item.toString ?? '').toLowerCase() === 'testing'
        ) {
          result = {
            sentToQaAt: new Date(entry.created),
            qaRequestedById: entry.author?.accountId,
            qaRequestedByName: entry.author?.displayName,
            previousAssigneeId: currentAssigneeId,
            previousAssigneeName: currentAssigneeName,
          };
        }
      }
    }

    return result;
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

    const searchUrl = `${project.jiraBaseUrl.replace(/\/+$/, '')}/rest/api/3/search/jql`;
    const jql = `project = ${project.jiraProjectKey} ORDER BY created DESC`;
    const requestBody = {
      jql,
      maxResults: 100,
      fields: ['summary', 'description', 'status', 'assignee', 'updated', 'key'],
    };

    this.logger.log(
      `Jira search request: POST ${searchUrl} body=${JSON.stringify(requestBody)}`,
    );

    let issues: JiraSearchResponse['issues'];
    try {
      const response = await axios.post<
        JiraSearchResponse & { total?: number; isLast?: boolean }
      >(searchUrl, requestBody, {
        headers: {
          ...this.authHeaders(project),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      this.logger.log(
        `Jira search response: status=${response.status} total=${response.data.total ?? 'n/a'} ` +
          `isLast=${response.data.isLast ?? 'n/a'} issuesLength=${response.data.issues?.length ?? 0}`,
      );
      this.logger.debug(
        `Jira search response body: ${JSON.stringify(response.data)}`,
      );

      issues = response.data.issues ?? [];
    } catch (error) {
      const message = this.buildJiraErrorMessage(error, searchUrl);
      this.logger.error(
        `Jira search failed: ${message}` +
          (isAxiosError(error) && error.response
            ? ` rawBody=${JSON.stringify(error.response.data)}`
            : ''),
      );
      throw new BadGatewayException(message);
    }

    const syncedTasks = await Promise.all(
      issues.map(async (issue) => {
        let handoff: ReturnType<typeof this.deriveQaHandoff> = {};
        try {
          const changelog = await this.getChangelog(project, issue.key);
          handoff = this.deriveQaHandoff(changelog);
        } catch (error) {
          this.logger.warn(
            `Failed to fetch/parse changelog for ${issue.key}: ${String(error)}`,
          );
        }

        return this.prisma.jiraTask.upsert({
          where: { projectId_jiraKey: { projectId, jiraKey: issue.key } },
          create: {
            projectId,
            jiraKey: issue.key,
            title: issue.fields?.summary ?? 'No title',
            description: issue.fields?.description ?? null,
            currentStatus: issue.fields?.status?.name ?? 'Unknown',
            currentAssignee: issue.fields?.assignee?.displayName ?? 'Unassigned',
            jiraUrl: `${project.jiraBaseUrl!.replace(/\/+$/, '')}/browse/${issue.key}`,
            jiraUpdatedAt: new Date(
              issue.fields?.updated ?? new Date().toISOString(),
            ),
            ...handoff,
          },
          update: {
            title: issue.fields?.summary ?? 'No title',
            description: issue.fields?.description ?? null,
            currentStatus: issue.fields?.status?.name ?? 'Unknown',
            currentAssignee: issue.fields?.assignee?.displayName ?? 'Unassigned',
            jiraUpdatedAt: new Date(
              issue.fields?.updated ?? new Date().toISOString(),
            ),
            syncedAt: new Date(),
            ...handoff,
          },
        });
      }),
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

  /** Batches qaStatus derivation for a page of tasks (no per-row queries). */
  private async attachQaStatus<T extends { id: string }>(
    tasks: T[],
  ): Promise<(T & { qaStatus: QaStatus })[]> {
    const taskIds = tasks.map((t) => t.id);
    if (taskIds.length === 0) return tasks as (T & { qaStatus: QaStatus })[];

    const [submissions, runCounts] = await Promise.all([
      this.prisma.qaSubmission.findMany({
        where: { jiraTaskId: { in: taskIds } },
        orderBy: { submittedAt: 'desc' },
        select: { jiraTaskId: true, overallStatus: true },
      }),
      this.prisma.testRun.groupBy({
        by: ['testCaseId'],
        where: { testCase: { jiraTaskId: { in: taskIds } } },
        _count: true,
      }),
    ]);

    const latestSubmissionByTask = new Map<string, QaOverallStatus>();
    for (const submission of submissions) {
      if (!latestSubmissionByTask.has(submission.jiraTaskId)) {
        latestSubmissionByTask.set(submission.jiraTaskId, submission.overallStatus);
      }
    }

    const testCases = await this.prisma.testCase.findMany({
      where: { jiraTaskId: { in: taskIds } },
      select: { id: true, jiraTaskId: true },
    });
    const hasRunTaskIds = new Set(
      testCases
        .filter((tc) => runCounts.some((r) => r.testCaseId === tc.id))
        .map((tc) => tc.jiraTaskId as string),
    );

    return tasks.map((task) => {
      const latest = latestSubmissionByTask.get(task.id);
      let qaStatus: QaStatus = 'NOT_STARTED';
      if (latest === QaOverallStatus.PASS) qaStatus = 'SUBMITTED';
      else if (latest === QaOverallStatus.FAIL) qaStatus = 'FAILED';
      else if (hasRunTaskIds.has(task.id)) qaStatus = 'IN_PROGRESS';
      return { ...task, qaStatus };
    });
  }

  async listTasks(
    projectId: string,
    userId: string,
    query: FindJiraTasksQueryDto = {},
  ) {
    await this.getProjectOrThrow(projectId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.JiraTaskWhereInput = {
      projectId,
      ...(query.status && { currentStatus: query.status }),
      ...(query.qaRequestedByName && {
        qaRequestedByName: query.qaRequestedByName,
      }),
      ...((query.dateFrom || query.dateTo) && {
        sentToQaAt: {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo && { lte: new Date(query.dateTo) }),
        },
      }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' as const } },
          {
            jiraKey: { contains: query.search, mode: 'insensitive' as const },
          },
        ],
      }),
    };

    const [tasks, total] = await Promise.all([
      this.prisma.jiraTask.findMany({
        where,
        orderBy: { syncedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.jiraTask.count({ where }),
    ]);

    const views = await this.prisma.jiraTaskView.findMany({
      where: { userId, jiraTaskId: { in: tasks.map((t) => t.id) } },
    });
    const viewByTaskId = new Map(views.map((v) => [v.jiraTaskId, v]));

    const withQaStatus = await this.attachQaStatus(tasks);

    const data = withQaStatus.map((task) => ({
      ...task,
      unseen: this.isUnseen(
        task.jiraUpdatedAt,
        viewByTaskId.get(task.id)?.seenAt,
      ),
    }));

    return paginate(data, total, page, limit);
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
    const [withQaStatus] = await this.attachQaStatus([task]);

    return {
      ...withQaStatus,
      unseen: this.isUnseen(task.jiraUpdatedAt, view?.seenAt),
    };
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

  async getTaskTransitions(projectId: string, taskId: string) {
    await this.getProjectOrThrow(projectId);
    const task = await this.prisma.jiraTask.findFirst({
      where: { id: taskId, projectId },
    });
    if (!task) {
      throw new NotFoundException(
        `Jira task with id ${taskId} not found in this project`,
      );
    }
    const transitions = await this.getTransitions(projectId, task.jiraKey);
    const suggestedInProgressId =
      this.pickInProgressTransition(transitions)?.id ?? null;
    return { transitions, suggestedInProgressId };
  }

  private buildQaSubmissionComment(
    overallStatus: QaOverallStatus,
    testRuns: Array<{
      status: string;
      actualResult: string | null;
      testCase: { title: string };
    }>,
    submitterName: string,
    date: Date,
  ): string {
    const passCount = testRuns.filter((r) => r.status === 'PASS').length;
    const failCount = testRuns.filter((r) => r.status === 'FAIL').length;
    const total = testRuns.length;
    const dateStr = date.toLocaleDateString();
    const truncate = (text: string) =>
      text.length > 100 ? `${text.slice(0, 100)}…` : text;

    if (overallStatus === QaOverallStatus.PASS) {
      const lines = [
        `✅ QA Passed | ${dateStr}`,
        `Tester: ${submitterName}`,
        `Tests: ${total} passed`,
        '',
        ...testRuns.map((r) => `✅ ${r.testCase.title}`),
        '',
        'Result: Approved ✓',
      ];
      return lines.join('\n');
    }

    const lines = [
      `❌ QA Failed | ${dateStr}`,
      `Tester: ${submitterName}`,
      `Tests: ${passCount}✅ ${failCount}❌`,
      '',
      'Failed:',
      ...testRuns
        .filter((r) => r.status === 'FAIL')
        .map(
          (r) =>
            `❌ ${r.testCase.title} → ${truncate(r.actualResult ?? 'N/A')}`,
        ),
      '',
      'Action: Please fix and resubmit',
    ];
    return lines.join('\n');
  }

  async submitQaResult(
    projectId: string,
    taskId: string,
    dto: SubmitQaResultDto,
    userId: string,
  ) {
    await this.getProjectOrThrow(projectId);
    const jiraTask = await this.prisma.jiraTask.findFirst({
      where: { id: taskId, projectId },
    });
    if (!jiraTask) {
      throw new NotFoundException(
        `Jira task with id ${taskId} not found in this project`,
      );
    }

    const testRuns = await this.prisma.testRun.findMany({
      where: { id: { in: dto.testRunIds } },
      include: {
        testCase: { select: { id: true, title: true, jiraTaskId: true } },
        executor: { select: { id: true, name: true } },
      },
    });

    if (testRuns.length === 0) {
      throw new BadRequestException('No test runs provided');
    }
    if (testRuns.some((run) => run.testCase.jiraTaskId !== taskId)) {
      throw new BadRequestException(
        'All test runs must belong to test cases linked to this Jira task',
      );
    }

    const passCount = testRuns.filter((r) => r.status === 'PASS').length;
    const failCount = testRuns.filter((r) => r.status === 'FAIL').length;
    const totalCount = testRuns.length;

    const submitter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const submittedAt = new Date();
    const commentBody = this.buildQaSubmissionComment(
      dto.overallStatus,
      testRuns,
      submitter?.name ?? 'Unknown',
      submittedAt,
    );

    const jiraKey = jiraTask.jiraKey;
    let labelAdded: string | null = null;

    await this.addComment(projectId, jiraKey, commentBody);

    if (dto.overallStatus === QaOverallStatus.PASS) {
      await this.addLabel(projectId, jiraKey, 'QA-Approved');
      labelAdded = 'QA-Approved';

      const transitions = await this.getTransitions(projectId, jiraKey);
      const target = this.pickPassTransition(transitions);
      if (target) {
        await this.transitionIssue(projectId, jiraKey, target.id);
      } else {
        this.logger.warn(
          `No matching "done-like" transition found for ${jiraKey}; leaving status unchanged`,
        );
      }
    } else {
      if (!dto.transitionId) {
        throw new BadRequestException(
          'transitionId is required when overallStatus is FAIL',
        );
      }
      await this.transitionIssue(projectId, jiraKey, dto.transitionId);

      const reassignTo = dto.jiraAssigneeId ?? jiraTask.previousAssigneeId;
      if (reassignTo) {
        await this.reassignIssue(projectId, jiraKey, reassignTo);
      } else {
        this.logger.warn(
          `No assignee available to reassign ${jiraKey} to (no jiraAssigneeId and no previousAssigneeId)`,
        );
      }
    }

    const jiraStatusAfter = await this.getIssueStatus(projectId, jiraKey);

    const submission = await this.prisma.qaSubmission.create({
      data: {
        jiraTaskId: taskId,
        projectId,
        overallStatus: dto.overallStatus,
        passCount,
        failCount,
        totalCount,
        jiraComment: commentBody,
        labelAdded,
        jiraStatusAfter,
        submittedBy: userId,
        submittedAt,
      },
      include: {
        jiraTask: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await this.activityLogs.log({
      userId,
      projectId,
      action: 'CREATE',
      entityType: 'QA_SUBMISSION',
      entityId: submission.id,
      newValue: submission,
    });

    return submission;
  }

  async getQaOverview(
    projectId: string,
    filters: {
      qaRequestedByName?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    },
  ) {
    await this.getProjectOrThrow(projectId);

    const readyWhere: Prisma.JiraTaskWhereInput = {
      projectId,
      currentStatus: 'Testing',
      ...(filters.qaRequestedByName && {
        qaRequestedByName: filters.qaRequestedByName,
      }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' as const } },
          { jiraKey: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
      ...((filters.dateFrom || filters.dateTo) && {
        sentToQaAt: {
          ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
          ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
        },
      }),
    };

    const readyTasks = await this.prisma.jiraTask.findMany({
      where: readyWhere,
      orderBy: { sentToQaAt: 'desc' },
    });

    const testCaseCounts = await this.prisma.testCase.groupBy({
      by: ['jiraTaskId'],
      where: { jiraTaskId: { in: readyTasks.map((t) => t.id) } },
      _count: true,
    });
    const testCaseCountByTask = new Map(
      testCaseCounts.map((c) => [c.jiraTaskId as string, c._count]),
    );

    const readyForTesting = readyTasks.map((task) => ({
      ...task,
      testCasesCount: testCaseCountByTask.get(task.id) ?? 0,
    }));

    const allTasks = await this.prisma.jiraTask.findMany({
      where: { projectId },
      include: { testCases: { select: { id: true } } },
    });
    const submittedTaskIds = new Set(
      (
        await this.prisma.qaSubmission.findMany({
          where: { projectId },
          select: { jiraTaskId: true },
        })
      ).map((s) => s.jiraTaskId),
    );
    const allTestCaseIds = allTasks.flatMap((t) => t.testCases.map((tc) => tc.id));
    const runCounts = await this.prisma.testRun.groupBy({
      by: ['testCaseId'],
      where: { testCaseId: { in: allTestCaseIds } },
      _count: true,
    });
    const testCaseIdsWithRuns = new Set(runCounts.map((r) => r.testCaseId));

    const inProgress = allTasks
      .filter((task) => !submittedTaskIds.has(task.id) && task.testCases.length > 0)
      .map((task) => {
        const completedCount = task.testCases.filter((tc) =>
          testCaseIdsWithRuns.has(tc.id),
        ).length;
        return {
          task,
          testCasesCount: task.testCases.length,
          completedCount,
        };
      })
      .filter((entry) => entry.completedCount > 0);

    const recentlyCompleted = await this.prisma.qaSubmission.findMany({
      where: { projectId },
      orderBy: { submittedAt: 'desc' },
      take: 5,
      include: {
        jiraTask: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return { readyForTesting, inProgress, recentlyCompleted };
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
