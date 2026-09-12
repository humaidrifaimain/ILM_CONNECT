'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { FileText, Lock, PlayCircle, Download, X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { LoadingScreen } from '@/components/ui/loading-screen';

const fallbackSlides = [
  { id: '1', title: 'Introduction to Noorani Qaida', objectives: 'Single Letters (Mufradat) - Alif to Khaa', durationMinutes: 45 },
  { id: '2', title: 'Single Letters (Mufradat) - Daal to Yaa', objectives: 'Differentiate confusing shapes and distinct dots', durationMinutes: 45 },
  { id: '3', title: 'Compound Letters (Murakkabat)', objectives: 'Identify letters when joined in beginning, middle, and end positions', durationMinutes: 45 },
  { id: '4', title: 'The Harakat (Short Vowels)', objectives: 'Pronounce short vowel sounds without stretching', durationMinutes: 45 },
  { id: '5', title: 'Tanween (Double Vowels)', objectives: 'Master the noon sound implicit in Tanween', durationMinutes: 45 },
  { id: '6', title: 'Letters of Maddah & Leen', objectives: 'Elongate sounds for 2 counts', durationMinutes: 45 },
  { id: '7', title: 'Sukoon (Jazm) and Qalqalah Letters', objectives: 'Bouncing mechanism on Qaf, Taa, Baa, Jeem, Daal', durationMinutes: 45 },
  { id: '8', title: 'Tashdeed (Shaddah) & Final Practice', objectives: 'Emphasize geminate consonants and fluid reading', durationMinutes: 45 },
];

export default function CourseMaterialsPage() {
  const params = useParams();
  const courseId = params?.courseId as string;
  const [selectedSlide, setSelectedSlide] = useState<any | null>(null);

  // 1. Fetch student profile to get progress and lecturer permissions
  const { data: studentProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: () => apiFetch('/profile/student'),
    staleTime: 0,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  });

  // 2. Fetch learning paths to match the course
  const { data: paths = [], isLoading: loadingPaths } = useQuery({
    queryKey: ['curriculumPaths'],
    queryFn: () => apiFetch('/curriculum/paths'),
  });

  // Find course lessons
  const currentPath = (paths as any[]).find(
    (p: any) => p.id === courseId || p.title?.toLowerCase().includes('qaida')
  );

  const lessons: any[] = [];
  if (currentPath?.modules) {
    const sortedMods = [...currentPath.modules].sort((a: any, b: any) => a.orderIndex - b.orderIndex);
    sortedMods.forEach((m: any) => {
      const sortedLessons = [...(m.lessons || [])].sort((a: any, b: any) => a.orderIndex - b.orderIndex);
      sortedLessons.forEach((l: any) => {
        lessons.push(l);
      });
    });
  }

  const activeSlides = lessons.length > 0 ? lessons : fallbackSlides;

  // Determine unlock status based on student progress
  const currentLessonId = studentProfile?.progress?.currentLessonId;
  const hasAccessToCurrentPath =
    Boolean(currentPath?.id) &&
    studentProfile?.progress?.currentLearningPathId === currentPath.id;
  const currentIdx = hasAccessToCurrentPath && currentLessonId
    ? activeSlides.findIndex((slide: any) => slide.id === currentLessonId)
    : -1;

  const slidesWithStatus = activeSlides.map((slide: any, idx: number) => {
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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Course Materials</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Access your presentation slides and learning resources. New materials are unlocked by your lecturer as you progress.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
          <ShieldCheck className="h-4 w-4" />
          <span>{unlockedCount} of {slidesWithStatus.length} Materials Unlocked</span>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slidesWithStatus.map((slide: any) => (
          <div
            key={slide.id}
            className={`relative p-5 rounded-xl border transition-all ${
              slide.unlocked
                ? 'bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:shadow-md cursor-pointer hover:border-[hsl(var(--primary)/0.4)]'
                : 'bg-[hsl(var(--muted)/0.5)] border-[hsl(var(--border))] opacity-75'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`p-2 rounded-lg ${
                  slide.unlocked
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                <FileText className="h-6 w-6" />
              </div>
              {!slide.unlocked ? (
                <div className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-md">
                  <Lock className="h-3 w-3" /> Locked
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-md">
                  <CheckCircle2 className="h-3 w-3" /> Unlocked
                </div>
              )}
            </div>

            <h3 className={`font-semibold mb-1 text-sm ${!slide.unlocked ? 'text-[hsl(var(--muted-foreground))]' : 'text-[hsl(var(--foreground))]'}`}>
              Slide {slide.slideNumber}: {slide.title}
            </h3>

            {slide.objectives && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 mt-1">
                {slide.objectives}
              </p>
            )}

            {slide.unlocked ? (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => setSelectedSlide(slide)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.2)] transition-colors"
                >
                  <PlayCircle className="h-4 w-4" /> View
                </button>
                <button
                  onClick={() => toast.info('Downloading Material', `Preparing download for "${slide.title}"...`)}
                  className="p-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                  title="Download Slides"
                >
                  <Download className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                </button>
              </div>
            ) : (
              <p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">
                Your lecturer will unlock this material as you complete lessons.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Slide Viewer Modal */}
      {selectedSlide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[hsl(var(--foreground))]">
                    Slide {selectedSlide.slideNumber}: {selectedSlide.title}
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Interactive Presentation & Learning Deck
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSlide(null)}
                className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-8 bg-gradient-to-br from-emerald-950/20 via-[hsl(var(--card))] to-blue-950/20 border-b border-[hsl(var(--border))] flex flex-col items-center justify-center min-h-[260px] text-center">
              <div className="text-5xl mb-4">📖</div>
              <h4 className="text-xl font-bold text-[hsl(var(--foreground))] mb-2">
                {selectedSlide.title}
              </h4>
              <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-md">
                {selectedSlide.objectives || 'Master Arabic pronunciation, letter recognition, and reading fluently.'}
              </p>
              <div className="mt-6 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-semibold">
                  Active Presentation Ready
                </span>
                <span className="px-3 py-1 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-xs font-medium">
                  {selectedSlide.durationMinutes || 45} mins
                </span>
              </div>
            </div>

            <div className="p-4 bg-[hsl(var(--muted)/0.2)] flex items-center justify-between">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                Unlocked by Lecturer
              </span>
              <button
                onClick={() => setSelectedSlide(null)}
                className="px-4 py-2 rounded-xl bg-[hsl(var(--primary))] text-white text-xs font-semibold hover:bg-[hsl(var(--primary)/0.9)] transition-colors"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
