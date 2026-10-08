import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface MaterialUpload { buffer: Buffer; mimetype: string; size: number; }
@Injectable()
export class MaterialService {
  private directory = resolve(process.env.MATERIAL_UPLOAD_DIR || './uploads/materials');
  constructor(private prisma: PrismaService) {}
  async getMaterials(userRole: Role, userId: string) {
    const where = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN ? {} : userRole === Role.LECTURER ? { uploaderId: userId } : { session: { studentId: userId } };
    return this.prisma.material.findMany({ where, include: { session: { select: { studentId: true, startsAt: true, lesson: { select: { module: { select: { learningPathId: true } } } } } } }, orderBy: { title: 'asc' } });
  }
  async upload(uploaderId: string, role: Role, title: string, file: MaterialUpload | undefined, sessionId?: string) {
    if (!file || !file.buffer || file.size === 0 || file.size > 10 * 1024 * 1024 || typeof title !== 'string' || !title.trim() || title.trim().length > 200) throw new BadRequestException('Choose a file up to 10 MB and a title up to 200 characters');
    const signatures: Record<string, { extension: string; valid: boolean }> = {
      'application/pdf': { extension: 'pdf', valid: file.buffer.subarray(0, 5).toString() === '%PDF-' },
      'image/png': { extension: 'png', valid: file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
      'image/jpeg': { extension: 'jpg', valid: file.buffer[0] === 255 && file.buffer[1] === 216 && file.buffer[2] === 255 },
    };
    const type = signatures[file.mimetype];
    if (!type?.valid) throw new BadRequestException('Only valid PDF, PNG, and JPEG files are supported');
    if (role === Role.LECTURER && !sessionId) throw new BadRequestException('Choose a session to share the file with its student');
    if (sessionId) {
      const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) throw new NotFoundException('Session not found');
      if (role === Role.LECTURER && session.lecturerId !== uploaderId) throw new ForbiddenException('You can only upload to your own sessions');
    }
    const filename = `${randomUUID()}.${type.extension}`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, filename), file.buffer, { flag: 'wx' });
    try {
      return await this.prisma.material.create({ data: { uploaderId, sessionId: sessionId || null, title: title.trim(), fileType: file.mimetype, fileSize: file.size, fileUrl: `local:${filename}`, virusScanStatus: 'NOT_SCANNED' } });
    } catch (error) { await unlink(join(this.directory, filename)); throw error; }
  }
  async getFile(id: string, role: Role, userId: string) {
    const material = await this.prisma.material.findUnique({ where: { id }, include: { session: true } });
    if (!material) throw new NotFoundException('Material not found');
    if (role !== Role.ADMIN && role !== Role.SUPER_ADMIN && material.uploaderId !== userId && !(role === Role.STUDENT && material.session?.studentId === userId)) throw new ForbiddenException('This file is not shared with you');
    const filename = material.fileUrl.replace(/^local:/, '');
    if (!/^local:[a-f0-9-]{36}\.(pdf|png|jpg)$/.test(material.fileUrl)) throw new NotFoundException('File is not available');
    const path = join(this.directory, filename);
    try { await access(path); } catch { throw new NotFoundException('File is not available'); }
    return { path, filename, fileType: material.fileType };
  }
}
