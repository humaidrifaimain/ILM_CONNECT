import { MaterialService } from './material.service';
import { Role } from '@prisma/client';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
describe('Shared material files', () => {
  const prisma = { session: { findUnique: jest.fn() }, material: { create: jest.fn(), findUnique: jest.fn() } };
  let directory: string; let service: MaterialService;
  const file = { buffer: Buffer.from('%PDF-1.4\nDemo resource'), size: 22, mimetype: 'application/pdf' };
  beforeEach(async () => { jest.resetAllMocks(); directory = await mkdtemp(join(tmpdir(), 'ilm-materials-')); process.env.MATERIAL_UPLOAD_DIR = directory; service = new MaterialService(prisma as any); prisma.session.findUnique.mockResolvedValue({ lecturerId: 'lecturer' }); prisma.material.create.mockImplementation(({ data }) => ({ id: 'file', ...data })); });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); delete process.env.MATERIAL_UPLOAD_DIR; });
  it('stores real file bytes and allows its student to download', async () => {
    const material = await service.upload('lecturer', Role.LECTURER, 'Lesson PDF', file, 'session');
    prisma.material.findUnique.mockResolvedValue({ ...material, session: { studentId: 'student' } });
    const result = await service.getFile('file', Role.STUDENT, 'student');
    expect(await readFile(result.path)).toEqual(file.buffer);
    expect(material.virusScanStatus).toBe('NOT_SCANNED');
  });
  it('rejects another lecturer’s session and a student’s unrelated download', async () => {
    await expect(service.upload('outsider', Role.LECTURER, 'PDF', file, 'session')).rejects.toThrow('your own sessions');
    prisma.material.findUnique.mockResolvedValue({ uploaderId: 'lecturer', session: { studentId: 'student' }, fileUrl: 'local:fake.pdf' });
    await expect(service.getFile('file', Role.STUDENT, 'outsider')).rejects.toThrow('not shared with you');
    expect(prisma.material.create).not.toHaveBeenCalled();
  });
  it('rejects invalid file signatures, oversized files, and missing sharing targets', async () => {
    await expect(service.upload('lecturer', Role.LECTURER, 'PDF', { ...file, buffer: Buffer.from('not a PDF') }, 'session')).rejects.toThrow('valid PDF');
    await expect(service.upload('lecturer', Role.LECTURER, 'PDF', { ...file, size: 20 * 1024 * 1024 }, 'session')).rejects.toThrow('10 MB');
    await expect(service.upload('lecturer', Role.LECTURER, 'PDF', file)).rejects.toThrow('Choose a session');
  });
  it('refuses placeholder or path traversal URLs', async () => {
    prisma.material.findUnique.mockResolvedValue({ uploaderId: 'lecturer', fileUrl: 'local:../../private.pdf' });
    await expect(service.getFile('file', Role.LECTURER, 'lecturer')).rejects.toThrow('not available');
  });
});
