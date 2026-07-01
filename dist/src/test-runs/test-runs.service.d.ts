import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JiraService } from '../jira/jira.service';
import { BugStatus, TestRunStatus } from '../../generated/prisma/enums.js';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { ApproveBugDto } from './dto/approve-bug.dto';
import { RejectBugDto } from './dto/reject-bug.dto';
export declare class TestRunsService {
    private readonly prisma;
    private readonly activityLogs;
    private readonly notifications;
    private readonly jiraService;
    constructor(prisma: PrismaService, activityLogs: ActivityLogsService, notifications: NotificationsService, jiraService: JiraService);
    private findTestRunOrThrow;
    create(dto: CreateTestRunDto, userId: string): Promise<{
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
        status: TestRunStatus;
        actualResult: string | null;
        notes: string | null;
        severity: import("../../generated/prisma/enums.js").Severity | null;
        isBug: boolean;
        bugDetails: string | null;
        bugStatus: BugStatus | null;
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
    findByTestCase(testCaseId: string): Promise<({
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
        status: TestRunStatus;
        actualResult: string | null;
        notes: string | null;
        severity: import("../../generated/prisma/enums.js").Severity | null;
        isBug: boolean;
        bugDetails: string | null;
        bugStatus: BugStatus | null;
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
        status: TestRunStatus;
        actualResult: string | null;
        notes: string | null;
        severity: import("../../generated/prisma/enums.js").Severity | null;
        isBug: boolean;
        bugDetails: string | null;
        bugStatus: BugStatus | null;
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
    approveBug(id: string, dto: ApproveBugDto, userId: string): Promise<{
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
        status: TestRunStatus;
        actualResult: string | null;
        notes: string | null;
        severity: import("../../generated/prisma/enums.js").Severity | null;
        isBug: boolean;
        bugDetails: string | null;
        bugStatus: BugStatus | null;
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
    rejectBug(id: string, dto: RejectBugDto, userId: string): Promise<{
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
        status: TestRunStatus;
        actualResult: string | null;
        notes: string | null;
        severity: import("../../generated/prisma/enums.js").Severity | null;
        isBug: boolean;
        bugDetails: string | null;
        bugStatus: BugStatus | null;
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
    private buildBugCommentBody;
}
