'use client';

import { SharedMaterials } from '@/components/classroom/shared-materials';
import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { FileText, Lock, PlayCircle, Download, X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { downloadFile } from '@/lib/download';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { StudentCard, StudentIconTile, StudentPageHeader, StudentStatusPill, studentUi } from '@/components/student/student-dashboard-ui';



interface Lesson { id: string; title: string; objectives: string; orderIndex: number; durationMinutes: number; }
interface MaterialLesson extends Lesson { slideNumber: number; unlocked: boolean; }
interface LearningPath { id: string; modules: { orderIndex: number; lessons: Lesson[] }[]; }
export default function CourseMaterialsPage() {
  const params = useParams();
  const courseId = params?.courseId as string;
  const [selectedSlide, setSelectedSlide] = useState<MaterialLesson | null>(null);

  const viewer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!selectedSlide) return;
    const element = viewer.current; element?.showModal();
    return () => element?.close();
  }, [selectedSlide]);

  // 1. Fetch student profile to get progress and lecturer permissions
  const { data: studentProfile, isLoading: loadingProfile } = useQuery<{ progress?: { currentLessonId?: string; currentLearningPathId?: string } }>({
    queryKey: ['studentProfile'],
    queryFn: () => apiFetch('/profile/student'),
    staleTime: 0,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  });

  // 2. Fetch learning paths to match the course
  const { data: paths = [], isLoading: loadingPaths } = useQuery<LearningPath[]>({
    queryKey: ['curriculumPaths'],
    queryFn: () => apiFetch('/curriculum/paths'),
  });

  // Find course lessons
  const currentPath = paths.find(
    (p) => p.id === courseId
  );

  const lessons: Lesson[] = [];
  if (currentPath?.modules) {
    const sortedMods = [...currentPath.modules].sort((a, b) => a.orderIndex - b.orderIndex);
    sortedMods.forEach((m) => {
      const sortedLessons = [...(m.lessons || [])].sort((a, b) => a.orderIndex - b.orderIndex);
      sortedLessons.forEach((l) => {
        lessons.push(l);
      });
    });
  }

  const activeSlides = lessons;

  // Determine unlock status based on student progress
  const currentLessonId = studentProfile?.progress?.currentLessonId;
  const hasAccessToCurrentPath =
    Boolean(currentPath?.id) &&
    studentProfile?.progress?.currentLearningPathId === currentPath?.id;
  const currentIdx = hasAccessToCurrentPath && currentLessonId
    ? activeSlides.findIndex((slide) => slide.id === currentLessonId)
    : -1;

  const slidesWithStatus = activeSlides.map((slide, idx) => {
    // A lecturer-granted progress cursor unlocks lessons cumulatively up to that lesson.
    // No permission record means all course content remains locked.
    const isUnlocked = currentIdx >= 0 && idx <= currentIdx;
    return {
      ...slide,
      slideNumber: idx + 1,
      unlocked: isUnlocked,
    };
  });

  const unlockedCount = slidesWithStatus.filter(s => s.unlocked).length;

  if (loadingProfile || loadingPaths) {
    return (
      <LoadingScreen message="Loading Course Materials..." subtitle="Fetching curriculum slides and lesson resources" />
    );
  }

  return (
    <div className={studentUi.page}>
      {/* Header */}
      <StudentPageHeader
        eyebrow="Course"
        title="Course Materials"
        description="Access your lesson outlines and learning resources as your lecturer unlocks each lesson."
        action={
          <StudentStatusPill>
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            {unlockedCount} of {slidesWithStatus.length} Unlocked
          </StudentStatusPill>
        }
      />

      {slidesWithStatus.length === 0 && <p className="rounded-xl border border-[#d6e0db] bg-white p-5 text-sm text-[#56635c]">No course materials are available yet.</p>}
      <SharedMaterials courseId={courseId} />
      {/* Materials Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {slidesWithStatus.map((slide) => (
          <StudentCard
            key={slide.id}
            className={`relative p-4 transition-all ${
              slide.unlocked
                ? 'cursor-pointer hover:border-[#b9cac2] hover:shadow-md'
                : 'bg-[#f5f7f6] opacity-75'
            }`}
          >
            <div className="mb-4 flex items-start justify-between">
              <StudentIconTile icon={FileText} tone={slide.unlocked ? 'primary' : 'neutral'} />
              {!slide.unlocked ? (
                <StudentStatusPill tone="warning"><Lock className="mr-1 h-3 w-3" /> Locked</StudentStatusPill>
              ) : (
                <StudentStatusPill tone="accent"><CheckCircle2 className="mr-1 h-3 w-3" /> Unlocked</StudentStatusPill>
              )}
            </div>

            <h3 className={`mb-1 text-sm font-bold ${!slide.unlocked ? 'text-[#56635c]' : 'text-[#202823]'}`}>
              Lesson {slide.slideNumber}: {slide.title}
            </h3>

            {slide.objectives && (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#56635c]">
                {slide.objectives}
              </p>
            )}

            {slide.unlocked ? (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => setSelectedSlide(slide)}
                  className="flex min-h-9 flex-1 items-center justify-center gap-2 rounded-full bg-[#e8f0ed] px-3 text-xs font-bold text-[#095F46] transition-colors hover:bg-[#dbe8e2]"
                >
                  <PlayCircle className="h-4 w-4" /> View
                </button>
                <button
                  onClick={() => downloadFile(`${slide.title}\n\n${slide.objectives || ''}\n\nDuration: ${slide.durationMinutes} minutes\n`, `lesson-${slide.slideNumber}-outline.txt`)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d6e0db] transition-colors hover:bg-[#f5f7f6]"
                  title="Download lesson outline" aria-label={`Download outline for ${slide.title}`}
                >
                  <Download className="h-4 w-4 text-[#56635c]" />
                </button>
              </div>
            ) : (
              <p className="mt-4 text-xs text-[#56635c]">
                Your lecturer will unlock this material as you complete lessons.
              </p>
            )}
          </StudentCard>
        ))}
      </div>

      {/* Slide Viewer Modal */}
      {selectedSlide && (
        <dialog ref={viewer} onCancel={() => setSelectedSlide(null)} aria-labelledby="lesson-viewer-title" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl p-0 backdrop:bg-black/60">
          <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#d6e0db] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#d6e0db] p-5">
              <div className="flex items-center gap-3">
                <StudentIconTile icon={PlayCircle} />
                <div>
                  <h3 id="lesson-viewer-title" className="text-base font-bold text-[#202823]">
                    Lesson {selectedSlide.slideNumber}: {selectedSlide.title}
                  </h3>
                  <p className="text-xs text-[#56635c]">
                    Lesson outline
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSlide(null)}
                aria-label="Close lesson outline"
                className="rounded-full p-1.5 text-[#56635c] hover:bg-[#f5f7f6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-[260px] flex-col items-center justify-center border-b border-[#d6e0db] bg-[#f5f7f6] p-8 text-center">
              <FileText className="mb-4 h-12 w-12 text-[#095F46]" />
              <h4 className="mb-2 text-xl font-bold text-[#202823]">
                {selectedSlide.title}
              </h4>
              <p className="max-w-md text-sm text-[#56635c]">
                {selectedSlide.objectives || 'No objectives have been added to this lesson.'}
              </p>
              <div className="mt-6 flex items-center gap-2">
                <StudentStatusPill tone="accent">Lesson unlocked</StudentStatusPill>
                <StudentStatusPill tone="neutral">{selectedSlide.durationMinutes || 45} mins</StudentStatusPill>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white p-4">
              <span className="text-xs text-[#56635c]">
                Unlocked by Lecturer
              </span>
              <button
                onClick={() => setSelectedSlide(null)}
                className={studentUi.primaryButton}
              >
                Close Viewer
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
