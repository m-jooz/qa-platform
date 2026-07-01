import { TestRunsService } from './test-runs.service';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { ApproveBugDto } from './dto/approve-bug.dto';
import { RejectBugDto } from './dto/reject-bug.dto';
import { FindTestRunsQueryDto } from './dto/find-test-runs-query.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
export declare class TestRunsController {
    private readonly testRunsService;
    constructor(testRunsService: TestRunsService);
    create(dto: CreateTestRunDto, user: AuthenticatedUser): Promise<{
        testCase: {
            id: string;
            projectId: string;
            title: string;
            jiraTaskId: string | null;
            steps: string;
            expectedResult: string;
            platform: import("../../generated/prisma/enums.js").Platform;
        };
        executor: {
            id: string;
            name: string;
            email: string;
        };
        bugReviewer: {
            id: string;
            name: string;
            email: string;
        } | null;
        attachments: {
            id: string;
            createdAt: Date;
            type: import("../../generated/prisma/enums.js").AttachmentType;
            testRunId: string;
            fileUrl: string;
        }[];
    } & {
        id: string;
        testCaseId: string;
        status: import("../../generated/prisma/enums.js").TestRunStatus;
        actualResult: string | null;
        notes: string | null;
        severity: import("../../generated/prisma/enums.js").Severity | null;
        isBug: boolean;
        bugDetails: string | null;
        bugStatus: import("../../generated/prisma/enums.js").BugStatus | null;
        bugReviewedBy: string | null;
        bugReviewedAt: Date | null;
        rejectReason: string | null;
        jiraCommentId: string | null;
        jiraStatusBefore: string | null;
        jiraStatusAfter: string | null;
        jiraReassignedTo: string | null;
        retestOfRunId: string | null;
        executedBy: string;
        executedAt: Date;
    }>;
    findByTestCase(query: FindTestRunsQueryDto): Promise<({
        testCase: {
            id: string;
            projectId: string;
            title: string;
            jiraTaskId: string | null;
            steps: string;
            expectedResult: string;
            platform: import("../../generated/prisma/enums.js").Platform;
        };
        executor: {
            id: string;
            name: string;
            email: string;
        };
        bugReviewer: {
            id: string;
            name: string;
            email: string;
        } | null;
        attachments: {
            id: string;
            createdAt: Date;
            type: import("../../generated/prisma/enums.js").AttachmentType;
            testRunId: string;
            fileUrl: string;
        }[];
    } & {
        id: string;
        testCaseId: string;
        status: import("../../generated/prisma/enums.js").TestRunStatus;
        actualResult: string | null;
        notes: string | null;
        severity: import("../../generated/prisma/enums.js").Severity | null;
        isBug: boolean;
        bugDetails: string | null;
        bugStatus: import("../../generated/prisma/enums.js").BugStatus | null;
        bugReviewedBy: string | null;
        bugReviewedAt: Date | null;
        rejectReason: string | null;
        jiraCommentId: string | null;
        jiraStatusBefore: string | null;
        jiraStatusAfter: string | null;
        jiraReassignedTo: string | null;
        retestOfRunId: string | null;
        executedBy: string;
        executedAt: Date;
    })[]>;
    findOne(id: string): Promise<{
        testCase: {
            id: string;
            projectId: string;
            title: string;
            jiraTaskId: string | null;
            steps: string;
            expectedResult: string;
            platform: import("../../generated/prisma/enums.js").Platform;
        };
        executor: {
            id: string;
            name: string;
            email: string;
        };
        bugReviewer: {
            id: string;
            name: string;
            email: string;
        } | null;
        attachments: {
            id: string;
            createdAt: Date;
            type: import("../../generated/prisma/enums.js").AttachmentType;
            testRunId: string;
            fileUrl: string;
        }[];
    } & {
        id: string;
        testCaseId: string;
        status: import("../../generated/prisma/enums.js").TestRunStatus;
        actualResult: string | null;
        notes: string | null;
        severity: import("../../generated/prisma/enums.js").Severity | null;
        isBug: boolean;
        bugDetails: string | null;
        bugStatus: import("../../generated/prisma/enums.js").BugStatus | null;
        bugReviewedBy: string | null;
        bugReviewedAt: Date | null;
        rejectReason: string | null;
        jiraCommentId: string | null;
        jiraStatusBefore: string | null;
        jiraStatusAfter: string | null;
        jiraReassignedTo: string | null;
        retestOfRunId: string | null;
        executedBy: string;
        executedAt: Date;
    }>;
    approveBug(id: string, dto: ApproveBugDto, user: AuthenticatedUser): Promise<{
        testCase: {
            id: string;
            projectId: string;
            title: string;
            jiraTaskId: string | null;
            steps: string;
            expectedResult: string;
            platform: import("../../generated/prisma/enums.js").Platform;
        };
        executor: {
            id: string;
            name: string;
            email: string;
        };
        bugReviewer: {
            id: string;
            name: string;
            email: string;
        } | null;
        attachments: {
            id: string;
            createdAt: Date;
            type: import("../../generated/prisma/enums.js").AttachmentType;
            testRunId: string;
            fileUrl: string;
        }[];
    } & {
        id: string;
        testCaseId: string;
        status: import("../../generated/prisma/enums.js").TestRunStatus;
        actualResult: string | null;
        notes: string | null;
        severity: import("../../generated/prisma/enums.js").Severity | null;
        isBug: boolean;
        bugDetails: string | null;
        bugStatus: import("../../generated/prisma/enums.js").BugStatus | null;
        bugReviewedBy: string | null;
        bugReviewedAt: Date | null;
        rejectReason: string | null;
        jiraCommentId: string | null;
        jiraStatusBefore: string | null;
        jiraStatusAfter: string | null;
        jiraReassignedTo: string | null;
        retestOfRunId: string | null;
        executedBy: string;
        executedAt: Date;
    }>;
    rejectBug(id: string, dto: RejectBugDto, user: AuthenticatedUser): Promise<{
        testCase: {
            id: string;
            projectId: string;
            title: string;
            jiraTaskId: string | null;
            steps: string;
            expectedResult: string;
            platform: import("../../generated/prisma/enums.js").Platform;
        };
        executor: {
            id: string;
            name: string;
            email: string;
        };
        bugReviewer: {
            id: string;
            name: string;
            email: string;
        } | null;
        attachments: {
            id: string;
            createdAt: Date;
            type: import("../../generated/prisma/enums.js").AttachmentType;
            testRunId: string;
            fileUrl: string;
        }[];
    } & {
        id: string;
        testCaseId: string;
        status: import("../../generated/prisma/enums.js").TestRunStatus;
        actualResult: string | null;
        notes: string | null;
        severity: import("../../generated/prisma/enums.js").Severity | null;
        isBug: boolean;
        bugDetails: string | null;
        bugStatus: import("../../generated/prisma/enums.js").BugStatus | null;
        bugReviewedBy: string | null;
        bugReviewedAt: Date | null;
        rejectReason: string | null;
        jiraCommentId: string | null;
        jiraStatusBefore: string | null;
        jiraStatusAfter: string | null;
        jiraReassignedTo: string | null;
        retestOfRunId: string | null;
        executedBy: string;
        executedAt: Date;
    }>;
}
