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
  LayoutGrid,
  Maximize2,
  Minimize2,
  Sparkles,
  Radio,
  CheckCircle2,
  Volume2,
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
type LayoutMode = 'split' | 'spotlight';

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
  { id: 'qaida-1', title: 'Introduction to Noorani Qaida', objectives: 'Recognise single Arabic letters from Alif to Khaa with correct Makharij.', example: 'ا  ب  ت  ث  ج  ح  خ' },
  { id: 'qaida-2', title: 'Single Letters: Daal to Yaa', objectives: 'Differentiate similar letter shapes and their dots clearly.', example: 'د  ذ  ر  ز  س  ش' },
  { id: 'qaida-3', title: 'Compound Letters', objectives: 'Identify letters at the beginning, middle and end of Quranic words.', example: 'بـ  ـبـ  ـب' },
  { id: 'qaida-4', title: 'The Harakat (Short Vowels)', objectives: 'Pronounce short vowel sounds (Fathah, Kasrah, Dammah) without stretching.', example: 'بَ  بِ  بُ' },
  { id: 'qaida-5', title: 'Tanween (Double Vowels)', objectives: 'Practise the implicit noon sound in double vowels correctly.', example: 'بً  بٍ  بٌ' },
  { id: 'qaida-6', title: 'Maddah and Leen Rules', objectives: 'Elongate the correct sounds for two counts with measured breath.', example: 'بَا  بِي  بُو' },
  { id: 'qaida-7', title: 'Sukoon and Qalqalah Echo', objectives: 'Apply a clear resting sound and controlled echo bounce on Qaf, Taa, Baa, Jeem, Daal.', example: 'أَبْ  أَتْ  أَجْ' },
  { id: 'qaida-8', title: 'Tashdeed and Final Fluency', objectives: 'Emphasise doubled consonants with appropriate emphasis and Ghunnah.', example: 'إِنَّ  ثُمَّ' },
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
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [showMaterialsOnStage, setShowMaterialsOnStage] = useState(false);
  const [isSelfViewMinimized, setIsSelfViewMinimized] = useState(false);
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
  const counterpartRole = userRole === 'student' ? 'Lecturer' : 'Student';

  // Remote and local participants and tracks
  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const isWaitingForCounterpart = remoteParticipants.length === 0;

  const remoteCameraTrack = cameraTracks.find((trackRef) => !trackRef.participant.isLocal);
  const localCameraTrack = cameraTracks.find((trackRef) => trackRef.participant.isLocal);
  const hasScreenShare = screenTracks.length > 0;

  const togglePanel = (nextPanel: Exclude<SidePanel, null>) => {
    setPanel((current) => (current === nextPanel ? null : nextPanel));
  };

  const stageTitle = hasScreenShare
    ? 'Screen share'
    : showMaterialsOnStage && activeSlide?.unlocked
      ? activeSlide.title
      : isWaitingForCounterpart
        ? `Waiting for ${counterpart}`
        : `${counterpart} (${counterpartRole})`;

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#060a08] text-white select-none" data-lk-theme="default">
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="z-20 flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#09100d]/90 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-emerald-700/30 text-xs font-black tracking-wider text-emerald-300 shadow-md">
              ILM
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
                <span className="hidden items-center gap-1.5 font-mono text-xs text-white/70 sm:flex">
                  <Clock3 className="h-3.5 w-3.5 text-emerald-400" /> {formatElapsed(sessionInfo.startsAt, now)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm font-semibold text-white/95 flex items-center gap-1.5">
                <span>{userRole === 'student' ? 'Lesson with' : 'Teaching'} <strong className="text-emerald-300 font-bold">{counterpart}</strong></span>
                <span className="hidden md:inline-block text-[10px] rounded-md px-1.5 py-0.5 bg-white/10 text-white/60 uppercase font-medium">
                  {counterpartRole}
                </span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Layout Mode Switcher */}
            {!isWaitingForCounterpart && (
              <button
                type="button"
                onClick={() => setLayoutMode((m) => (m === 'split' ? 'spotlight' : 'split'))}
                title={layoutMode === 'split' ? 'Switch to Spotlight focus' : 'Switch to 1:1 Side-by-Side view'}
                className="hidden md:inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/10 px-3 text-xs font-medium text-white/80 transition-colors"
              >
                <LayoutGrid className="h-4 w-4 text-emerald-400" />
                <span>{layoutMode === 'split' ? 'Side-by-Side' : 'Spotlight'}</span>
              </button>
            )}

            {/* Materials Button */}
            <button
              type="button"
              onClick={() => {
                if (!showMaterialsOnStage && activeSlide?.unlocked) {
                  setShowMaterialsOnStage(true);
                }
                togglePanel('materials');
              }}
              aria-expanded={panel === 'materials'}
              aria-controls="classroom-side-panel"
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                panel === 'materials' || showMaterialsOnStage
                  ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200 shadow-md shadow-emerald-950/40'
                  : 'border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/10'
              }`}
            >
              <BookOpen className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline">Materials</span>
              <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                {slides.length}
              </span>
            </button>

            {/* Participants Button */}
            <button
              type="button"
              onClick={() => togglePanel('participants')}
              aria-expanded={panel === 'participants'}
              aria-controls="classroom-side-panel"
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                panel === 'participants'
                  ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200 shadow-md shadow-emerald-950/40'
                  : 'border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/10'
              }`}
            >
              <Users className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline">Participants</span>
              <span
                role="status"
                aria-atomic="true"
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  participants.length > 1
                    ? 'bg-emerald-400 text-black'
                    : 'bg-white/10 text-white/70'
                }`}
              >
                {participants.length}
              </span>
            </button>
          </div>
        </header>

        {/* Main Stage */}
        <main className="relative min-h-0 flex-1 overflow-hidden p-3 sm:p-4 pb-24 sm:pb-24">
          <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a110e] shadow-[0_24px_70px_rgba(0,0,0,0.6)]">
            
            {/* Stage Title Sub-header */}
            <div className="flex min-h-11 items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="truncate text-xs font-semibold text-white/90">{stageTitle}</p>
                <span className="text-[11px] text-white/40 hidden sm:inline">
                  {hasScreenShare
                    ? '• Screen sharing active'
                    : showMaterialsOnStage
                      ? '• Course presentation mode'
                      : isWaitingForCounterpart
                        ? '• Waiting room standby'
                        : `• Live 1:1 interaction`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {showMaterialsOnStage && (
                  <button
                    type="button"
                    onClick={() => setShowMaterialsOnStage(false)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
                  >
                    Hide Material & Show Video
                  </button>
                )}
                <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-white/60">
                  {participants.length} {participants.length === 1 ? 'attendee' : 'attendees'} connected
                </span>
              </div>
            </div>

            {/* Stage Viewport */}
            <div className="relative min-h-0 flex-1 overflow-hidden bg-black/90">
              
              {/* Screen Share Mode */}
              {hasScreenShare ? (
                <ParticipantTile trackRef={screenTracks[0]} className="h-full w-full object-contain [&_.lk-participant-metadata]:hidden" />
              ) : showMaterialsOnStage && activeSlide?.unlocked ? (
                
                /* Materials / Slide Deck Mode */
                <div className="flex h-full flex-col bg-[#fbf8f2] text-[#131d18]">
                  <div className="flex flex-1 flex-col items-center justify-center px-6 py-6 text-center sm:px-12 overflow-y-auto">
                    <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-800/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-900">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-700" /> Lesson Slide {activeSlide.slideNumber}
                    </span>
                    <h1 className="max-w-3xl text-2xl sm:text-4xl font-bold tracking-tight text-emerald-950 mb-3">
                      {activeSlide.title}
                    </h1>
                    {activeSlide.example && (
                      <div className="my-5 w-full max-w-2xl rounded-2xl bg-emerald-50/70 border border-emerald-200/60 p-6 shadow-sm">
                        <p dir="rtl" className="text-4xl sm:text-6xl font-serif leading-relaxed text-emerald-950 text-center tracking-wide">
                          {activeSlide.example}
                        </p>
                      </div>
                    )}
                    <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-[#23352e]/80">
                      {activeSlide.objectives || 'Observe the Makharij (pronunciation points) and recite clearly with your instructor.'}
                    </p>
                  </div>

                  {/* Slide Navigation Toolbar */}
                  <div className="flex items-center justify-between border-t border-black/10 bg-white/70 backdrop-blur-sm px-4 py-3 sm:px-6">
                    <button
                      type="button"
                      onClick={() => setActiveSlideIndex((index) => Math.max(0, index - 1))}
                      disabled={activeSlideIndex === 0 || !slides[activeSlideIndex - 1]?.unlocked}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-emerald-950 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </button>
                    <span className="text-xs font-bold text-black/60">
                      Slide {activeSlide.slideNumber} of {slides.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSlideIndex((index) => Math.min(slides.length - 1, index + 1))}
                      disabled={activeSlideIndex === slides.length - 1 || !slides[activeSlideIndex + 1]?.unlocked}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30 transition-colors shadow-sm"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : isWaitingForCounterpart ? (
                
                /* Waiting Room State (Only 1 participant in room) */
                <div className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center">
                  <div className="absolute h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
                  
                  <div className="relative z-10 max-w-lg w-full rounded-3xl border border-white/10 bg-[#0e1714]/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                    {/* Animated Pulsing Counterpart Avatar */}
                    <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-75" />
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400/50 bg-gradient-to-br from-emerald-800 to-emerald-950 text-2xl font-black text-white shadow-xl">
                        {counterpart.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ILM'}
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-3">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Waiting for {counterpartRole}
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">
                      {counterpart}
                    </h2>
                    <p className="text-xs sm:text-sm text-white/60 mb-6 leading-relaxed max-w-md mx-auto">
                      {userRole === 'student'
                        ? "You are securely connected to the classroom. Your video and audio will automatically connect as soon as your lecturer enters."
                        : "Your student has not joined the room yet. The lesson will automatically commence once they connect."}
                    </p>

                    {/* Hardware Diagnostic Badges */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-left mb-6">
                      <div className="flex items-center gap-2.5 text-white/80">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-xl ${micEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                          {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                        </span>
                        <div>
                          <p className="font-semibold text-[11px] leading-tight text-white">{micEnabled ? 'Mic Active' : 'Mic Muted'}</p>
                          <p className="text-[10px] text-white/50">Ready to speak</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 text-white/80">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-xl ${cameraEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                          {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                        </span>
                        <div>
                          <p className="font-semibold text-[11px] leading-tight text-white">{cameraEnabled ? 'Camera On' : 'Camera Off'}</p>
                          <p className="text-[10px] text-white/50">Self-view active</p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMaterialsOnStage(true);
                        setPanel('materials');
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.99]"
                    >
                      <BookOpen className="h-4 w-4 text-emerald-300" />
                      Preview Noorani Qaida Slides While Waiting
                    </button>
                  </div>
                </div>
              ) : layoutMode === 'split' ? (
                
                /* Side-by-Side 1:1 Practice Mode (Both in room) */
                <div className="grid h-full w-full gap-3 p-3 grid-cols-1 md:grid-cols-2">
                  {/* Remote Counterpart Tile */}
                  <div className="relative h-full min-h-0 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d1512] shadow-xl flex items-center justify-center">
                    {remoteCameraTrack ? (
                      <ParticipantTile
                        trackRef={remoteCameraTrack}
                        className="h-full w-full object-cover [&_.lk-participant-metadata]:hidden"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 text-white/50 text-center p-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-xl font-bold">
                          {counterpart.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium">{counterpart}</p>
                        <p className="text-xs text-white/40">Camera is currently paused</p>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-2 rounded-xl bg-black/70 backdrop-blur-md px-3 py-1.5 text-xs text-white border border-white/10">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold">{counterpart}</span>
                      <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">({counterpartRole})</span>
                    </div>
                  </div>

                  {/* Local User Tile */}
                  <div className="relative h-full min-h-0 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d1512] shadow-xl flex items-center justify-center">
                    {localCameraTrack ? (
                      <ParticipantTile
                        trackRef={localCameraTrack}
                        className="h-full w-full object-cover [&_.lk-participant-metadata]:hidden"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-white/50 text-center p-4">
                        <VideoOff className="h-8 w-8 text-white/30" />
                        <p className="text-xs">Your camera is turned off</p>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-2 rounded-xl bg-black/70 backdrop-blur-md px-3 py-1.5 text-xs text-white border border-white/10">
                      <span className="font-semibold">You</span>
                      <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">({userRole})</span>
                    </div>
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/70 backdrop-blur-md px-2 py-1 text-xs border border-white/10">
                      {micEnabled ? <Mic className="h-3.5 w-3.5 text-emerald-300" /> : <MicOff className="h-3.5 w-3.5 text-red-400" />}
                    </div>
                  </div>
                </div>
              ) : (
                
                /* Spotlight Focus Mode (Remote counterpart fills the stage) */
                <div className="relative h-full w-full bg-[#0a110e]">
                  {remoteCameraTrack ? (
                    <ParticipantTile
                      trackRef={remoteCameraTrack}
                      className="h-full w-full object-cover [&_.lk-participant-metadata]:hidden"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/50">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-2xl font-bold">
                        {counterpart.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-base font-semibold">{counterpart}</p>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex items-center gap-2 rounded-xl bg-black/70 backdrop-blur-md px-3 py-1.5 text-xs text-white border border-white/10">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold">{counterpart}</span>
                    <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">({counterpartRole})</span>
                  </div>
                </div>
              )}

              {/* Floating Picture-in-Picture Self-View (When in Waiting Room, Materials Mode, or Spotlight Mode) */}
              {localCameraTrack && (isWaitingForCounterpart || showMaterialsOnStage || layoutMode === 'spotlight') && (
                <aside
                  aria-label="Self preview"
                  className={`absolute bottom-4 right-4 z-30 transition-all duration-300 ${
                    isSelfViewMinimized ? 'w-44 h-11' : 'w-56 sm:w-64 aspect-video'
                  } rounded-2xl border border-white/20 bg-black/90 shadow-2xl overflow-hidden backdrop-blur-xl group`}
                >
                  {isSelfViewMinimized ? (
                    <button
                      type="button"
                      onClick={() => setIsSelfViewMinimized(false)}
                      className="flex h-full w-full items-center justify-between px-3 text-xs text-white/80 hover:text-white"
                    >
                      <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                        <Video className="h-3.5 w-3.5 text-emerald-400" /> You (Self-View)
                      </span>
                      <Maximize2 className="h-3.5 w-3.5 text-white/60" />
                    </button>
                  ) : (
                    <>
                      <ParticipantTile
                        trackRef={localCameraTrack}
                        className="h-full w-full object-cover [&_.lk-participant-metadata]:hidden"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white truncate drop-shadow">
                          You <span className="text-[10px] font-normal text-white/70">({userRole})</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`p-1 rounded-md ${micEnabled ? 'bg-emerald-500/30 text-emerald-300' : 'bg-red-500/40 text-red-300'}`}>
                            {micEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsSelfViewMinimized(true)}
                            className="p-1 rounded-md bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                            title="Minimize self-view"
                          >
                            <Minimize2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </aside>
              )}

            </div>
          </div>
        </main>

        {/* Floating Controls Dock */}
        <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex min-h-20 items-center justify-center px-4 pb-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/15 bg-[#0b1411]/95 p-2.5 shadow-[0_18px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            {/* Mic Toggle */}
            <TrackToggle
              source={Track.Source.Microphone}
              onChange={setMicEnabled}
              aria-label={micEnabled ? 'Turn microphone off' : 'Turn microphone on'}
              className={`!flex !h-12 !w-12 !items-center !justify-center !rounded-xl !border-0 transition-all ${
                micEnabled
                  ? '!bg-white/10 !text-white hover:!bg-white/15 active:scale-95'
                  : '!bg-red-500/25 !text-red-300 active:scale-95'
              }`}
            >
              {micEnabled ? <Mic className="h-5 w-5 text-emerald-300" /> : <MicOff className="h-5 w-5 text-red-400" />}
            </TrackToggle>

            {/* Camera Toggle */}
            <TrackToggle
              source={Track.Source.Camera}
              onChange={setCameraEnabled}
              aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
              className={`!flex !h-12 !w-12 !items-center !justify-center !rounded-xl !border-0 transition-all ${
                cameraEnabled
                  ? '!bg-white/10 !text-white hover:!bg-white/15 active:scale-95'
                  : '!bg-red-500/25 !text-red-300 active:scale-95'
              }`}
            >
              {cameraEnabled ? <Video className="h-5 w-5 text-emerald-300" /> : <VideoOff className="h-5 w-5 text-red-400" />}
            </TrackToggle>

            {/* Screen Share Toggle */}
            <TrackToggle
              source={Track.Source.ScreenShare}
              onChange={setScreenEnabled}
              aria-label={screenEnabled ? 'Stop sharing screen' : 'Share screen'}
              className={`!hidden sm:!flex !h-12 !w-12 !items-center !justify-center !rounded-xl !border-0 transition-all ${
                screenEnabled
                  ? '!bg-emerald-400/25 !text-emerald-300 active:scale-95'
                  : '!bg-white/10 !text-white hover:!bg-white/15 active:scale-95'
              }`}
            >
              <MonitorUp className="h-5 w-5" />
            </TrackToggle>

            {/* Quick Materials Toggle */}
            <button
              type="button"
              onClick={() => {
                setShowMaterialsOnStage(!showMaterialsOnStage);
                if (!showMaterialsOnStage) setPanel('materials');
              }}
              title={showMaterialsOnStage ? 'Close Materials from stage' : 'Open Lesson Materials on stage'}
              className={`!flex !h-12 !px-3.5 !items-center !gap-2 !rounded-xl !border-0 text-xs font-semibold transition-all active:scale-95 ${
                showMaterialsOnStage
                  ? '!bg-emerald-500/20 !text-emerald-200 border border-emerald-500/40'
                  : '!bg-white/10 !text-white hover:!bg-white/15'
              }`}
            >
              <BookOpen className="h-4 w-4 text-emerald-400" />
              <span className="hidden md:inline">{showMaterialsOnStage ? 'Reading Materials' : 'Materials'}</span>
            </button>

            <div className="mx-1 h-7 w-px bg-white/15" />

            {/* Leave Session Button */}
            <DisconnectButton
              onClick={onLeave}
              aria-label="Leave session"
              className="!flex !h-12 !items-center !gap-2 !rounded-xl !border-0 !bg-red-600 !px-4 !text-xs !font-bold !text-white hover:!bg-red-700 shadow-md shadow-red-950/40 active:scale-95 transition-all"
            >
              <PhoneOff className="h-4 w-4" />
              <span>Leave</span>
            </DisconnectButton>
          </div>
        </footer>
      </div>

      {/* Side Drawers (Materials and Participants) */}
      {panel && (
        <>
          <button
            type="button"
            aria-label="Close side panel"
            onClick={() => setPanel(null)}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          />
          <aside
            id="classroom-side-panel"
            className="absolute inset-y-0 right-0 z-40 flex w-[min(22rem,calc(100vw-1rem))] flex-col border-l border-white/10 bg-[#0c1512] shadow-2xl md:relative md:z-20 md:w-80"
          >
            {/* Drawer Header */}
            <div className="flex min-h-16 items-center justify-between border-b border-white/10 px-5 bg-white/[0.02]">
              <div>
                <p className="font-bold text-sm text-white">{panel === 'materials' ? 'Quran & Tajweed Materials' : 'Participants'}</p>
                <p className="text-xs text-white/50">{panel === 'materials' ? 'Select a slide to study' : `${participants.length} connected to room`}</p>
              </div>
              <button
                type="button"
                onClick={() => setPanel(null)}
                aria-label="Close panel"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Content */}
            {panel === 'materials' ? (
              <div className="flex-1 space-y-2 overflow-y-auto p-3.5">
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] p-3 text-xs leading-5 text-emerald-200">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
                  <span>Interactive curriculum slides for Noorani Qaida & Tajweed.</span>
                </div>
                {slides.map((slide, index) => (
                  <button
                    type="button"
                    key={slide.id}
                    disabled={!slide.unlocked}
                    aria-pressed={index === activeSlideIndex && showMaterialsOnStage}
                    onClick={() => {
                      setActiveSlideIndex(index);
                      setShowMaterialsOnStage(true);
                    }}
                    className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      index === activeSlideIndex && showMaterialsOnStage
                        ? 'border-emerald-400/50 bg-emerald-500/15 text-white shadow-md'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-white/80'
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      index === activeSlideIndex && showMaterialsOnStage
                        ? 'bg-emerald-400 text-black'
                        : 'bg-white/10 text-white/70'
                    }`}>
                      {slide.unlocked ? slide.slideNumber : <Lock className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-white/95">{slide.title}</span>
                      <span className="mt-0.5 block text-[11px] text-white/50 truncate">
                        {slide.example || (slide.unlocked ? 'Ready to recite' : 'Locked')}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto p-3.5">
                {participants.map((participant) => (
                  <div key={participant.identity} className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-sm font-bold text-emerald-300 border border-emerald-400/30">
                      {(participant.name || participant.identity).slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white">
                        {participant.name || participant.identity}{participant.isLocal ? ' (You)' : ''}
                      </p>
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Connected
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/60">
                      {participant.isMicrophoneEnabled ? (
                        <span className="p-1 rounded bg-emerald-500/20 text-emerald-300">
                          <Mic className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="p-1 rounded bg-red-500/20 text-red-400">
                          <MicOff className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {participant.isCameraEnabled ? (
                        <span className="p-1 rounded bg-emerald-500/20 text-emerald-300">
                          <Video className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="p-1 rounded bg-red-500/20 text-red-400">
                          <VideoOff className="h-3.5 w-3.5" />
                        </span>
                      )}
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
