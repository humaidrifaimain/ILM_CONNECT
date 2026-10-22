import { ProgressService } from './progress.service';
import { Role } from '@prisma/client';
describe('Course progress and assessment results', () => {
  const prisma = { studentProfile: { findUnique: jest.fn() }, studentProgress: { findUnique: jest.fn(), update: jest.fn() }, module: { findMany: jest.fn() }, progressReport: { create: jest.fn(), findMany: jest.fn() } };
  const service = new ProgressService(prisma as any);
  const user = { id: 'lecturer', role: Role.LECTURER };
  beforeEach(() => { jest.resetAllMocks(); prisma.studentProfile.findUnique.mockResolvedValue({ assignedLecturerId: 'lecturer' }); prisma.studentProgress.findUnique.mockResolvedValue({ currentLearningPathId: 'course', currentLessonId: 'lesson-1' }); });
  it('advances in module order and updates the real lesson cursor', async () => {
    prisma.module.findMany.mockResolvedValue([{ lessons: [{ id: 'lesson-1', moduleId: 'module' }, { id: 'lesson-2', moduleId: 'module' }] }]);
    await service.advanceProgress('student', user);
    expect(prisma.studentProgress.update).toHaveBeenCalledWith({ where: { studentId: 'student' }, data: { currentLessonId: 'lesson-2', currentModuleId: 'module', progressPercentage: 100 } });
  });
  it('rejects another lecturer and cannot advance beyond the final lesson', async () => {
    await expect(service.advanceProgress('student', { ...user, id: 'outsider' })).rejects.toThrow('not assigned');
    prisma.module.findMany.mockResolvedValue([{ lessons: [{ id: 'lesson-1' }] }]);
    await expect(service.advanceProgress('student', user)).rejects.toThrow('No next lesson');
    expect(prisma.studentProgress.update).not.toHaveBeenCalled();
  });
  it('stores a real assessment score and student-visible feedback', async () => {
    const result = await service.recordAssessment(user, { studentId: 'student', title: 'Recitation', score: 82, feedback: 'Work on elongation.' });
    expect(result).toEqual(expect.objectContaining({ score: 82, courseId: 'course', feedback: 'Work on elongation.' }));
    expect(prisma.progressReport.create).toHaveBeenCalledWith({ data: expect.objectContaining({ studentId: 'student', lecturerId: 'lecturer', contentJson: { assessments: [result] } }) });
  });
  it.each([-1, 101, NaN])('rejects score %s', async score => {
    await expect(service.recordAssessment(user, { studentId: 'student', title: 'Assessment', score, feedback: '' })).rejects.toThrow('score from');
    expect(prisma.progressReport.create).not.toHaveBeenCalled();
  });
  it('reads only the current student’s assessment results', async () => {
    prisma.progressReport.findMany.mockResolvedValue([{ periodMonth: '2026-09', contentJson: { assessments: [{ id: 'result', score: 82 }] } }, { periodMonth: '2026-08', contentJson: { privateNotes: 'not student-visible' } }]);
    await expect(service.getAssessments('student')).resolves.toEqual([{ id: 'result', score: 82, reportMonth: '2026-09' }]);
    expect(prisma.progressReport.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 'student' } }));
  });
});
