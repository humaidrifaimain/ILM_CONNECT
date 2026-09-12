'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';
import {
  Mic, MicOff, Video, VideoOff,
  ChevronRight, ChevronLeft, Loader2, Camera, AlertTriangle,
  Wifi, RotateCcw,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { InteractiveClassroom } from '@/components/classroom/interactive-classroom';
import { LiveClassroom } from '@/components/classroom/live-classroom';

// ─── Types ───────────────────────────────────────────────────────────────────
interface SessionInfo {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  studentName: string;
  lecturerName: string;
}

interface TokenResponse {
  token: string;
  wsUrl: string;
  roomName: string;
  isSimulation?: boolean;
  warning?: string;
  session: SessionInfo;
}

// ─── Pre-Join Screen ─────────────────────────────────────────────────────────
function PreJoinScreen({ onJoin, onBack, sessionInfo }: { onJoin: (mic: boolean, cam: boolean) => void; onBack: () => void; sessionInfo: SessionInfo | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  useEffect(() => {
    let s: MediaStream | null = null;
    (async () => {
      try {
        s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error('Could not access media devices:', err);
      }
    })();
    return () => { s?.getTracks().forEach(t => t.stop()); };
  }, []);

  // Keep videoRef in sync with stream
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      if (camEnabled) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream, camEnabled]);

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(t => { t.enabled = !micEnabled; });
      setMicEnabled(!micEnabled);
    }
  };

  const toggleCam = async () => {
    if (!camEnabled) {
      // Turning ON
      let s = stream;
      const hasLiveTrack = s?.getVideoTracks().some(t => t.readyState === 'live');
      if (!hasLiveTrack) {
        try {
          const newMedia = await navigator.mediaDevices.getUserMedia({ video: true, audio: micEnabled });
          const newTrack = newMedia.getVideoTracks()[0];
          if (s && newTrack) {
            s.getVideoTracks().forEach(t => { s?.removeTrack(t); t.stop(); });
            s.addTrack(newTrack);
          } else {
            s = newMedia;
            setStream(newMedia);
          }
        } catch (e) {
          console.error('Camera re-acquire failed:', e);
          return;
        }
      } else {
        s?.getVideoTracks().forEach(t => { t.enabled = true; });
      }
      setCamEnabled(true);
      if (videoRef.current && s) {
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(() => {});
      }
    } else {
      // Turning OFF
      stream?.getVideoTracks().forEach(t => { t.enabled = false; });
      setCamEnabled(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[hsl(var(--background))] flex items-center justify-center p-4 overflow-hidden selection:bg-[hsl(168,80%,26%)] selection:text-white">
      
      {/* ─── Premium Ambient Background ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle dot/grid texture */}
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--muted-foreground))_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.05] dark:opacity-[0.08]" />
        
        {/* Fullscreen Mosque Silhouette */}
        <div className="absolute bottom-0 left-0 w-full h-[60vh] flex items-end justify-center">
          <svg 
            className="w-[150vw] min-w-[1200px] text-[hsl(168,80%,26%)] opacity-[0.06] dark:opacity-[0.08]" 
            viewBox="0 0 1000 300" 
            preserveAspectRatio="xMidYMax meet" 
            fill="currentColor"
          >
            {/* Base Ground */}
            <rect x="-100" y="290" width="1200" height="10" rx="5" />
            
            {/* Main Onion Dome */}
            <path d="M 400 290 L 400 230 C 340 160, 480 120, 500 80 C 520 120, 660 160, 600 230 L 600 290 Z" />
            {/* Main Spire & Crescent */}
            <rect x="498" y="30" width="4" height="50" />
            <circle cx="500" cy="25" r="4" />
            <path d="M 500 5 A 12 12 0 1 0 512 17 A 9 9 0 1 1 500 5 Z" />

            {/* Left Minaret */}
            <rect x="250" y="140" width="24" height="150" />
            <rect x="246" y="220" width="32" height="6" rx="3" />
            <rect x="246" y="160" width="32" height="6" rx="3" />
            <path d="M 250 140 C 240 110, 260 100, 262 75 C 264 100, 284 110, 274 140 Z" />
            <rect x="261" y="55" width="2" height="20" />
            <circle cx="262" cy="52" r="3" />
            <path d="M 262 38 A 6 6 0 1 0 268 44 A 4.5 4.5 0 1 1 262 38 Z" />

            {/* Right Minaret */}
            <rect x="726" y="140" width="24" height="150" />
            <rect x="722" y="220" width="32" height="6" rx="3" />
            <rect x="722" y="160" width="32" height="6" rx="3" />
            <path d="M 726 140 C 716 110, 736 100, 738 75 C 740 100, 760 110, 750 140 Z" />
            <rect x="737" y="55" width="2" height="20" />
            <circle cx="738" cy="52" r="3" />
            <path d="M 738 38 A 6 6 0 1 0 744 44 A 4.5 4.5 0 1 1 738 38 Z" />

            {/* Left Small Onion Dome */}
            <path d="M 320 290 L 320 250 C 295 210, 350 190, 355 160 C 360 190, 415 210, 390 250 L 390 290 Z" />
            <rect x="354" y="140" width="2" height="20" />
            <circle cx="355" cy="138" r="2" />

            {/* Right Small Onion Dome */}
            <path d="M 610 290 L 610 250 C 585 210, 640 190, 645 160 C 650 190, 705 210, 680 250 L 680 290 Z" />
            <rect x="644" y="140" width="2" height="20" />
            <circle cx="645" cy="138" r="2" />

            {/* Arch Windows */}
            <path d="M 450 260 L 450 220 C 450 210, 470 210, 470 220 L 470 260 Z" opacity="0.2" />
            <path d="M 490 260 L 490 210 C 490 200, 510 200, 510 210 L 510 260 Z" opacity="0.2" />
            <path d="M 530 260 L 530 220 C 530 210, 550 210, 550 220 L 550 260 Z" opacity="0.2" />

            {/* Stars */}
            <path d="M 150 80 L 153 92 L 165 92 L 155 99 L 158 111 L 150 103 L 142 111 L 145 99 L 135 92 L 147 92 Z" opacity="0.4" />
            <path d="M 850 60 L 852 68 L 860 68 L 854 73 L 856 81 L 850 76 L 844 81 L 846 73 L 840 68 L 848 68 Z" opacity="0.4" />
            <path d="M 290 50 L 291 55 L 296 55 L 292 58 L 293 63 L 290 60 L 287 63 L 288 58 L 284 55 L 289 55 Z" opacity="0.3" />
            <path d="M 680 90 L 681 95 L 686 95 L 682 98 L 683 103 L 680 100 L 677 103 L 678 98 L 674 95 L 679 95 Z" opacity="0.3" />
          </svg>
        </div>

        {/* Soft Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] rounded-full bg-[hsl(168,80%,26%)] opacity-[0.04] dark:opacity-[0.06] blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '7s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[50vw] h-[50vw] rounded-full bg-[hsl(168,60%,35%)] opacity-[0.04] dark:opacity-[0.06] blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '11s' }} />
        
        {/* Vignette overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_100%)] opacity-80" />
      </div>
      
      {/* ─── Top Navigation ─── */}
      <div className="absolute top-6 left-6 z-20">
        <button 
          onClick={onBack}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))/0.05] backdrop-blur-md border border-transparent hover:border-[hsl(var(--border))] transition-all duration-300"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
          Back to Course
        </button>
      </div>

      {/* ─── Main Content Card ─── */}
      <div className="max-w-xl w-full relative z-10 flex flex-col items-center">
        
        {/* Header Section */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[hsl(168,80%,26%)/0.1] text-[hsl(168,80%,26%)] mb-2 ring-1 ring-[hsl(168,80%,26%)/0.2]">
            <Camera className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-[hsl(var(--foreground))] tracking-tight">Ready to Join?</h1>
          {sessionInfo && (
            <p className="text-[hsl(var(--muted-foreground))] text-base flex items-center justify-center gap-2">
              Session with <span className="font-semibold text-[hsl(var(--foreground))] px-3 py-1 rounded-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">{sessionInfo.lecturerName}</span>
            </p>
          )}
        </div>

        {/* Video Preview Container (Glassmorphism) */}
        <div className="w-full relative aspect-video bg-black/90 rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-[hsl(168,80%,26%)/0.15] mb-8 transition-transform duration-500 hover:scale-[1.02]">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-500 ${camEnabled ? 'opacity-100 block' : 'opacity-0 hidden'}`}
            style={{ transform: 'scaleX(-1)' }}
          />
          {!camEnabled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-black/80 to-[#0f172a]/90 backdrop-blur-xl">
              <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-white/5 border border-white/10 mb-4 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]">
                <VideoOff className="h-10 w-10 text-white/30" />
                {/* Decorative orbit */}
                <div className="absolute inset-0 rounded-full border border-dashed border-white/20 animate-[spin_10s_linear_infinite]" />
              </div>
              <p className="text-white/60 font-medium tracking-wide text-sm uppercase">Camera is Off</p>
            </div>
          )}

          {/* AV Controls Floating Overlay */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-4 p-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-xl">
            <button 
              onClick={toggleMic} 
              className={`group relative h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 ${micEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/90 text-white hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)]'}`}
            >
              {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-black/80 text-white text-xs px-2 py-1 rounded">Mic</span>
            </button>
            <button 
              onClick={toggleCam} 
              className={`group relative h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 ${camEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/90 text-white hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)]'}`}
            >
              {camEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-black/80 text-white text-xs px-2 py-1 rounded">Cam</span>
            </button>
          </div>
        </div>

        {/* Join Button */}
        <button
          onClick={() => onJoin(micEnabled, camEnabled)}
          className="group w-full py-4 rounded-2xl text-lg font-bold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,65%,40%)] hover:from-[hsl(168,85%,22%)] hover:to-[hsl(168,70%,35%)] shadow-lg shadow-[hsl(168,80%,26%)/0.3] hover:shadow-[hsl(168,80%,26%)/0.5] transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden relative"
        >
          {/* Button Shine Effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
          Join Session Now
          <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>
        
        <p className="mt-4 text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 opacity-70">
          <Wifi className="h-3.5 w-3.5" /> End-to-end encrypted connection
        </p>

      </div>
    </div>
  );
}




// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SessionRoom({
  params,
}: {
  params: Promise<{ courseId: string; id: string }>;
}) {
  const { courseId, id: sessionId } = use(params);
  const router = useRouter();

  const [state, setState] = useState<'prejoin' | 'connecting' | 'connected' | 'error'>('prejoin');
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialMic, setInitialMic] = useState(true);
  const [initialCam, setInitialCam] = useState(true);

  const [isReopening, setIsReopening] = useState(false);

  // Fetch session info for pre-join screen
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  // Fetch token from backend
  const fetchToken = useCallback(async () => {
    setState('connecting');
    try {
      const data = await apiFetch(`/livekit/token/${sessionId}`);
      setSessionInfo(data.session);
      setTokenData(data);
      setState('connected');
    } catch (err: any) {
      if (err.data?.session) {
        setSessionInfo(err.data.session);
      }
      setError(err.message || 'Failed to connect to session');
      setState('error');
    }
  }, [sessionId]);

  // Pre-join → fetch token on join click
  const handleJoin = (mic: boolean, cam: boolean) => {
    setInitialMic(mic);
    setInitialCam(cam);
    fetchToken();
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/livekit/token/${sessionId}`);
        setSessionInfo(data.session);
        setTokenData(data);
      } catch (err: any) {
        if (err.data?.session) {
          setSessionInfo(err.data.session);
        }
        // If canceled or not within window, record error
        setError(err.message);
      }
    })();
  }, [sessionId]);

  const handleReopenAndJoin = async () => {
    setIsReopening(true);
    try {
      const data = await apiFetch(`/livekit/token/${sessionId}?reopen=true`);
      setSessionInfo(data.session);
      setTokenData(data);
      setError(null);
      setState('connected');
      toast.success('Session Reopened', 'The session has been reactivated. Welcome to your classroom!');
    } catch (err: any) {
      toast.error('Reopen Failed', err.message || 'Could not reactivate session.');
      setError(err.message);
    } finally {
      setIsReopening(false);
    }
  };

  const isCanceledError = error?.toLowerCase().includes('cancel');

  // ── Error State ─────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--background))] flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 sm:p-8 shadow-2xl animate-fade-in relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[hsl(168,80%,26%)] opacity-5 blur-3xl pointer-events-none" />

          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isCanceledError ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-red-500/15 text-red-500'}`}>
            {isCanceledError ? (
              <RotateCcw className="h-8 w-8" />
            ) : (
              <AlertTriangle className="h-8 w-8" />
            )}
          </div>

          <h2 className="text-xl font-bold text-[hsl(var(--foreground))] mb-2">
            {isCanceledError ? 'Session Marked Canceled' : 'LiveKit Connection Notice'}
          </h2>

          <p className="text-[hsl(var(--muted-foreground))] text-sm mb-4 leading-relaxed">
            {isCanceledError
              ? 'This session was previously canceled or marked as past in the database. You can reactivate it and enter the live classroom.'
              : error}
          </p>

          {sessionInfo && (
            <div className="mb-6 p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] flex items-center justify-center gap-4 flex-wrap">
              <span><strong>Student:</strong> {sessionInfo.studentName}</span>
              <span>•</span>
              <span><strong>Lecturer:</strong> {sessionInfo.lecturerName}</span>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {isCanceledError && (
              <button
                onClick={handleReopenAndJoin}
                disabled={isReopening}
                className="w-full py-3 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isReopening ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Reactivating Session...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" /> Reopen & Enter Classroom
                  </>
                )}
              </button>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => router.push(`/student/courses/${courseId}/sessions`)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Back to Sessions
              </button>
              <button
                onClick={() => { setError(null); setState('prejoin'); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Connecting State ────────────────────────────────────────────────────
  if (state === 'connecting') {
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--background))] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-[hsl(168,80%,26%)] animate-spin mx-auto mb-4" />
          <p className="text-[hsl(var(--muted-foreground))] text-sm">Connecting to session...</p>
        </div>
      </div>
    );
  }

  // ── Pre-Join State ──────────────────────────────────────────────────────
  if (state === 'prejoin') {
    return <PreJoinScreen onJoin={handleJoin} onBack={() => router.back()} sessionInfo={sessionInfo} />;
  }

  // ── Connected ───────────────────────────────────────────────────────────
  if (!tokenData) return null;

  // Interactive Classroom (WebRTC camera, microphone, slides & chat)
  if (tokenData.isSimulation || !tokenData.wsUrl) {
    return (
      <InteractiveClassroom
        sessionInfo={tokenData.session}
        userRole="student"
        courseId={courseId}
        initialMic={initialMic}
        initialCam={initialCam}
        warning={tokenData.warning}
        onLeave={() => router.push(`/student/courses/${courseId}/feedback?sessionId=${sessionId}`)}
      />
    );
  }

  // Cloud LiveKit Room
  return (
    <LiveKitRoom
      token={tokenData.token}
      serverUrl={tokenData.wsUrl}
      connect={true}
      video={initialCam}
      audio={initialMic}
      onError={(err) => {
        console.error('LiveKit connection error:', err);
        setError(err.message || 'Failed to connect to LiveKit video server');
        setState('error');
      }}
      onDisconnected={() => {
        router.push(`/student/courses/${courseId}/feedback?sessionId=${sessionId}`);
      }}
      style={{ height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 50 }}
    >
      <LiveClassroom
        sessionInfo={tokenData.session}
        userRole="student"
        courseId={courseId}
        onLeave={() => router.push(`/student/courses/${courseId}/feedback?sessionId=${sessionId}`)}
      />
    </LiveKitRoom>
  );
}
