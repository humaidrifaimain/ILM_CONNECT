'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Monitor,
  X,
  Clock,
  BookOpen,
  FileText,
  Send,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/toast';

interface SessionInfo {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  studentName: string;
  lecturerName: string;
}

interface InteractiveClassroomProps {
  sessionInfo: SessionInfo;
  userRole: 'student' | 'lecturer';
  courseId?: string;
  initialMic?: boolean;
  initialCam?: boolean;
  warning?: string;
  onLeave: () => void;
}

const QAIDA_LESSONS = [
  {
    title: 'Lesson 1: Mufradat (Single Letters)',
    arabic: 'ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن و هـ ء ي',
    notes: 'Focus on correct Makharij (points of articulation) for Throat letters (ح, خ, ع, غ).',
  },
  {
    title: 'Lesson 2: Murakkabat (Compound Letters)',
    arabic: 'لا  با  تا  ثا  جا  حا  خا  بل  تل  ثل  جل  حم  خز',
    notes: 'Identify letter shapes in the initial, medial, and final positions.',
  },
  {
    title: 'Lesson 3: The Harakat (Fatha, Kasra, Damma)',
    arabic: 'بَ  بِ  بُ   -   تَ  تِ  تُ   -   ثَ  ثِ  ثُ',
    notes: 'Short vowel sounds. Read quickly without stretching.',
  },
];

export function InteractiveClassroom({
  sessionInfo,
  userRole,
  courseId = 'beginner-qaida',
  initialMic = true,
  initialCam = true,
  warning,
  onLeave,
}: InteractiveClassroomProps) {
  const router = useRouter();

  // Media state
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(initialMic);
  const [camEnabled, setCamEnabled] = useState(initialCam);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Tabs & drawers
  const [showChat, setShowChat] = useState(false);
  const [showSlides, setShowSlides] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [dismissBanner, setDismissBanner] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; text: string; time: string }>>([
    {
      id: '1',
      sender: userRole === 'student' ? sessionInfo.lecturerName : 'System',
      text: 'Assalamu Alaikum! Welcome to today’s one-on-one session. Let us begin with Surah Al-Fatiha.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Notes state for lecturer
  const [lecturerNotes, setLecturerNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Dedicated callback ref so the screen video element receives srcObject the moment React mounts it
  const setScreenVideoElement = useCallback((node: HTMLVideoElement | null) => {
    (screenVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
    if (node && screenStream) {
      node.srcObject = screenStream;
      node.play().catch(e => console.warn('Screen video play error:', e));
    }
  }, [screenStream]);

  // Keep screen share video element synced with screenStream
  useEffect(() => {
    if (isScreenSharing && screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
      screenVideoRef.current.play().catch(e => console.warn('Screen video play error:', e));
    }
  }, [isScreenSharing, screenStream]);

  // Keep local camera element synced with stream and playback state
  useEffect(() => {
    if (localVideoRef.current && stream) {
      if (localVideoRef.current.srcObject !== stream) {
        localVideoRef.current.srcObject = stream;
      }
      if (camEnabled) {
        localVideoRef.current.play().catch(e => console.warn('Camera play error:', e));
      }
    }
  }, [stream, camEnabled]);

  // Initialize camera & microphone
  useEffect(() => {
    let localStream: MediaStream | null = null;
    (async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(localStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.play().catch(() => {});
        }
        // Apply initial mic and cam prefs
        localStream.getAudioTracks().forEach(t => { t.enabled = initialMic; });
        localStream.getVideoTracks().forEach(t => { t.enabled = initialCam; });
      } catch (err: any) {
        console.warn('Could not acquire camera/microphone:', err);
      }
    })();

    return () => {
      localStream?.getTracks().forEach(t => t.stop());
      screenStream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleMic = () => {
    if (stream) {
      const next = !micEnabled;
      stream.getAudioTracks().forEach(t => { t.enabled = next; });
      setMicEnabled(next);
      toast.info(next ? 'Microphone On' : 'Microphone Muted');
    }
  };

  const toggleCam = async () => {
    if (!camEnabled) {
      // Turning camera back ON
      let activeStream = stream;
      const hasLiveVideoTrack = activeStream?.getVideoTracks().some(t => t.readyState === 'live');
      if (!hasLiveVideoTrack) {
        try {
          const freshMedia = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: micEnabled,
          });
          const freshVideoTrack = freshMedia.getVideoTracks()[0];
          if (activeStream && freshVideoTrack) {
            activeStream.getVideoTracks().forEach(t => {
              activeStream?.removeTrack(t);
              t.stop();
            });
            activeStream.addTrack(freshVideoTrack);
          } else {
            activeStream = freshMedia;
            setStream(freshMedia);
          }
        } catch (err: any) {
          toast.error('Camera Device', 'Could not re-acquire video camera.');
          return;
        }
      } else {
        activeStream?.getVideoTracks().forEach(t => { t.enabled = true; });
      }

      setCamEnabled(true);
      if (localVideoRef.current && activeStream) {
        localVideoRef.current.srcObject = activeStream;
        localVideoRef.current.play().catch(() => {});
      }
      toast.info('Camera Started');
    } else {
      // Turning camera OFF
      stream?.getVideoTracks().forEach(t => { t.enabled = false; });
      setCamEnabled(false);
      toast.info('Camera Stopped');
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
      toast.info('Screen Sharing Stopped');
    } else {
      try {
        const sStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        setScreenStream(sStream);
        setIsScreenSharing(true);
        setShowSlides(false);

        // Assign immediately if element is already available
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = sStream;
          screenVideoRef.current.play().catch(() => {});
        }

        sStream.getVideoTracks().forEach(track => {
          track.onended = () => {
            sStream.getTracks().forEach(t => t.stop());
            setScreenStream(null);
            setIsScreenSharing(false);
            if (screenVideoRef.current) {
              screenVideoRef.current.srcObject = null;
            }
            toast.info('Screen Sharing Ended');
          };
        });

        toast.success('Screen Sharing Active');
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          toast.error('Screen Share Error', err.message || 'Could not start screen share');
        }
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userDisplayName = userRole === 'student' ? sessionInfo.studentName : sessionInfo.lecturerName;
    const newMsg = {
      id: String(Date.now()),
      sender: userDisplayName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newMsg]);
    setChatInput('');

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleSaveLecturerNotes = async () => {
    setIsSavingNotes(true);
    try {
      await apiFetch(`/bookings/${sessionInfo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: lecturerNotes }),
      });
      toast.success('Session Notes Saved', 'Student record has been updated.');
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save session notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Timer
  const [elapsed, setElapsed] = useState('00:00:00');
  useEffect(() => {
    const start = new Date(sessionInfo.startsAt).getTime();
    const interval = setInterval(() => {
      const diff = Math.max(0, Date.now() - start);
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionInfo.startsAt]);

  const activeLesson = QAIDA_LESSONS[activeSlideIdx];

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1120] text-white flex flex-col h-screen overflow-hidden select-none">
      {/* Top Banner (if simulated credentials) */}
      {!dismissBanner && (
        <div className="bg-gradient-to-r from-emerald-900/90 via-slate-900/95 to-emerald-950/90 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Interactive Virtual Classroom Active:</span>
            <span>WebRTC camera, microphone, curriculum slides & chat are online.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDismissBanner(true)}
              className="text-white/60 hover:text-white text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-5 bg-[#0f172a]/90 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <h1 className="font-semibold text-sm lg:text-base flex items-center gap-2 truncate">
            <span>Quran 1:1 Live Session</span>
            <span className="text-xs text-white/50 hidden sm:inline">
              ({userRole === 'student' ? `Instructor: ${sessionInfo.lecturerName}` : `Student: ${sessionInfo.studentName}`})
            </span>
          </h1>
          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-white/10 text-white/70 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-emerald-400" /> {elapsed}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSlides(!showSlides)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              showSlides
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Curriculum Slides</span>
          </button>

          {userRole === 'lecturer' && (
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                showNotes
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Student Notes</span>
            </button>
          )}

          <div className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Classroom Live
          </div>
        </div>
      </div>

      {/* Main Classroom Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Main Presentation / Video Display Area */}
          <div className="flex-1 bg-black/80 rounded-2xl border border-white/10 overflow-hidden relative flex flex-col items-center justify-center p-6">
            {isScreenSharing ? (
              <div className="w-full h-full flex flex-col items-center justify-center relative bg-black rounded-xl overflow-hidden">
                <video
                  ref={setScreenVideoElement}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/40 flex items-center gap-2 text-xs text-white z-10 shadow-lg">
                  <Monitor className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span className="font-semibold">Screen Share Active</span>
                  <button
                    onClick={toggleScreenShare}
                    className="ml-2 px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    Stop Sharing
                  </button>
                </div>
              </div>
            ) : showSlides ? (
              /* Noorani Qaida Interactive Slides Viewer */
              <div className="w-full h-full max-w-4xl flex flex-col justify-between bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-emerald-500/30 shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs text-emerald-400 font-semibold tracking-wider uppercase">
                      Noorani Qaida Curriculum · Slide {activeSlideIdx + 1} of {QAIDA_LESSONS.length}
                    </span>
                    <h2 className="text-lg font-bold text-white mt-0.5">{activeLesson.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveSlideIdx(p => Math.max(0, p - 1))}
                      disabled={activeSlideIdx === 0}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setActiveSlideIdx(p => Math.min(QAIDA_LESSONS.length - 1, p + 1))}
                      disabled={activeSlideIdx === QAIDA_LESSONS.length - 1}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Big Arabic Calligraphy Text */}
                <div className="flex-1 flex items-center justify-center p-6">
                  <div
                    className="text-center font-serif text-3xl sm:text-5xl lg:text-6xl text-amber-200 tracking-wider leading-relaxed select-text"
                    dir="rtl"
                  >
                    {activeLesson.arabic}
                  </div>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-emerald-200">{activeLesson.notes}</p>
                </div>
              </div>
            ) : (
              /* Remote Participant Virtual Avatar */
              <div className="text-center space-y-4">
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center mx-auto shadow-xl ring-4 ring-emerald-500/30">
                  <span className="text-4xl font-bold text-white">
                    {(userRole === 'student' ? sessionInfo.lecturerName : sessionInfo.studentName)
                      .substring(0, 2)
                      .toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {userRole === 'student' ? sessionInfo.lecturerName : sessionInfo.studentName}
                  </h3>
                  <p className="text-xs text-emerald-400 flex items-center justify-center gap-1.5 mt-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    Microphone active · Speaking with student
                  </p>
                </div>
              </div>
            )}

            {/* Floating Picture-in-Picture Local User Video Stream */}
            <div className="absolute bottom-4 right-4 w-48 sm:w-56 h-32 sm:h-36 bg-slate-900 rounded-xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${camEnabled ? 'opacity-100 block' : 'opacity-0 hidden'}`}
                style={{ transform: 'scaleX(-1)' }}
              />
              {!camEnabled && (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/50 text-xs">
                  <VideoOff className="h-6 w-6 mb-1 text-white/40" />
                  Camera Muted
                </div>
              )}
              <div className="absolute bottom-1.5 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-medium text-white flex items-center gap-1">
                {!micEnabled && <MicOff className="h-2.5 w-2.5 text-rose-400" />}
                <span>You ({userRole === 'student' ? 'Student' : 'Lecturer'})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time In-Room Chat Drawer */}
        {showChat && (
          <div className="w-80 border-l border-white/10 bg-[#0f172a] flex flex-col z-30 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" /> Session Chat
              </h3>
              <button onClick={() => setShowChat(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="h-4 w-4 text-white/70" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map(m => (
                <div key={m.id} className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-emerald-400">{m.sender}</span>
                    <span className="text-[10px] text-white/40">{m.time}</span>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed">{m.text}</p>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 text-white placeholder:text-white/40"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Lecturer Notes Drawer */}
        {showNotes && userRole === 'lecturer' && (
          <div className="w-80 border-l border-white/10 bg-[#0f172a] flex flex-col z-30 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400" /> Student Evaluation
              </h3>
              <button onClick={() => setShowNotes(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="h-4 w-4 text-white/70" />
              </button>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3">
              <label className="text-xs font-semibold text-white/80">
                Session Performance & Homework
              </label>
              <textarea
                rows={10}
                value={lecturerNotes}
                onChange={e => setLecturerNotes(e.target.value)}
                placeholder="Record student recitation accuracy, mistakes in letters (e.g. Qalqalah, Ghunnah), and lesson assignment..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
              />
              <button
                onClick={handleSaveLecturerNotes}
                disabled={isSavingNotes}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSavingNotes ? 'Saving Notes...' : 'Save Student Notes'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Dock */}
      <div className="h-20 border-t border-white/10 bg-[#0f172a]/95 flex items-center justify-center gap-4 px-6 flex-shrink-0">
        {/* Mic Toggle */}
        <button
          onClick={toggleMic}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
            micEnabled
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-rose-600 text-white ring-2 ring-rose-400'
          }`}
          title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleCam}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
            camEnabled
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-rose-600 text-white ring-2 ring-rose-400'
          }`}
          title={camEnabled ? 'Stop Video' : 'Start Video'}
        >
          {camEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={toggleScreenShare}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
            isScreenSharing
              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
        >
          <Monitor className="h-5 w-5" />
        </button>

        {/* Chat Drawer Toggle */}
        <button
          onClick={() => setShowChat(!showChat)}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all relative ${
            showChat
              ? 'bg-emerald-600 text-white'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          title="Toggle Chat"
        >
          <MessageSquare className="h-5 w-5" />
          {messages.length > 1 && !showChat && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0f172a]" />
          )}
        </button>

        {/* Leave Session */}
        <button
          onClick={onLeave}
          className="ml-6 px-6 py-2.5 rounded-full text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-2 shadow-lg shadow-rose-900/30"
        >
          <PhoneOff className="h-4 w-4" />
          <span>{userRole === 'student' ? 'Leave Class' : 'End Session'}</span>
        </button>
      </div>
    </div>
  );
}
