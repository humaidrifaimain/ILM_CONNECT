'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DisconnectButton,
  ParticipantTile,
  RoomAudioRenderer,
  TrackToggle,
  useParticipants,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Lock,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  ShieldCheck,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';

interface SessionInfo {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  studentName: string;
  lecturerName: string;
}

interface LiveClassroomProps {
  sessionInfo: SessionInfo;
  userRole: 'student' | 'lecturer';
  courseId?: string;
  onLeave: () => void;
}

type SidePanel = 'materials' | 'participants' | null;

interface ClassroomSlide {
  id: string;
  title: string;
  objectives?: string;
  example?: string;
  slideNumber: number;
  unlocked: boolean;
}

interface CurriculumLesson {
  id: string;
  title: string;
  objectives?: string;
  example?: string;
  orderIndex: number;
}

interface CurriculumPath {
  id: string;
  title: string;
  modules?: Array<{ orderIndex: number; lessons?: CurriculumLesson[] }>;
}

interface StudentProfile {
  progress?: { currentLessonId?: string; currentLearningPathId?: string };
}

const fallbackSlides = [
  { id: 'qaida-1', title: 'Introduction to Noorani Qaida', objectives: 'Recognise single Arabic letters from Alif to Khaa.', example: 'ا  ب  ت  ث  ج  ح  خ' },
  { id: 'qaida-2', title: 'Single Letters: Daal to Yaa', objectives: 'Differentiate similar letter shapes and their dots.', example: 'د  ذ  ر  ز  س  ش' },
  { id: 'qaida-3', title: 'Compound Letters', objectives: 'Identify letters at the beginning, middle and end of words.', example: 'بـ  ـبـ  ـب' },
  { id: 'qaida-4', title: 'The Harakat', objectives: 'Pronounce the short vowel sounds without stretching.', example: 'بَ  بِ  بُ' },
  { id: 'qaida-5', title: 'Tanween', objectives: 'Practise the implicit noon sound in double vowels.', example: 'بً  بٍ  بٌ' },
  { id: 'qaida-6', title: 'Maddah and Leen', objectives: 'Elongate the correct sounds for two counts.', example: 'بَا  بِي  بُو' },
  { id: 'qaida-7', title: 'Sukoon and Qalqalah', objectives: 'Apply a clear resting sound and controlled bounce.', example: 'أَبْ  أَتْ  أَجْ' },
  { id: 'qaida-8', title: 'Tashdeed and Final Practice', objectives: 'Emphasise doubled consonants and read with fluency.', example: 'إِنَّ  ثُمَّ' },
];

function formatElapsed(startsAt: string, now: number) {
  const elapsed = Math.max(0, now - new Date(startsAt).getTime());
  const hours = Math.floor(elapsed / 3_600_000);
  const minutes = Math.floor((elapsed % 3_600_000) / 60_000);
  const seconds = Math.floor((elapsed % 60_000) / 1_000);
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function LiveClassroom({ sessionInfo, userRole, courseId, onLeave }: LiveClassroomProps) {
  const participants = useParticipants();
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const [panel, setPanel] = useState<SidePanel>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenEnabled, setScreenEnabled] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const { data: paths = [] } = useQuery<CurriculumPath[]>({
    queryKey: ['curriculumPaths'],
    queryFn: () => apiFetch('/curriculum/paths'),
  });

  const { data: studentProfile } = useQuery<StudentProfile>({
    queryKey: ['studentProfile'],
    queryFn: () => apiFetch('/profile/student'),
    enabled: userRole === 'student',
    staleTime: 0,
  });

  const slides = useMemo<ClassroomSlide[]>(() => {
    const currentPath = paths.find(
      (path) => path.id === courseId || path.title?.toLowerCase().includes('qaida'),
    );
    const curriculumLessons = (currentPath?.modules || [])
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .flatMap((module) =>
        (module.lessons || []).slice().sort((a, b) => a.orderIndex - b.orderIndex),
      );
    const source: Array<Omit<ClassroomSlide, 'slideNumber' | 'unlocked'>> = curriculumLessons.length
      ? curriculumLessons
      : fallbackSlides;
    const currentLessonId = studentProfile?.progress?.currentLessonId;
    const hasPathAccess = currentPath?.id && studentProfile?.progress?.currentLearningPathId === currentPath.id;
    const permissionIndex = hasPathAccess && currentLessonId
      ? source.findIndex((slide) => slide.id === currentLessonId)
      : -1;

    return source.map((slide, index) => ({
      ...slide,
      slideNumber: index + 1,
      unlocked: userRole === 'lecturer' || (permissionIndex >= 0 && index <= permissionIndex),
    }));
  }, [courseId, paths, studentProfile, userRole]);

  useEffect(() => {
    const firstUnlocked = slides.findIndex((slide) => slide.unlocked);
    if (firstUnlocked >= 0 && !slides[activeSlideIndex]?.unlocked) {
      setActiveSlideIndex(firstUnlocked);
    }
  }, [activeSlideIndex, slides]);

  const activeSlide = slides[activeSlideIndex];
  const counterpart = userRole === 'student' ? sessionInfo.lecturerName : sessionInfo.studentName;
  const showMaterials = panel === 'materials';
  const hasScreenShare = screenTracks.length > 0;

  const togglePanel = (nextPanel: Exclude<SidePanel, null>) => {
    setPanel((current) => current === nextPanel ? null : nextPanel);
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#080f0e] text-white" data-lk-theme="default">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_90%_90%,rgba(212,175,55,0.08),transparent_34%)]" />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="z-20 flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#0b1412]/90 px-3 backdrop-blur-xl sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" /> Live
              </span>
              <span className="hidden items-center gap-1.5 font-mono text-xs text-white/55 sm:flex">
                <Clock3 className="h-3.5 w-3.5" /> {formatElapsed(sessionInfo.startsAt, now)}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-white/90">
              {userRole === 'student' ? 'Lesson with' : 'Teaching'} {counterpart}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => togglePanel('materials')}
              aria-expanded={panel === 'materials'}
              aria-controls="classroom-side-panel"
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${panel === 'materials' ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200' : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'}`}
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Materials</span>
            </button>
            <button
              type="button"
              onClick={() => togglePanel('participants')}
              aria-expanded={panel === 'participants'}
              aria-controls="classroom-side-panel"
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${panel === 'participants' ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200' : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'}`}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Participants</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{participants.length}</span>
            </button>
          </div>
        </header>

        <main className="relative min-h-0 flex-1 p-2 sm:p-4 lg:p-5">
          {hasScreenShare ? (
            <div className="h-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
              <ParticipantTile trackRef={screenTracks[0]} className="h-full w-full" />
            </div>
          ) : showMaterials && activeSlide?.unlocked ? (
            <section className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#f8f6ef] text-[#17201d] shadow-2xl">
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 sm:px-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-sm font-bold text-white">{activeSlide.slideNumber}</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800/60">Course material</p>
                    <p className="text-sm font-semibold">Noorani Qaida</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-black/45">{activeSlide.slideNumber} / {slides.length}</span>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center sm:px-12">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-emerald-800">Today&apos;s focus</p>
                <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">{activeSlide.title}</h1>
                {activeSlide.example && <p dir="rtl" className="my-7 text-4xl leading-relaxed text-emerald-900 sm:text-6xl">{activeSlide.example}</p>}
                <p className="max-w-2xl text-base leading-7 text-black/60 sm:text-lg">{activeSlide.objectives || 'Follow the lecturer and practise each example carefully.'}</p>
              </div>
              <div className="flex items-center justify-between border-t border-black/10 px-4 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => setActiveSlideIndex((index) => Math.max(0, index - 1))}
                  disabled={activeSlideIndex === 0 || !slides[activeSlideIndex - 1]?.unlocked}
                  className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-emerald-900 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSlideIndex((index) => Math.min(slides.length - 1, index + 1))}
                  disabled={activeSlideIndex === slides.length - 1 || !slides[activeSlideIndex + 1]?.unlocked}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          ) : (
            <div className={`grid h-full gap-3 ${cameraTracks.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {cameraTracks.map((trackRef) => (
                <ParticipantTile
                  key={`${trackRef.participant.identity}-${trackRef.source}`}
                  trackRef={trackRef}
                  className="h-full min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#111c19] shadow-2xl [&_.lk-participant-metadata]:bg-gradient-to-t [&_.lk-participant-metadata]:from-black/80 [&_.lk-participant-metadata]:to-transparent"
                />
              ))}
            </div>
          )}
        </main>

        <footer className="z-20 flex min-h-20 items-center justify-center border-t border-white/10 bg-[#0b1412]/95 px-3 backdrop-blur-xl">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-2xl">
            <TrackToggle
              source={Track.Source.Microphone}
              onChange={setMicEnabled}
              aria-label={micEnabled ? 'Turn microphone off' : 'Turn microphone on'}
              className={`!flex !h-12 !w-12 !items-center !justify-center !rounded-xl !border-0 ${micEnabled ? '!bg-white/10 !text-white hover:!bg-white/15' : '!bg-red-500/15 !text-red-300'}`}
            >
              {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </TrackToggle>
            <TrackToggle
              source={Track.Source.Camera}
              onChange={setCameraEnabled}
              aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
              className={`!flex !h-12 !w-12 !items-center !justify-center !rounded-xl !border-0 ${cameraEnabled ? '!bg-white/10 !text-white hover:!bg-white/15' : '!bg-red-500/15 !text-red-300'}`}
            >
              {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </TrackToggle>
            <TrackToggle
              source={Track.Source.ScreenShare}
              onChange={setScreenEnabled}
              aria-label={screenEnabled ? 'Stop sharing screen' : 'Share screen'}
              className={`!hidden sm:!flex !h-12 !w-12 !items-center !justify-center !rounded-xl !border-0 ${screenEnabled ? '!bg-emerald-400/20 !text-emerald-300' : '!bg-white/10 !text-white hover:!bg-white/15'}`}
            >
              <MonitorUp className="h-5 w-5" />
            </TrackToggle>
            <div className="mx-1 h-7 w-px bg-white/10" />
            <DisconnectButton
              onClick={onLeave}
              aria-label="Leave session"
              className="!flex !h-12 !items-center !gap-2 !rounded-xl !border-0 !bg-red-500 !px-4 !font-semibold !text-white hover:!bg-red-600 focus-visible:!ring-2 focus-visible:!ring-red-300"
            >
              <PhoneOff className="h-5 w-5" /> <span className="hidden sm:inline">Leave</span>
            </DisconnectButton>
          </div>
        </footer>
      </div>

      {panel && (
        <>
          <button type="button" aria-label="Close side panel" onClick={() => setPanel(null)} className="absolute inset-0 z-30 bg-black/50 md:hidden" />
          <aside id="classroom-side-panel" className="absolute inset-y-0 right-0 z-40 flex w-[min(22rem,calc(100vw-1rem))] flex-col border-l border-white/10 bg-[#0d1815] shadow-2xl md:relative md:z-20 md:w-80">
            <div className="flex min-h-16 items-center justify-between border-b border-white/10 px-5">
              <div>
                <p className="font-semibold">{panel === 'materials' ? 'Lesson materials' : 'Participants'}</p>
                <p className="text-xs text-white/45">{panel === 'materials' ? 'Select a slide to present' : `${participants.length} currently connected`}</p>
              </div>
              <button type="button" onClick={() => setPanel(null)} aria-label="Close panel" className="flex h-11 w-11 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            {panel === 'materials' ? (
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.07] p-3 text-xs leading-5 text-emerald-100/75">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" /> Students can only open materials unlocked by their lecturer.
                </div>
                {slides.map((slide, index) => (
                  <button
                    type="button"
                    key={slide.id}
                    disabled={!slide.unlocked}
                    aria-pressed={index === activeSlideIndex && showMaterials}
                    onClick={() => { setActiveSlideIndex(index); setPanel('materials'); }}
                    className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${index === activeSlideIndex ? 'border-emerald-400/35 bg-emerald-400/10' : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07]'} disabled:cursor-not-allowed disabled:opacity-45`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-xs font-bold text-white/70">
                      {slide.unlocked ? slide.slideNumber : <Lock className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white/90">{slide.title}</span>
                      <span className="mt-0.5 block text-xs text-white/40">{slide.unlocked ? 'Ready to view' : 'Locked by lecturer'}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {participants.map((participant) => (
                  <div key={participant.identity} className="flex min-h-16 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-sm font-bold text-emerald-200">
                      {(participant.name || participant.identity).slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/90">{participant.name || participant.identity}{participant.isLocal ? ' (You)' : ''}</p>
                      <p className="text-xs text-emerald-300/70">Connected</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/45">
                      {participant.isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-300/70" />}
                      {participant.isCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-red-300/70" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </>
      )}

      <RoomAudioRenderer />
    </div>
  );
}
