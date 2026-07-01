import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
export declare class TestCasesService {
    private readonly prisma;
    private readonly activityLogs;
    constructor(prisma: PrismaService, activityLogs: ActivityLogsService);
    private assertProjectExists;
    private assertJiraTaskBelongsToProject;
    private findExistingOrThrow;
    create(dto: CreateTestCaseDto, userId: string): Promise<{
        jiraTask: {
            id: string;
            jiraKey: string;
            title: string;
            currentStatus: string | null;
        } | null;
        creator: {
            id: string;
            name: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        type: import("../../generated/prisma/enums").TestCaseType;
        createdBy: string;
        projectId: string;
        title: string;
        jiraTaskId: string | null;
        steps: string;
        expectedResult: string;
        platform: import("../../generated/prisma/enums").Platform;
        priority: import("../../generated/prisma/enums").Priority;
    }>;
    findByProject(projectId: string): Promise<({
        jiraTask: {
            id: string;
            jiraKey: string;
            title: string;
            currentStatus: string | null;
        } | null;
        creator: {
            id: string;
            name: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        type: import("../../generated/prisma/enums").TestCaseType;
        createdBy: string;
        projectId: string;
        title: string;
        jiraTaskId: string | null;
        steps: string;
        expectedResult: string;
        platform: import("../../generated/prisma/enums").Platform;
        priority: import("../../generated/prisma/enums").Priority;
    })[]>;
    findOne(id: string): Promise<{
        project: {
            id: string;
            name: string;
        };
        jiraTask: {
            id: string;
            jiraKey: string;
            title: string;
            currentStatus: string | null;
        } | null;
        creator: {
            id: string;
            name: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        type: import("../../generated/prisma/enums").TestCaseType;
        createdBy: string;
        projectId: string;
        title: string;
        jiraTaskId: string | null;
        steps: string;
        expectedResult: string;
        platform: import("../../generated/prisma/enums").Platform;
        priority: import("../../generated/prisma/enums").Priority;
    }>;
    update(id: string, dto: UpdateTestCaseDto, userId: string): Promise<{
        jiraTask: {
            id: string;
            jiraKey: string;
            title: string;
            currentStatus: string | null;
        } | null;
        creator: {
            id: string;
            name: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        type: import("../../generated/prisma/enums").TestCaseType;
        createdBy: string;
        projectId: string;
        title: string;
        jiraTaskId: string | null;
        steps: string;
        expectedResult: string;
        platform: import("../../generated/prisma/enums").Platform;
        priority: import("../../generated/prisma/enums").Priority;
    }>;
    remove(id: string, userId: string): Promise<{
        id: string;
    }>;
}
