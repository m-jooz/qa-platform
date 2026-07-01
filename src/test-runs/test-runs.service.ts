import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JiraService } from '../jira/jira.service';
import {
  BugStatus,
  Role,
  TestRunStatus,
} from '../generated/prisma/enums.js';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { ApproveBugDto } from './dto/approve-bug.dto';
import { RejectBugDto } from './dto/reject-bug.dto';

const testRunInclude = {
  executor: { select: { id: true, name: true, email: true } },
  bugReviewer: { select: { id: true, name: true, email: true } },
  attachments: true,
  testCase: {
    select: {
      id: true,
      title: true,
      steps: true,
      expectedResult: true,
      platform: true,
      projectId: true,
      jiraTaskId: true,
    },
  },
} as const;

@Injectable()
export class TestRunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
    private readonly notifications: NotificationsService,
    private readonly jiraService: JiraService,
  ) {}

  private async findTestRunOrThrow(id: string) {
    const testRun = await this.prisma.testRun.findUnique({
      where: { id },
      include: testRunInclude,
    });
    if (!testRun) {
      throw new NotFoundException(`Test run with id ${id} not found`);
    }
    return testRun;
  }

  async create(dto: CreateTestRunDto, userId: string) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id: dto.testCaseId },
    });
    if (!testCase) {
      throw new NotFoundException(
        `Test case with id ${dto.testCaseId} not found`,
      );
    }

    if (dto.retestOfRunId) {
      const previousRun = await this.prisma.testRun.findUnique({
        where: { id: dto.retestOfRunId },
      });
      if (!previousRun) {
        throw new NotFoundException(
          `Test run with id ${dto.retestOfRunId} not found`,
        );
      }
      if (previousRun.testCaseId !== dto.testCaseId) {
        throw new BadRequestException(
          'retestOfRunId must reference a run of the same test case',
        );
      }
      if (previousRun.status !== TestRunStatus.FAIL) {
        throw new BadRequestException(
          'Can only retest a run that previously failed',
        );
      }
    }

    const testRun = await this.prisma.testRun.create({
      data: {
        testCaseId: dto.testCaseId,
        status: dto.status,
        actualResult: dto.actualResult,
        notes: dto.notes,
        severity: dto.severity,
        isBug: dto.isBug ?? false,
        bugDetails: dto.bugDetails,
        bugStatus: dto.isBug ? BugStatus.PENDING : undefined,
        retestOfRunId: dto.retestOfRunId,
        executedBy: userId,
      },
      include: testRunInclude,
    });

    await this.activityLogs.log({
      userId,
      projectId: testCase.projectId,
      action: 'CREATE',
      entityType: 'TEST_RUN',
      entityId: testRun.id,
      newValue: testRun,
    });

    if (dto.retestOfRunId && dto.status === TestRunStatus.PASS) {
      const reviewers = await this.prisma.user.findMany({
        where: { role: { in: [Role.LEAD, Role.ADMIN] } },
        select: { id: true },
      });
      await Promise.all(
        reviewers.map((reviewer) =>
          this.notifications.create({
            userId: reviewer.id,
            message: `Bug fixed and verified ✅ — ${testCase.title}`,
            entityType: 'test_run',
            entityId: testRun.id,
          }),
        ),
      );
    }

    return testRun;
  }

  async findByTestCase(testCaseId: string) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id: testCaseId },
    });
    if (!testCase) {
      throw new NotFoundException(`Test case with id ${testCaseId} not found`);
    }

    return this.prisma.testRun.findMany({
      where: { testCaseId },
      include: testRunInclude,
      orderBy: { executedAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.findTestRunOrThrow(id);
  }

  async approveBug(id: string, dto: ApproveBugDto, userId: string) {
    const testRun = await this.findTestRunOrThrow(id);

    if (!testRun.isBug || testRun.bugStatus !== BugStatus.PENDING) {
      throw new BadRequestException(
        'This test run is not a pending bug report',
      );
    }
    if (!testRun.testCase.jiraTaskId) {
      throw new BadRequestException(
        'The test case for this run is not linked to a Jira task; cannot sync to Jira',
      );
    }

    const jiraTask = await this.prisma.jiraTask.findUnique({
      where: { id: testRun.testCase.jiraTaskId },
    });
    if (!jiraTask) {
      throw new NotFoundException(
        `Jira task with id ${testRun.testCase.jiraTaskId} not found`,
      );
    }

    const projectId = testRun.testCase.projectId;
    const jiraKey = jiraTask.jiraKey;

    const jiraStatusBefore = await this.jiraService.getIssueStatus(
      projectId,
      jiraKey,
    );
    const commentBody = this.buildBugCommentBody(testRun);
    const jiraCommentId = await this.jiraService.addComment(
      projectId,
      jiraKey,
      commentBody,
    );
    await this.jiraService.transitionIssue(
      projectId,
      jiraKey,
      dto.jiraNewStatus,
    );
    await this.jiraService.reassignIssue(
      projectId,
      jiraKey,
      dto.jiraReassignTo,
    );
    const jiraStatusAfter = await this.jiraService.getIssueStatus(
      projectId,
      jiraKey,
    );

    const updated = await this.prisma.testRun.update({
      where: { id },
      data: {
        bugStatus: BugStatus.APPROVED,
        bugReviewedBy: userId,
        bugReviewedAt: new Date(),
        jiraCommentId,
        jiraStatusBefore,
        jiraStatusAfter,
        jiraReassignedTo: dto.jiraReassignTo,
      },
      include: testRunInclude,
    });

    await this.notifications.create({
      userId: testRun.executor.id,
      message: `Your bug report on ${testRun.testCase.title} was approved and sent to Jira`,
      entityType: 'test_run',
      entityId: id,
    });

    await this.activityLogs.log({
      userId,
      projectId,
      action: 'UPDATE',
      entityType: 'TEST_RUN',
      entityId: id,
      oldValue: { bugStatus: testRun.bugStatus },
      newValue: {
        bugStatus: updated.bugStatus,
        jiraStatusBefore,
        jiraStatusAfter,
      },
    });

    return updated;
  }

  async rejectBug(id: string, dto: RejectBugDto, userId: string) {
    const testRun = await this.findTestRunOrThrow(id);

    if (!testRun.isBug || testRun.bugStatus !== BugStatus.PENDING) {
      throw new BadRequestException(
        'This test run is not a pending bug report',
      );
    }

    const updated = await this.prisma.testRun.update({
      where: { id },
      data: {
        bugStatus: BugStatus.REJECTED,
        rejectReason: dto.rejectReason,
        bugReviewedBy: userId,
        bugReviewedAt: new Date(),
      },
      include: testRunInclude,
    });

    await this.notifications.create({
      userId: testRun.executor.id,
      message: `Your bug report on ${testRun.testCase.title} was rejected. Reason: ${dto.rejectReason}`,
      entityType: 'test_run',
      entityId: id,
    });

    await this.activityLogs.log({
      userId,
      projectId: testRun.testCase.projectId,
      action: 'UPDATE',
      entityType: 'TEST_RUN',
      entityId: id,
      oldValue: { bugStatus: testRun.bugStatus },
      newValue: {
        bugStatus: updated.bugStatus,
        rejectReason: dto.rejectReason,
      },
    });

    return updated;
  }

  private buildBugCommentBody(
    testRun: Awaited<ReturnType<typeof this.findTestRunOrThrow>>,
  ): string {
    const { testCase, executor, attachments } = testRun;
    return [
      `🔴 Bug Found — [${testRun.severity ?? 'UNKNOWN'}]`,
      `Reported by: ${executor.name}`,
      `Date: ${testRun.executedAt.toISOString()}`,
      '',
      `Test Case: ${testCase.title}`,
      `Platform: ${testCase.platform}`,
      '',
      'Steps to reproduce:',
      testCase.steps,
      '',
      `Expected Result: ${testCase.expectedResult}`,
      `Actual Result: ${testRun.actualResult ?? 'N/A'}`,
      '',
      `Notes: ${testRun.notes ?? 'N/A'}`,
      `Attachments: ${attachments.length}`,
    ].join('\n');
  }
}
