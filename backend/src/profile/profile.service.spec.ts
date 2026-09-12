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
          user: true,
          assignedLecturer: true,
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
