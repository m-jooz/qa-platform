import { PrismaService } from '../prisma/prisma.service';
export interface CreateNotificationParams {
    userId: string;
    message: string;
    entityType: string;
    entityId: string;
}
export declare class NotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(params: CreateNotificationParams): import("../../generated/prisma/models").Prisma__NotificationClient<{
        id: string;
        createdAt: Date;
        userId: string;
        message: string;
        entityType: string;
        entityId: string;
        isRead: boolean;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, {
        omit: import("../../generated/prisma/internal/prismaNamespace").GlobalOmitConfig | undefined;
    }>;
    findAllForUser(userId: string): Promise<{
        notifications: {
            id: string;
            createdAt: Date;
            userId: string;
            message: string;
            entityType: string;
            entityId: string;
            isRead: boolean;
        }[];
        unreadCount: number;
    }>;
    markRead(id: string, userId: string): Promise<{
        notifications: {
            id: string;
            createdAt: Date;
            userId: string;
            message: string;
            entityType: string;
            entityId: string;
            isRead: boolean;
        }[];
        unreadCount: number;
    }>;
    markAllRead(userId: string): Promise<{
        notifications: {
            id: string;
            createdAt: Date;
            userId: string;
            message: string;
            entityType: string;
            entityId: string;
            isRead: boolean;
        }[];
        unreadCount: number;
    }>;
}
