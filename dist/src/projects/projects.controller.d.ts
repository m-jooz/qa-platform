import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    create(dto: CreateProjectDto, user: AuthenticatedUser): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        type: import("../../generated/prisma/enums.js").ProjectType;
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
        type: import("../../generated/prisma/enums.js").ProjectType;
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
        type: import("../../generated/prisma/enums.js").ProjectType;
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
    update(id: string, dto: UpdateProjectDto, user: AuthenticatedUser): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        type: import("../../generated/prisma/enums.js").ProjectType;
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
    remove(id: string, user: AuthenticatedUser): Promise<{
        id: string;
    }>;
}
