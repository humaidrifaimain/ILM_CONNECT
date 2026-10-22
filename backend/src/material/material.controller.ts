import { Controller, Get, Post, Body, UseGuards, Request, Param, UploadedFile, UseInterceptors, StreamableFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'node:fs';
import { Response } from 'express';
import { MaterialService, MaterialUpload } from './material.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
@Controller('materials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}
  @Get()
  getMaterials(@Request() req: any) { return this.materialService.getMaterials(req.user.role, req.user.id); }
  @Post('upload')
  @Roles(Role.LECTURER, Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  upload(@Request() req: any, @Body('title') title: string, @UploadedFile() file: MaterialUpload, @Body('sessionId') sessionId?: string) {
    return this.materialService.upload(req.user.id, req.user.role, title, file, sessionId);
  }
  @Get(':id/file')
  async download(@Param('id') id: string, @Request() req: any, @Res({ passthrough: true }) response: Response) {
    const file = await this.materialService.getFile(id, req.user.role, req.user.id);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(createReadStream(file.path), { type: file.fileType, disposition: `attachment; filename="${file.filename}"` });
  }
}
