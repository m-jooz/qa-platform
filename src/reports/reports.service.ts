import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { JiraService } from '../jira/jira.service';
import {
  BugStatus,
  Platform,
  Priority,
  TestRunStatus,
} from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { GenerateReportDto } from './dto/generate-report.dto';

function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const PLATFORM_ORDER: Platform[] = [
  Platform.WEB,
  Platform.ANDROID,
  Platform.IOS,
];
const PRIORITY_ORDER: Priority[] = [
  Priority.CRITICAL,
  Priority.HIGH,
  Priority.MEDIUM,
  Priority.LOW,
];

interface RunForStats {
  status: TestRunStatus;
  isBug: boolean;
  bugStatus: BugStatus | null;
}

interface RunWithTestCaseAttrs extends RunForStats {
  testCase: { platform: Platform; priority: Priority };
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
    private readonly jiraService: JiraService,
  ) {}

  private async getProjectOrThrow(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, type: true },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
    return project;
  }

  private rate(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((count / total) * 10000) / 100;
  }

  private computeOverview(runs: RunForStats[], totalTestCases: number) {
    const totalTestRuns = runs.length;
    const passCount = runs.filter(
      (r) => r.status === TestRunStatus.PASS,
    ).length;
    const failCount = runs.filter(
      (r) => r.status === TestRunStatus.FAIL,
    ).length;
    const blockedCount = runs.filter(
      (r) => r.status === TestRunStatus.BLOCKED,
    ).length;
    const bugs = runs.filter((r) => r.isBug);

    return {
      totalTestCases,
      totalTestRuns,
      passRate: this.rate(passCount, totalTestRuns),
      failRate: this.rate(failCount, totalTestRuns),
      blockedRate: this.rate(blockedCount, totalTestRuns),
      totalBugs: bugs.length,
      pendingBugs: bugs.filter((r) => r.bugStatus === BugStatus.PENDING).length,
      approvedBugs: bugs.filter((r) => r.bugStatus === BugStatus.APPROVED)
        .length,
      rejectedBugs: bugs.filter((r) => r.bugStatus === BugStatus.REJECTED)
        .length,
    };
  }

  private groupByPlatform(runs: RunWithTestCaseAttrs[]) {
    return PLATFORM_ORDER.map((platform) => {
      const matching = runs.filter((r) => r.testCase.platform === platform);
      return {
        platform,
        total: matching.length,
        pass: matching.filter((r) => r.status === TestRunStatus.PASS).length,
        fail: matching.filter((r) => r.status === TestRunStatus.FAIL).length,
      };
    });
  }

  private groupByPriority(runs: RunWithTestCaseAttrs[]) {
    return PRIORITY_ORDER.map((priority) => {
      const matching = runs.filter((r) => r.testCase.priority === priority);
      return {
        priority,
        total: matching.length,
        pass: matching.filter((r) => r.status === TestRunStatus.PASS).length,
        fail: matching.filter((r) => r.status === TestRunStatus.FAIL).length,
      };
    });
  }

  async getDashboard(projectId: string, userId: string) {
    const project = await this.getProjectOrThrow(projectId);

    const totalTestCases = await this.prisma.testCase.count({
      where: { projectId },
    });

    const runs = await this.prisma.testRun.findMany({
      where: { testCase: { projectId } },
      select: {
        status: true,
        isBug: true,
        bugStatus: true,
        testCase: { select: { platform: true, priority: true } },
      },
    });

    const overview = this.computeOverview(runs, totalTestCases);
    const byPlatform = this.groupByPlatform(runs);
    const byPriority = this.groupByPriority(runs);

    const recentActivityRaw = await this.prisma.activityLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { name: true } } },
    });
    const recentActivity = recentActivityRaw.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      userName: log.user.name,
      createdAt: log.createdAt,
    }));

    const jiraTasks = await this.jiraService.listTasks(projectId, userId);
    const unseenJiraTasks = jiraTasks.filter((task) => task.unseen).length;

    const pendingBugReviewsRaw = await this.prisma.testRun.findMany({
      where: {
        testCase: { projectId },
        isBug: true,
        bugStatus: BugStatus.PENDING,
      },
      select: {
        id: true,
        severity: true,
        executedAt: true,
        testCase: { select: { title: true } },
        executor: { select: { name: true } },
      },
      orderBy: { executedAt: 'desc' },
    });
    const pendingBugReviews = pendingBugReviewsRaw.map((run) => ({
      id: run.id,
      severity: run.severity,
      testCaseTitle: run.testCase.title,
      executedByName: run.executor.name,
      executedAt: run.executedAt,
    }));

    return {
      project,
      overview,
      byPlatform,
      byPriority,
      recentActivity,
      unseenJiraTasks,
      pendingBugReviews,
    };
  }

  async generate(dto: GenerateReportDto, userId: string) {
    const project = await this.getProjectOrThrow(dto.projectId);
    const filters = dto.filters ?? {};

    const runWhere = {
      testCase: {
        projectId: dto.projectId,
        ...(filters.platform && { platform: filters.platform }),
        ...(filters.priority && { priority: filters.priority }),
      },
      ...(filters.status && { status: filters.status }),
      ...((filters.dateFrom || filters.dateTo) && {
        executedAt: {
          ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
          ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
        },
      }),
    };

    const runs = await this.prisma.testRun.findMany({
      where: runWhere,
      select: {
        status: true,
        isBug: true,
        bugStatus: true,
        testCase: { select: { platform: true, priority: true } },
      },
    });

    const totalTestCases = await this.prisma.testCase.count({
      where: {
        projectId: dto.projectId,
        ...(filters.platform && { platform: filters.platform }),
        ...(filters.priority && { priority: filters.priority }),
      },
    });
    const summary = this.computeOverview(runs, totalTestCases);

    const testCases = await this.prisma.testCase.findMany({
      where: {
        projectId: dto.projectId,
        ...(filters.platform && { platform: filters.platform }),
        ...(filters.priority && { priority: filters.priority }),
      },
      select: {
        id: true,
        title: true,
        platform: true,
        priority: true,
        type: true,
        testRuns: {
          orderBy: { executedAt: 'desc' },
          select: {
            id: true,
            status: true,
            executedAt: true,
            executor: { select: { name: true } },
          },
        },
      },
    });

    const testCasesWithLatestRun = testCases.map((testCase) => {
      const matchingRuns = testCase.testRuns.filter((run) => {
        if (filters.status && run.status !== filters.status) return false;
        if (filters.dateFrom && run.executedAt < new Date(filters.dateFrom))
          return false;
        if (filters.dateTo && run.executedAt > new Date(filters.dateTo))
          return false;
        return true;
      });
      const latestRun = matchingRuns[0] ?? null;
      return {
        id: testCase.id,
        title: testCase.title,
        platform: testCase.platform,
        priority: testCase.priority,
        type: testCase.type,
        latestRun: latestRun
          ? {
              id: latestRun.id,
              status: latestRun.status,
              executedAt: latestRun.executedAt,
              executedByName: latestRun.executor.name,
            }
          : null,
      };
    });

    const bugs = await this.prisma.testRun.findMany({
      where: { ...runWhere, isBug: true },
      select: {
        id: true,
        severity: true,
        bugStatus: true,
        bugDetails: true,
        rejectReason: true,
        jiraCommentId: true,
        jiraStatusBefore: true,
        jiraStatusAfter: true,
        jiraReassignedTo: true,
        executedAt: true,
        testCase: { select: { title: true } },
        executor: { select: { name: true } },
      },
      orderBy: { executedAt: 'desc' },
    });

    const generatedByUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const reportData = {
      project,
      summary,
      testCases: testCasesWithLatestRun,
      bugs,
      generatedBy: generatedByUser?.name ?? null,
      generatedAt: new Date(),
      filters,
    };

    const report = await this.prisma.report.create({
      data: {
        projectId: dto.projectId,
        title: dto.title,
        filters: toJsonValue(filters),
        data: toJsonValue(reportData),
        shareToken: randomUUID(),
        createdBy: userId,
      },
    });

    await this.activityLogs.log({
      userId,
      projectId: dto.projectId,
      action: 'CREATE',
      entityType: 'REPORT',
      entityId: report.id,
      newValue: { title: report.title },
    });

    return report;
  }

  async findByProject(projectId: string) {
    await this.getProjectOrThrow(projectId);

    return this.prisma.report.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        shareToken: true,
        createdAt: true,
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { creator: { select: { id: true, name: true, email: true } } },
    });
    if (!report) {
      throw new NotFoundException(`Report with id ${id} not found`);
    }
    return report;
  }

  async findByShareToken(shareToken: string) {
    const report = await this.prisma.report.findUnique({
      where: { shareToken },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }
}
