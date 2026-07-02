import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const projectSelect = {
  id: true,
  name: true,
  type: true,
  description: true,
  jiraProjectKey: true,
  jiraBaseUrl: true,
  jiraEmail: true,
  createdBy: true,
  createdAt: true,
  creator: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async create(dto: CreateProjectDto, userId: string) {
    const project = await this.prisma.project.create({
      data: { ...dto, createdBy: userId },
      select: projectSelect,
    });

    await this.activityLogs.log({
      userId,
      projectId: project.id,
      action: 'CREATE',
      entityType: 'PROJECT',
      entityId: project.id,
      newValue: project,
    });

    return project;
  }

  async findAll() {
    const projects = await this.prisma.project.findMany({
      select: {
        ...projectSelect,
        _count: { select: { testCases: true, jiraTasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map(({ _count, ...rest }) => ({
      ...rest,
      stats: {
        testCasesCount: _count.testCases,
        jiraTasksCount: _count.jiraTasks,
      },
    }));
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: {
        ...projectSelect,
        _count: { select: { testCases: true, jiraTasks: true } },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    const { _count, ...rest } = project;
    return {
      ...rest,
      stats: {
        testCasesCount: _count.testCases,
        jiraTasksCount: _count.jiraTasks,
      },
    };
  }

  private async findExistingOrThrow(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto, userId: string) {
    const existing = await this.findExistingOrThrow(id);

    const updated = await this.prisma.project.update({
      where: { id },
      data: dto,
      select: projectSelect,
    });

    await this.activityLogs.log({
      userId,
      projectId: id,
      action: 'UPDATE',
      entityType: 'PROJECT',
      entityId: id,
      oldValue: { ...existing, jiraApiToken: undefined },
      newValue: updated,
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const existing = await this.findExistingOrThrow(id);

    await this.prisma.project.delete({ where: { id } });

    await this.activityLogs.log({
      userId,
      projectId: undefined,
      action: 'DELETE',
      entityType: 'PROJECT',
      entityId: id,
      oldValue: { ...existing, jiraApiToken: undefined },
    });

    return { id };
  }
}
