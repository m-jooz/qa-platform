import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '../../generated/prisma/client.js';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateUserDto, role?: Role): Promise<{
        id: string;
        name: string;
        email: string;
        passwordHash: string;
        role: Role;
        createdAt: Date;
    }>;
    findByEmail(email: string): Prisma.Prisma__UserClient<{
        id: string;
        name: string;
        email: string;
        passwordHash: string;
        role: Role;
        createdAt: Date;
    } | null, null, import("@prisma/client/runtime/client").DefaultArgs, {
        omit: Prisma.GlobalOmitConfig | undefined;
    }>;
    findById(id: string): Promise<{
        id: string;
        name: string;
        email: string;
        role: Role;
        createdAt: Date;
    }>;
    findAll(): Prisma.PrismaPromise<{
        id: string;
        name: string;
        email: string;
        role: Role;
        createdAt: Date;
    }[]>;
    updateRole(id: string, dto: UpdateUserRoleDto): Promise<{
        id: string;
        name: string;
        email: string;
        role: Role;
        createdAt: Date;
    }>;
    remove(id: string): Promise<{
        id: string;
    }>;
}
