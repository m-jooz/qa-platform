import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { JiraService } from '../jira/jira.service';
import { Platform, Priority } from '../../generated/prisma/enums.js';
import { GenerateReportDto } from './dto/generate-report.dto';
export declare class ReportsService {
    private readonly prisma;
    private readonly activityLogs;
    private readonly jiraService;
    constructor(prisma: PrismaService, activityLogs: ActivityLogsService, jiraService: JiraService);
    private getProjectOrThrow;
    private rate;
    private computeOverview;
    private groupByPlatform;
    private groupByPriority;
    getDashboard(projectId: string, userId: string): Promise<{
        project: {
            id: string;
            name: string;
            type: import("../../generated/prisma/enums.js").ProjectType;
        };
        overview: {
            totalTestCases: number;
            totalTestRuns: number;
            passRate: number;
            failRate: number;
            blockedRate: number;
            totalBugs: number;
            pendingBugs: number;
            approvedBugs: number;
            rejectedBugs: number;
        };
        byPlatform: {
            platform: Platform;
            total: number;
            pass: number;
            fail: number;
        }[];
        byPriority: {
            priority: Priority;
            total: number;
            pass: number;
            fail: number;
        }[];
        recentActivity: {
            id: string;
            action: string;
            entityType: string;
            entityId: string;
            userName: string;
            createdAt: Date;
        }[];
        unseenJiraTasks: number;
        pendingBugReviews: {
            id: string;
            severity: import("../../generated/prisma/enums.js").Severity | null;
            testCaseTitle: string;
            executedByName: string;
            executedAt: Date;
        }[];
    }>;
    generate(dto: GenerateReportDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        createdBy: string;
        projectId: string;
        title: string;
        filters: import("@prisma/client/runtime/client").JsonValue | null;
        data: import("@prisma/client/runtime/client").JsonValue | null;
        shareToken: string;
    }>;
    findByProject(projectId: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        shareToken: string;
        creator: {
            id: string;
            name: string;
            email: string;
        };
    }[]>;
    findOne(id: string): Promise<{
        creator: {
            id: string;
            name: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        createdBy: string;
        projectId: string;
        title: string;
        filters: import("@prisma/client/runtime/client").JsonValue | null;
        data: import("@prisma/client/runtime/client").JsonValue | null;
        shareToken: string;
    }>;
    findByShareToken(shareToken: string): Promise<{
        id: string;
        createdAt: Date;
        createdBy: string;
        projectId: string;
        title: string;
        filters: import("@prisma/client/runtime/client").JsonValue | null;
        data: import("@prisma/client/runtime/client").JsonValue | null;
        shareToken: string;
    }>;
}
