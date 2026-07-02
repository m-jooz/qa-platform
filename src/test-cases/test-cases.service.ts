import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { FindTestCasesQueryDto } from './dto/find-test-cases-query.dto';
import { paginate } from '../common/dto/pagination-query.dto';
import type { Prisma } from '../generated/prisma/client.js';

const testCaseInclude = {
  creator: { select: { id: true, name: true, email: true } },
  jiraTask: {
    select: {
      id: true,
      jiraKey: true,
      title: true,
      currentStatus: true,
      jiraUrl: true,
    },
  },
} as const;

@Injectable()
export class TestCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  private async assertProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
    return project;
  }

  private async assertJiraTaskBelongsToProject(
    jiraTaskId: string,
    projectId: string,
  ) {
    const jiraTask = await this.prisma.jiraTask.findUnique({
      where: { id: jiraTaskId },
    });
    if (!jiraTask || jiraTask.projectId !== projectId) {
      throw new BadRequestException(
        `Jira task with id ${jiraTaskId} does not belong to project ${projectId}`,
      );
    }
  }

  private async findExistingOrThrow(id: string) {
    const testCase = await this.prisma.testCase.findUnique({ where: { id } });
    if (!testCase) {
      throw new NotFoundException(`Test case with id ${id} not found`);
    }
    return testCase;
  }

  async create(dto: CreateTestCaseDto, userId: string) {
    await this.assertProjectExists(dto.projectId);
    if (dto.jiraTaskId) {
      await this.assertJiraTaskBelongsToProject(dto.jiraTaskId, dto.projectId);
    }

    const testCase = await this.prisma.testCase.create({
      data: { ...dto, createdBy: userId },
      include: testCaseInclude,
    });

    await this.activityLogs.log({
      userId,
      projectId: dto.projectId,
      action: 'CREATE',
      entityType: 'TEST_CASE',
      entityId: testCase.id,
      newValue: testCase,
    });

    return testCase;
  }

  async findByProject(query: FindTestCasesQueryDto) {
    await this.assertProjectExists(query.projectId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.TestCaseWhereInput = {
      projectId: query.projectId,
      ...(query.platform && { platform: query.platform }),
      ...(query.priority && { priority: query.priority }),
      ...(query.type && { type: query.type }),
      ...(query.search && {
        title: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [testCases, total] = await Promise.all([
      this.prisma.testCase.findMany({
        where,
        include: testCaseInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.testCase.count({ where }),
    ]);

    return paginate(testCases, total, page, limit);
  }

  async findOne(id: string) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id },
      include: {
        ...testCaseInclude,
        project: { select: { id: true, name: true } },
      },
    });

    if (!testCase) {
      throw new NotFoundException(`Test case with id ${id} not found`);
    }

    return testCase;
  }

  async update(id: string, dto: UpdateTestCaseDto, userId: string) {
    const existing = await this.findExistingOrThrow(id);

    if (dto.jiraTaskId) {
      await this.assertJiraTaskBelongsToProject(
        dto.jiraTaskId,
        existing.projectId,
      );
    }

    const updated = await this.prisma.testCase.update({
      where: { id },
      data: dto,
      include: testCaseInclude,
    });

    await this.activityLogs.log({
      userId,
      projectId: existing.projectId,
      action: 'UPDATE',
      entityType: 'TEST_CASE',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const existing = await this.findExistingOrThrow(id);

    await this.prisma.testCase.delete({ where: { id } });

    await this.activityLogs.log({
      userId,
      projectId: existing.projectId,
      action: 'DELETE',
      entityType: 'TEST_CASE',
      entityId: id,
      oldValue: existing,
    });

    return { id };
  }
}
