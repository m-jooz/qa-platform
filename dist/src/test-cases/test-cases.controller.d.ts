import { TestCasesService } from './test-cases.service';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { FindTestCasesQueryDto } from './dto/find-test-cases-query.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
export declare class TestCasesController {
    private readonly testCasesService;
    constructor(testCasesService: TestCasesService);
    create(dto: CreateTestCaseDto, user: AuthenticatedUser): Promise<{
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
        type: import("../../generated/prisma/enums.js").TestCaseType;
        createdBy: string;
        projectId: string;
        title: string;
        jiraTaskId: string | null;
        steps: string;
        expectedResult: string;
        platform: import("../../generated/prisma/enums.js").Platform;
        priority: import("../../generated/prisma/enums.js").Priority;
    }>;
    findByProject(query: FindTestCasesQueryDto): Promise<({
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
        type: import("../../generated/prisma/enums.js").TestCaseType;
        createdBy: string;
        projectId: string;
        title: string;
        jiraTaskId: string | null;
        steps: string;
        expectedResult: string;
        platform: import("../../generated/prisma/enums.js").Platform;
        priority: import("../../generated/prisma/enums.js").Priority;
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
        type: import("../../generated/prisma/enums.js").TestCaseType;
        createdBy: string;
        projectId: string;
        title: string;
        jiraTaskId: string | null;
        steps: string;
        expectedResult: string;
        platform: import("../../generated/prisma/enums.js").Platform;
        priority: import("../../generated/prisma/enums.js").Priority;
    }>;
    update(id: string, dto: UpdateTestCaseDto, user: AuthenticatedUser): Promise<{
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
        type: import("../../generated/prisma/enums.js").TestCaseType;
        createdBy: string;
        projectId: string;
        title: string;
        jiraTaskId: string | null;
        steps: string;
        expectedResult: string;
        platform: import("../../generated/prisma/enums.js").Platform;
        priority: import("../../generated/prisma/enums.js").Priority;
    }>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        id: string;
    }>;
}
