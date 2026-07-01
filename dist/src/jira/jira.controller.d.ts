import { JiraService } from './jira.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
export declare class JiraController {
    private readonly jiraService;
    constructor(jiraService: JiraService);
    sync(projectId: string, user: AuthenticatedUser): Promise<{
        syncedCount: number;
        tasks: {
            id: string;
            projectId: string;
            jiraKey: string;
            title: string;
            currentStatus: string | null;
            currentAssignee: string | null;
            jiraUrl: string | null;
            jiraUpdatedAt: Date | null;
            syncedAt: Date;
        }[];
    }>;
    listTasks(projectId: string, user: AuthenticatedUser): Promise<{
        unseen: boolean;
        id: string;
        projectId: string;
        jiraKey: string;
        title: string;
        currentStatus: string | null;
        currentAssignee: string | null;
        jiraUrl: string | null;
        jiraUpdatedAt: Date | null;
        syncedAt: Date;
    }[]>;
    getTask(projectId: string, taskId: string, user: AuthenticatedUser): Promise<{
        unseen: boolean;
        id: string;
        projectId: string;
        jiraKey: string;
        title: string;
        currentStatus: string | null;
        currentAssignee: string | null;
        jiraUrl: string | null;
        jiraUpdatedAt: Date | null;
        syncedAt: Date;
    }>;
    markSeen(projectId: string, taskId: string, user: AuthenticatedUser): Promise<{
        id: string;
        jiraTaskId: string;
        userId: string;
        seenAt: Date;
    }>;
}
