import { AttachmentsService } from './attachments.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
export declare class AttachmentsController {
    private readonly attachmentsService;
    constructor(attachmentsService: AttachmentsService);
    upload(testRunId: string, file: Express.Multer.File): Promise<{
        id: string;
        createdAt: Date;
        type: import("../../generated/prisma/enums").AttachmentType;
        testRunId: string;
        fileUrl: string;
    }>;
    findByTestRun(testRunId: string): Promise<{
        id: string;
        createdAt: Date;
        type: import("../../generated/prisma/enums").AttachmentType;
        testRunId: string;
        fileUrl: string;
    }[]>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        id: string;
    }>;
}
