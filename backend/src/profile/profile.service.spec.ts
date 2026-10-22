import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  describe('getStudentProfile', () => {
    it('returns lecturer-granted progress with the student profile', async () => {
      const profile = {
        userId: 'student-1',
        progress: {
          currentLearningPathId: 'path-1',
          currentModuleId: 'module-1',
          currentLessonId: 'lesson-2',
          progressPercentage: 50,
        },
      };
      const prisma = {
        studentProfile: {
          findUnique: jest.fn().mockResolvedValue(profile),
        },
      };
      const service = new ProfileService(prisma as any);

      await expect(service.getStudentProfile('student-1')).resolves.toEqual(profile);
      expect(prisma.studentProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'student-1' },
        include: {
          user: { select: { id: true, email: true, role: true, status: true } },
          assignedLecturer: { select: { userId: true, fullName: true, bio: true, qualifications: true, languages: true, specializations: true, ratingAvg: true, ratingCount: true, hourlyAvailabilityJson: true } },
          progress: {
            include: {
              currentLearningPath: true,
              currentModule: true,
              currentLesson: true,
            },
          },
        },
      });
    });
  });
});

describe('Editable profile fields', () => {
  const prisma = { studentProfile: { update: jest.fn() }, lecturerProfile: { update: jest.fn() } };
  const service = new ProfileService(prisma as any);
  beforeEach(() => jest.resetAllMocks());
  it('prevents student settings from changing assignments or tiers', async () => {
    await expect(service.updateStudentProfile('student', { assignedLecturerId: 'another' })).rejects.toThrow('cannot be edited');
    await expect(service.updateStudentProfile('student', { currentTier: 'Premium' })).rejects.toThrow('cannot be edited');
    expect(prisma.studentProfile.update).not.toHaveBeenCalled();
  });
  it('validates timezone and allows actual contact fields', async () => {
    await expect(service.updateStudentProfile('student', { timezone: 'invalid/timezone' })).rejects.toThrow('valid timezone');
    await service.updateStudentProfile('student', { fullName: 'Student', country: 'United Kingdom', timezone: 'Europe/London' });
    expect(prisma.studentProfile.update).toHaveBeenCalledWith({ where: { userId: 'student' }, data: { fullName: 'Student', country: 'United Kingdom', timezone: 'Europe/London' } });
  });
  it('keeps lecturer shift assignments and ratings admin-controlled', async () => {
    await expect(service.updateLecturerProfile('lecturer', { hourlyAvailabilityJson: [0, 1] })).rejects.toThrow('cannot be edited');
    await expect(service.updateLecturerProfile('lecturer', { ratingAvg: 5 })).rejects.toThrow('cannot be edited');
  });
});
