import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentType } from '../generated/prisma/enums.js';
import { UPLOADS_DIR } from './multer.config';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertTestRunExists(testRunId: string) {
    const testRun = await this.prisma.testRun.findUnique({
      where: { id: testRunId },
    });
    if (!testRun) {
      throw new NotFoundException(`Test run with id ${testRunId} not found`);
    }
    return testRun;
  }

  async create(testRunId: string, file: Express.Multer.File) {
    await this.assertTestRunExists(testRunId);

    const type = file.mimetype.startsWith('video')
      ? AttachmentType.VIDEO
      : AttachmentType.IMAGE;

    return this.prisma.attachment.create({
      data: {
        testRunId,
        fileUrl: `/uploads/${file.filename}`,
        type,
      },
    });
  }

  async findByTestRun(testRunId: string) {
    await this.assertTestRunExists(testRunId);

    return this.prisma.attachment.findMany({
      where: { testRunId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      include: { testRun: { select: { executedBy: true } } },
    });

    if (!attachment) {
      throw new NotFoundException(`Attachment with id ${id} not found`);
    }
    if (attachment.testRun.executedBy !== userId) {
      throw new ForbiddenException(
        'Only the owner of the test run may delete this attachment',
      );
    }

    await this.prisma.attachment.delete({ where: { id } });

    const filename = attachment.fileUrl.replace(/^\/uploads\//, '');
    await fs.unlink(join(UPLOADS_DIR, filename)).catch(() => undefined);

    return { id };
  }
}
