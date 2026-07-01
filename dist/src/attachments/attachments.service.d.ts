import { PrismaService } from '../prisma/prisma.service';
import { AttachmentType } from '../../generated/prisma/enums.js';
export declare class AttachmentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private assertTestRunExists;
    create(testRunId: string, file: Express.Multer.File): Promise<{
        id: string;
        createdAt: Date;
        type: AttachmentType;
        testRunId: string;
        fileUrl: string;
    }>;
    findByTestRun(testRunId: string): Promise<{
        id: string;
        createdAt: Date;
        type: AttachmentType;
        testRunId: string;
        fileUrl: string;
    }[]>;
    remove(id: string, userId: string): Promise<{
        id: string;
    }>;
}
