'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
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
  const { isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant();

  const [panel, setPanel] = useState<SidePanel>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [showMaterialsOnStage, setShowMaterialsOnStage] = useState(false);
  const [isSelfViewMinimized, setIsSelfViewMinimized] = useState(false);
  const [now, setNow] = useState(() => Date.now());

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

  // Remote vs local participants and tracks
  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const isWaitingForCounterpart = remoteParticipants.length === 0;

  const remoteCameraTrack = cameraTracks.find((trackRef) => !trackRef.participant.isLocal);
  const localCameraTrack = cameraTracks.find((trackRef) => trackRef.participant.isLocal);
  const hasScreenShare = screenTracks.length > 0;

  const togglePanel = (nextPanel: Exclude<SidePanel, null>) => {
    setPanel((current) => (current === nextPanel ? null : nextPanel));
  };

  // Custom Controls Action Handlers
  const handleToggleMic = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  };

  const handleToggleCamera = async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    }
  };

  const handleToggleScreenShare = async () => {
    if (localParticipant) {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    }
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#050907] text-white select-none" data-lk-theme="default">
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Luxury Minimal Header */}
        <header className="z-20 flex min-h-16 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#070e0a]/90 px-4 backdrop-blur-xl sm:px-6">
          {/* Top Left: Official IlmConnect Icon & Branding */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] shadow-md shadow-emerald-950/50 border border-emerald-400/25">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">IlmConnect</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
                <span className="hidden items-center gap-1 font-mono text-xs text-white/50 sm:flex">
                  <Clock3 className="h-3 w-3 text-emerald-400/80" /> {formatElapsed(sessionInfo.startsAt, now)}
                </span>
              </div>
              <p className="text-xs text-white/60 truncate flex items-center gap-1.5">
                <span>{userRole === 'student' ? '1:1 Tajweed Lesson with' : 'Teaching'} <strong className="font-semibold text-white/95">{counterpart}</strong></span>
                <span className="text-[10px] rounded px-1.5 py-0.2 bg-white/[0.08] text-emerald-300 uppercase font-medium">
                  {counterpartRole}
                </span>
              </p>
            </div>
          </div>

          {/* Top Right Actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {/* View Mode Toggle (when both participants present) */}
            {!isWaitingForCounterpart && (
              <button
                type="button"
                onClick={() => setLayoutMode((m) => (m === 'split' ? 'spotlight' : 'split'))}
                title={layoutMode === 'split' ? 'Switch to Spotlight focus' : 'Switch to 1:1 Side-by-Side view'}
                className="hidden md:inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3.5 text-xs font-medium text-white/80 transition-colors"
              >
                <LayoutGrid className="h-3.5 w-3.5 text-emerald-400" />
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
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition-all ${
                panel === 'materials' || showMaterialsOnStage
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 shadow-sm shadow-emerald-950/40'
                  : 'border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Materials</span>
              <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.2 text-[10px] font-bold text-emerald-300">
                {slides.length}
              </span>
            </button>

            {/* Participants Button */}
            <button
              type="button"
              onClick={() => togglePanel('participants')}
              aria-expanded={panel === 'participants'}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition-all ${
                panel === 'participants'
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 shadow-sm shadow-emerald-950/40'
                  : 'border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Participants</span>
              <span
                role="status"
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
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

        {/* Main Minimalist Stage */}
        <main className="relative min-h-0 flex-1 overflow-hidden p-3 sm:p-5 pb-24 sm:pb-24">
          <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#070d0a] shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
            
            {/* Viewport Area */}
            <div className="relative min-h-0 flex-1 overflow-hidden bg-black/95">
              
              {/* 1. Screen Share View */}
              {hasScreenShare ? (
                <ParticipantTile trackRef={screenTracks[0]} className="h-full w-full object-contain [&_.lk-participant-metadata]:hidden" />
              ) : showMaterialsOnStage && activeSlide?.unlocked ? (
                
                /* 2. Interactive Study Materials View */
                <div className="flex h-full flex-col bg-[#fbf9f4] text-[#141e19]">
                  <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center sm:px-14 overflow-y-auto">
                    <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-900/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-900">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-700" /> Lesson Slide {activeSlide.slideNumber}
                    </span>
                    <h1 className="max-w-3xl text-2xl sm:text-4xl font-bold tracking-tight text-emerald-950 mb-4">
                      {activeSlide.title}
                    </h1>
                    {activeSlide.example && (
                      <div className="my-6 w-full max-w-2xl rounded-3xl bg-emerald-50/80 border border-emerald-200/70 p-8 shadow-sm">
                        <p dir="rtl" className="text-4xl sm:text-6xl font-serif leading-loose text-emerald-950 text-center tracking-wide">
                          {activeSlide.example}
                        </p>
                      </div>
                    )}
                    <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-[#23352e]/80">
                      {activeSlide.objectives || 'Observe the Makharij (pronunciation points) and recite clearly with your instructor.'}
                    </p>
                  </div>

                  {/* Slide Navigation Bottom Bar */}
                  <div className="flex items-center justify-between border-t border-black/10 bg-white/80 backdrop-blur-md px-6 py-3.5 sm:px-8">
                    <button
                      type="button"
                      onClick={() => setActiveSlideIndex((index) => Math.max(0, index - 1))}
                      disabled={activeSlideIndex === 0 || !slides[activeSlideIndex - 1]?.unlocked}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-xs font-semibold text-emerald-950 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30 transition-colors shadow-sm"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-black/60">
                        Slide {activeSlide.slideNumber} of {slides.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMaterialsOnStage(false)}
                        className="text-xs font-medium text-emerald-800 hover:text-emerald-950 underline underline-offset-2 ml-2"
                      >
                        Back to Video
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSlideIndex((index) => Math.min(slides.length - 1, index + 1))}
                      disabled={activeSlideIndex === slides.length - 1 || !slides[activeSlideIndex + 1]?.unlocked}
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-800 hover:bg-emerald-900 px-5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30 transition-colors shadow-sm"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : isWaitingForCounterpart ? (
                
                /* 3. Luxury Minimal Waiting Room Standby */
                <div className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center overflow-hidden">
                  {/* Atmospheric Glow */}
                  <div className="absolute h-96 w-96 rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />
                  
                  <div className="relative z-10 max-w-md w-full rounded-3xl border border-emerald-500/20 bg-[#0c1511]/85 p-8 sm:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
                    {/* Breathing Avatar */}
                    <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-emerald-400/15 animate-ping opacity-60" />
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/40 bg-gradient-to-br from-emerald-700/80 via-emerald-800/90 to-emerald-950 text-2xl font-bold text-white shadow-xl shadow-emerald-950/60">
                        {counterpart.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ILM'}
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 mb-3.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Waiting for {counterpartRole}
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                      {counterpart}
                    </h2>
                    <p className="text-xs leading-relaxed text-white/55 mb-7">
                      {userRole === 'student'
                        ? "You are securely connected to the classroom. Your video and audio will automatically link as soon as your lecturer enters."
                        : "Your student has not joined the room yet. As soon as they enter, your 1:1 session will begin."}
                    </p>

                    {/* Minimal Diagnostic Status */}
                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-left mb-6">
                      <div className="flex items-center gap-2.5 px-2 py-1">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isMicrophoneEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {isMicrophoneEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                        </span>
                        <div>
                          <p className="font-medium text-[11px] text-white/90">{isMicrophoneEnabled ? 'Mic Active' : 'Mic Muted'}</p>
                          <p className="text-[10px] text-white/40">Ready to speak</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 px-2 py-1">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isCameraEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {isCameraEnabled ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                        </span>
                        <div>
                          <p className="font-medium text-[11px] text-white/90">{isCameraEnabled ? 'Camera On' : 'Camera Off'}</p>
                          <p className="text-[10px] text-white/40">Self-view active</p>
                        </div>
                      </div>
                    </div>

                    {/* Luxury CTA */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMaterialsOnStage(true);
                        setPanel('materials');
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-500 hover:to-teal-700 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-emerald-950/60 transition-all active:scale-[0.98] border border-emerald-400/25"
                    >
                      <BookOpen className="h-4 w-4 text-emerald-200" />
                      Preview Noorani Qaida Slides While Waiting
                    </button>
                  </div>
                </div>
              ) : layoutMode === 'split' ? (
                
                /* 4. Side-by-Side 1:1 Practice Mode (Both in room) */
                <div className="grid h-full w-full gap-4 p-4 grid-cols-1 md:grid-cols-2">
                  {/* Remote Counterpart Card */}
                  <div className="relative h-full min-h-0 w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c1411] shadow-2xl flex items-center justify-center">
                    {remoteCameraTrack ? (
                      <ParticipantTile
                        trackRef={remoteCameraTrack}
                        className="h-full w-full object-cover [&_.lk-participant-metadata]:hidden"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 text-white/50 text-center p-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-xl font-bold border border-emerald-400/30">
                          {counterpart.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-sm font-semibold text-white/90">{counterpart}</p>
                        <p className="text-xs text-white/40">Camera currently paused</p>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-3.5 py-1.5 text-xs text-white border border-white/10 shadow-lg">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold">{counterpart}</span>
                      <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold">({counterpartRole})</span>
                    </div>
                  </div>

                  {/* Local User Card */}
                  <div className="relative h-full min-h-0 w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c1411] shadow-2xl flex items-center justify-center">
                    {localCameraTrack ? (
                      <ParticipantTile
                        trackRef={localCameraTrack}
                        className="h-full w-full object-cover [&_.lk-participant-metadata]:hidden"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-white/50 text-center p-4">
                        <VideoOff className="h-8 w-8 text-white/30" />
                        <p className="text-xs text-white/60">Your camera is turned off</p>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-3.5 py-1.5 text-xs text-white border border-white/10 shadow-lg">
                      <span className="font-semibold">You</span>
                      <span className="text-[10px] text-white/60 uppercase tracking-wider font-bold">({userRole})</span>
                    </div>
                    <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs border border-white/10 shadow-md">
                      {isMicrophoneEnabled ? <Mic className="h-3.5 w-3.5 text-emerald-300" /> : <MicOff className="h-3.5 w-3.5 text-rose-400" />}
                    </div>
                  </div>
                </div>
              ) : (
                
                /* 5. Spotlight Focus Mode */
                <div className="relative h-full w-full bg-[#080e0b]">
                  {remoteCameraTrack ? (
                    <ParticipantTile
                      trackRef={remoteCameraTrack}
                      className="h-full w-full object-cover [&_.lk-participant-metadata]:hidden"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/50">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-2xl font-bold border border-emerald-400/30">
                        {counterpart.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-base font-semibold">{counterpart}</p>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-3.5 py-1.5 text-xs text-white border border-white/10 shadow-lg">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold">{counterpart}</span>
                    <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold">({counterpartRole})</span>
                  </div>
                </div>
              )}

              {/* Floating Luxury Picture-in-Picture (PiP) Self-View */}
              {localCameraTrack && (isWaitingForCounterpart || showMaterialsOnStage || layoutMode === 'spotlight') && (
                <aside
                  aria-label="Self preview"
                  className={`absolute bottom-5 right-5 z-30 transition-all duration-300 ${
                    isSelfViewMinimized ? 'w-40 h-10' : 'w-52 sm:w-60 aspect-video'
                  } rounded-2xl border border-emerald-500/30 bg-black/90 shadow-[0_16px_50px_rgba(0,0,0,0.85)] overflow-hidden backdrop-blur-2xl group`}
                >
                  {isSelfViewMinimized ? (
                    <button
                      type="button"
                      onClick={() => setIsSelfViewMinimized(false)}
                      className="flex h-full w-full items-center justify-between px-3.5 text-xs text-white/80 hover:text-white"
                    >
                      <span className="flex items-center gap-2 font-semibold text-[11px]">
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
                        <span className="text-[11px] font-semibold text-white/95 truncate">
                          You <span className="text-[10px] font-normal text-white/60">({userRole})</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`p-1 rounded-full ${isMicrophoneEnabled ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'}`}>
                            {isMicrophoneEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsSelfViewMinimized(true)}
                            className="p-1 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                            title="Minimize preview"
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

        {/* Minimal Luxury Floating Control Dock */}
        <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex min-h-24 items-center justify-center px-4 pb-5">
          <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3 rounded-full border border-white/10 bg-[#09120e]/90 p-2 sm:p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
            {/* Microphone Button */}
            <button
              type="button"
              onClick={handleToggleMic}
              title={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
              aria-label={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
              className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
                isMicrophoneEnabled
                  ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
              }`}
            >
              {isMicrophoneEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>

            {/* Video Camera Button */}
            <button
              type="button"
              onClick={handleToggleCamera}
              title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
              aria-label={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
              className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
                isCameraEnabled
                  ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
              }`}
            >
              {isCameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            {/* Screen Share Button */}
            <button
              type="button"
              onClick={handleToggleScreenShare}
              title={isScreenShareEnabled ? 'Stop sharing screen' : 'Share screen'}
              aria-label={isScreenShareEnabled ? 'Stop sharing screen' : 'Share screen'}
              className={`relative hidden sm:flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
                isScreenShareEnabled
                  ? 'bg-sky-500/20 border border-sky-400/40 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                  : 'bg-white/[0.06] border border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <MonitorUp className="h-5 w-5" />
            </button>

            {/* Materials Quick Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setShowMaterialsOnStage(!showMaterialsOnStage);
                if (!showMaterialsOnStage) setPanel('materials');
              }}
              title={showMaterialsOnStage ? 'Hide materials from stage' : 'Open Noorani Qaida materials'}
              className={`flex h-12 items-center gap-2 px-4 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 active:scale-95 border ${
                showMaterialsOnStage
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : 'bg-white/[0.06] border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <BookOpen className="h-4 w-4 text-emerald-400" />
              <span className="hidden md:inline">{showMaterialsOnStage ? 'Reading Slides' : 'Materials'}</span>
            </button>

            <div className="mx-1 h-6 w-px bg-white/10" />

            {/* Leave Session Button */}
            <button
              type="button"
              onClick={onLeave}
              aria-label="Leave session"
              className="flex h-12 items-center gap-2 px-6 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs tracking-wide shadow-[0_4px_25px_rgba(225,29,72,0.4)] border border-rose-400/30 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <PhoneOff className="h-4 w-4" />
              <span>Leave</span>
            </button>
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
            className="absolute inset-y-0 right-0 z-40 flex w-[min(22rem,calc(100vw-1rem))] flex-col border-l border-white/10 bg-[#0a130f]/95 shadow-2xl md:relative md:z-20 md:w-80 backdrop-blur-xl"
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
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Content */}
            {panel === 'materials' ? (
              <div className="flex-1 space-y-2 overflow-y-auto p-3.5">
                <div className="mb-3 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] p-3 text-xs leading-5 text-emerald-200">
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
                    className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                      index === activeSlideIndex && showMaterialsOnStage
                        ? 'border-emerald-400/50 bg-emerald-500/15 text-white shadow-md'
                        : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.06] text-white/80'
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
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
                  <div key={participant.identity} className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
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
                        <span className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          <Mic className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="p-1.5 rounded-full bg-rose-500/20 text-rose-400">
                          <MicOff className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {participant.isCameraEnabled ? (
                        <span className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          <Video className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="p-1.5 rounded-full bg-rose-500/20 text-rose-400">
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
