import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
export declare class ProjectsService {
    private readonly prisma;
    private readonly activityLogs;
    constructor(prisma: PrismaService, activityLogs: ActivityLogsService);
    create(dto: CreateProjectDto, userId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        type: import("../../generated/prisma/enums").ProjectType;
        description: string | null;
        jiraProjectKey: string | null;
        jiraBaseUrl: string | null;
        createdBy: string;
        creator: {
            id: string;
            name: string;
            email: string;
        };
    }>;
    findAll(): import("../../generated/prisma/internal/prismaNamespace").PrismaPromise<{
        id: string;
        name: string;
        createdAt: Date;
        type: import("../../generated/prisma/enums").ProjectType;
        description: string | null;
        jiraProjectKey: string | null;
        jiraBaseUrl: string | null;
        createdBy: string;
        creator: {
            id: string;
            name: string;
            email: string;
        };
    }[]>;
    findOne(id: string): Promise<{
        stats: {
            testCasesCount: number;
            jiraTasksCount: number;
        };
        id: string;
        name: string;
        createdAt: Date;
        type: import("../../generated/prisma/enums").ProjectType;
        description: string | null;
        jiraProjectKey: string | null;
        jiraBaseUrl: string | null;
        createdBy: string;
        creator: {
            id: string;
            name: string;
            email: string;
        };
    }>;
    private findExistingOrThrow;
    update(id: string, dto: UpdateProjectDto, userId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        type: import("../../generated/prisma/enums").ProjectType;
        description: string | null;
        jiraProjectKey: string | null;
        jiraBaseUrl: string | null;
        createdBy: string;
        creator: {
            id: string;
            name: string;
            email: string;
        };
    }>;
    remove(id: string, userId: string): Promise<{
        id: string;
    }>;
}
