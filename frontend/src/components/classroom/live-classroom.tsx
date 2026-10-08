'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import {
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useTracks,
  useChat,
  useRoomContext,
  useConnectionState,
} from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
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
  MessageSquare,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { MeetingChat } from './meeting-chat';
import { MeetingReactionEffects, MeetingReactions, useMeetingReactions } from './meeting-reactions';
import { MeetingTimer } from './meeting-timer';
import styles from './classroom.module.css';

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

type SidePanel = 'materials' | 'participants' | 'chat' | null;
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



export function LiveClassroom({ sessionInfo, userRole, courseId, onLeave }: LiveClassroomProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const endDialog = useRef<HTMLDialogElement>(null);
  const { data: sessionStatus } = useQuery<string>({ queryKey: ['roomSessionStatus', sessionInfo.id], queryFn: async () => { const sessions = await apiFetch(`/bookings/${userRole}`); return sessions.find((session: { id: string; status: string }) => session.id === sessionInfo.id)?.status || sessionInfo.status; }, refetchInterval: 5000 });
  useEffect(() => { if (userRole === 'student' && sessionStatus === 'COMPLETED') onLeave(); }, [sessionStatus, userRole, onLeave]);
  const completeLesson = () => {
    endDialog.current?.close();
    onLeave();
  };
  const participants = useParticipants();
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const { isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant();

  const [panel, setPanel] = useState<SidePanel>(null);
  const chat = useChat();
  const meetingReactions = useMeetingReactions();
  const [lastReadMessageCount, setLastReadMessageCount] = useState(0);
  const chatButton = useRef<HTMLButtonElement>(null);
  const panelClose = useRef<HTMLButtonElement>(null);
  const unreadCount = panel === 'chat' ? 0 : chat.chatMessages.slice(lastReadMessageCount).filter((message) => !message.from?.isLocal).length;
  useEffect(() => {
    if (panel === 'chat' || chat.chatMessages.length < lastReadMessageCount) setLastReadMessageCount(chat.chatMessages.length);
  }, [panel, chat.chatMessages.length, lastReadMessageCount]);
  useEffect(() => {
    if (!panel) return;
    if (panel !== 'chat') panelClose.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !endDialog.current?.open) { setPanel(null); chatButton.current?.focus(); }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [panel]);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [showMaterialsOnStage, setShowMaterialsOnStage] = useState(false);
  const [isSelfViewMinimized, setIsSelfViewMinimized] = useState(false);

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
    const source: Array<Omit<ClassroomSlide, 'slideNumber' | 'unlocked'>> = curriculumLessons;
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
    <div className={`${styles.room} relative flex h-full w-full overflow-hidden bg-[#0b100e] text-white select-none`} data-lk-theme="default">
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="z-20 flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#101a15] px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/images/ilmbit-logo-white.png" alt="ILMBIT" width={38} height={49} className="h-11 w-auto shrink-0 object-contain" priority />
            <div className="min-w-0 flex flex-col">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-white">ILMBIT</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-200">
                  <span className={`h-1.5 w-1.5 rounded-full ${connectionState === ConnectionState.Connected ? 'bg-emerald-300' : 'bg-amber-300'}`} /> {connectionState === ConnectionState.Connected ? 'Live' : 'Connecting'}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/90">
                  <Clock3 className="h-3 w-3 text-emerald-300" aria-hidden="true" /> <MeetingTimer sessionId={sessionInfo.id} userRole={userRole} active={connectionState === ConnectionState.Connected} onExpire={async () => { try { await room.disconnect(); } finally { onLeave(); } }} />
                </span>
              </div>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-[#b5c5bc]">
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
                className="hidden md:inline-flex h-11 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.04] hover:bg-white/[0.08] px-3.5 text-xs font-medium text-white/80 transition-colors"
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
              aria-label="Materials"
              className={`inline-flex h-11 items-center gap-2 rounded-lg border px-3.5 text-xs font-medium transition-colors ${
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
              aria-label="Participants"
              className={`inline-flex h-11 items-center gap-2 rounded-lg border px-3.5 text-xs font-medium transition-colors ${
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

        <main className="relative isolate min-h-0 flex-1 overflow-hidden p-3 pb-36 sm:p-5 sm:pb-36 lg:pb-24">
          <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101a15]">
            <MeetingReactionEffects active={meetingReactions.active} />
            
            {/* Viewport Area */}
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0c1410]">
              
              {/* 1. Screen Share View */}
              {hasScreenShare ? (
                <ParticipantTile trackRef={screenTracks[0]} className="h-full w-full object-contain [&_.lk-participant-metadata]:hidden" />
              ) : showMaterialsOnStage && activeSlide?.unlocked ? (
                
                /* 2. Interactive Study Materials View */
                <div className="flex h-full flex-col bg-[#fbf9f4] text-[#141e19]">
                  <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center sm:px-14 overflow-y-auto">
                    <span className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-900">
                      <BookOpen className="h-4 w-4" aria-hidden="true" /> Lesson slide {activeSlide.slideNumber}
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
                
                <div className="relative flex h-full min-h-0 w-full flex-col items-center justify-start overflow-y-auto p-4 text-center sm:justify-center sm:p-6 sm:pb-40 lg:pb-6">
                  <div className="relative z-10 w-full max-w-md shrink-0 rounded-2xl border border-white/15 bg-[#15241c] p-5 sm:p-8">
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-200/30 bg-[#24533e] text-2xl font-semibold text-white">
                        {counterpart.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ILM'}
                      </div>
                    </div>

                    <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-200">
                      <Clock3 className="h-4 w-4" aria-hidden="true" />
                      Waiting for {counterpartRole}
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                      {counterpart}
                    </h2>
                    <p className="mb-6 text-sm leading-relaxed text-[#b5c5bc]">
                      {userRole === 'student'
                        ? 'Your lecturer has not joined yet. You can review your lesson materials while you wait.'
                        : 'Your student has not joined yet. You can prepare your lesson materials while you wait.'}
                    </p>

                    {/* Minimal Diagnostic Status */}
                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-left mb-6">
                      <div className="flex items-center gap-2.5 px-2 py-1">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isMicrophoneEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {isMicrophoneEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                        </span>
                        <div>
                          <p className="font-medium text-[11px] text-white/90">{isMicrophoneEnabled ? 'Mic Active' : 'Mic Muted'}</p>
                          <p className="text-xs text-[#b5c5bc]">{isMicrophoneEnabled ? 'Others can hear you' : 'Unmute to speak'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 px-2 py-1">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isCameraEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {isCameraEnabled ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                        </span>
                        <div>
                          <p className="font-medium text-[11px] text-white/90">{isCameraEnabled ? 'Camera On' : 'Camera Off'}</p>
                          <p className="text-xs text-[#b5c5bc]">{isCameraEnabled ? 'Your video is visible' : 'Your video is hidden'}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMaterialsOnStage(true);
                        setPanel('materials');
                      }}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200/30 bg-[#095F46] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#087453]"
                    >
                      <BookOpen className="h-4 w-4 text-emerald-200" />
                      Review lesson materials
                    </button>
                  </div>
                </div>
              ) : layoutMode === 'split' ? (
                
                /* 4. Side-by-Side 1:1 Practice Mode (Both in room) */
                <div className="grid h-full w-full grid-cols-1 grid-rows-2 gap-3 p-3 md:grid-cols-2 md:grid-rows-1">
                  {/* Remote Counterpart Card */}
                  <div className={`${styles.participantCard} relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#16221b]`}>
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
                        <p className="text-xs text-[#b5c5bc]">Camera currently paused</p>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex items-center gap-2 rounded-lg bg-[#0a130f]/90 px-3.5 py-1.5 text-xs text-white border border-white/10">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="font-semibold">{counterpart}</span>
                      <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold">({counterpartRole})</span>
                    </div>
                  </div>

                  {/* Local User Card */}
                  <div className={`${styles.participantCard} relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#16221b]`}>
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
                    <div className="absolute top-4 left-4 flex items-center gap-2 rounded-lg bg-[#0a130f]/90 px-3.5 py-1.5 text-xs text-white border border-white/10">
                      <span className="font-semibold">You</span>
                      <span className="text-[10px] text-white/60 uppercase tracking-wider font-bold">({userRole})</span>
                    </div>
                    <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-lg bg-[#0a130f]/90 px-2.5 py-1 text-xs border border-white/10">
                      {isMicrophoneEnabled ? <Mic className="h-3.5 w-3.5 text-emerald-300" /> : <MicOff className="h-3.5 w-3.5 text-rose-400" />}
                    </div>
                  </div>
                </div>
              ) : (
                
                /* 5. Spotlight Focus Mode */
                <div className={`${styles.participantCard} relative h-full w-full rounded-2xl bg-[#16221b]`}>
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
                  <div className="absolute top-4 left-4 flex items-center gap-2 rounded-lg bg-[#0a130f]/90 px-3.5 py-1.5 text-xs text-white border border-white/10">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="font-semibold">{counterpart}</span>
                    <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold">({counterpartRole})</span>
                  </div>
                </div>
              )}

              {localCameraTrack && (isWaitingForCounterpart || showMaterialsOnStage || layoutMode === 'spotlight') && (
                <aside
                  aria-label="Self preview"
                  className={`${styles.participantCard} ${isWaitingForCounterpart ? 'relative m-3 ml-auto shrink-0 sm:absolute sm:m-0' : 'absolute bottom-3 right-3'} z-30 transition-all duration-300 sm:bottom-5 sm:right-5 ${
                    isSelfViewMinimized ? 'w-40 h-11' : 'w-36 sm:w-52 lg:w-60 aspect-video'
                  } group overflow-hidden rounded-xl bg-[#16221b] shadow-lg`}
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
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                            title="Minimize preview"
                          >
                            <Minimize2 className="h-4 w-4" />
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

        <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex min-h-24 items-center justify-center px-4 pb-5">
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-xl border border-white/20 bg-[#15221b] p-2 shadow-lg sm:gap-3 sm:p-2.5">
            {/* Microphone Button */}
            <button
              type="button"
              onClick={handleToggleMic}
              title={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
              aria-label={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
              className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
                isMicrophoneEnabled
                  ? 'bg-white/5 border border-white/20 text-white hover:bg-white/10'
                  : 'bg-[#422326] border border-rose-300/40 text-rose-200 hover:bg-[#563034]'
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
                  ? 'bg-white/5 border border-white/20 text-white hover:bg-white/10'
                  : 'bg-[#422326] border border-rose-300/40 text-rose-200 hover:bg-[#563034]'
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
                  ? 'bg-emerald-500/20 border border-emerald-300/40 text-emerald-200'
                  : 'bg-white/[0.06] border border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <MonitorUp className="h-5 w-5" />
            </button>

            <button ref={chatButton} type="button" onClick={() => togglePanel('chat')} aria-label={unreadCount ? `Chat, ${unreadCount} unread messages` : 'Chat'} aria-expanded={panel === 'chat'} aria-controls="classroom-side-panel" className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${panel === 'chat' ? 'border-emerald-300 bg-emerald-800' : 'border-white/20 bg-white/[0.06] hover:bg-white/15'}`}>
              <MessageSquare className="h-5 w-5" />
              {unreadCount > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 rounded-full bg-emerald-200 px-1.5 text-[11px] font-bold text-emerald-950">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
            <MeetingReactions publish={meetingReactions.publish} disabled={meetingReactions.disabled} pickerAnchor={meetingReactions.pickerAnchor} />

            {/* Materials Quick Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setShowMaterialsOnStage(!showMaterialsOnStage);
                if (!showMaterialsOnStage) setPanel('materials');
              }}
              title={showMaterialsOnStage ? 'Hide materials from stage' : 'Open Noorani Qaida materials'}
              className={`hidden sm:flex h-12 items-center gap-2 px-4 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 active:scale-95 border ${
                showMaterialsOnStage
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                  : 'bg-white/[0.06] border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <BookOpen className="h-4 w-4 text-emerald-400" />
              <span className="hidden md:inline">{showMaterialsOnStage ? 'Reading Slides' : 'Materials'}</span>
            </button>

            <div className="mx-1 h-6 w-px bg-white/10" />

            {userRole === 'lecturer' && <button type="button" onClick={() => endDialog.current?.showModal()} className="flex h-12 items-center rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 text-xs font-semibold text-emerald-100">End lesson</button>}
            {/* Leave Session Button */}
            <button
              type="button"
              onClick={onLeave}
              aria-label="Leave session"
              className="flex h-12 items-center gap-2 rounded-lg border border-rose-300/30 bg-[#b82f3f] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#cd3547]"
            >
              <PhoneOff className="h-4 w-4" />
              <span>Leave</span>
            </button>
          </div>
        </footer>
      </div>

      <dialog ref={endDialog} aria-labelledby="end-lesson-title" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-[#d6e0db] bg-white p-6 text-[#202823] backdrop:bg-black/60"><h2 id="end-lesson-title" className="text-xl font-semibold">End this lesson?</h2><p className="mt-3 text-sm text-[#56635c]">You must save a feedback note before completing this lesson. The student can then review the session.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => endDialog.current?.close()} className="rounded-lg border border-[#d6e0db] px-4 py-2 text-sm">Keep teaching</button><button type="button" onClick={completeLesson} className="rounded-lg bg-[#095F46] px-4 py-2 text-sm font-semibold text-white">Write lesson feedback</button></div></dialog>

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
            className="absolute inset-y-0 right-0 z-40 flex min-h-0 w-[min(22rem,calc(100vw-1rem))] shrink-0 flex-col border-l border-white/10 bg-[#0a130f] shadow-2xl md:relative md:z-20 md:w-80"
          >
            {/* Drawer Header */}
            <div className="flex min-h-16 items-center justify-between border-b border-white/10 px-5 bg-white/[0.02]">
              <div>
                <p className="font-bold text-sm text-white">{panel === 'materials' ? 'Quran & Tajweed Materials' : panel === 'chat' ? 'Meeting chat' : 'Participants'}</p>
                <p className="text-xs text-white/75">{panel === 'materials' ? 'Select a slide to study' : panel === 'chat' ? 'Everyone in this meeting' : `${participants.length} connected to room`}</p>
              </div>
              <button
                ref={panelClose}
                type="button"
                onClick={() => { setPanel(null); chatButton.current?.focus(); }}
                aria-label="Close panel"
                className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Content */}
            {panel === 'chat' ? <MeetingChat {...chat} /> : panel === 'materials' ? (
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
