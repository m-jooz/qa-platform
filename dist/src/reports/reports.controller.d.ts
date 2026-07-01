import { ReportsService } from './reports.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { FindReportsQueryDto } from './dto/find-reports-query.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getDashboard(query: DashboardQueryDto, user: AuthenticatedUser): Promise<{
        project: {
            id: string;
            name: string;
            type: import("../../generated/prisma/enums").ProjectType;
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
            platform: import("../../generated/prisma/enums").Platform;
            total: number;
            pass: number;
            fail: number;
        }[];
        byPriority: {
            priority: import("../../generated/prisma/enums").Priority;
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
            severity: import("../../generated/prisma/enums").Severity | null;
            testCaseTitle: string;
            executedByName: string;
            executedAt: Date;
        }[];
    }>;
    generate(dto: GenerateReportDto, user: AuthenticatedUser): Promise<{
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
    findByProject(query: FindReportsQueryDto): Promise<{
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
}
