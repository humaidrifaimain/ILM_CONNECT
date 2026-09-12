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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#10201c] text-white selection:bg-emerald-300 selection:text-[#10201c]">
      <header className="flex h-16 items-center justify-between border-b border-white/10 px-4 sm:px-7">
        <button onClick={onBack} className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-300 text-[#10201c]"><Camera className="h-4 w-4" /></span>
          IlmConnect Classroom
        </div>
        <span className="hidden items-center gap-1.5 text-xs text-white/45 sm:flex"><Wifi className="h-3.5 w-3.5" /> Secure room</span>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <div className="min-w-0">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#09120f] shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
            <video ref={videoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${camEnabled ? 'block' : 'hidden'}`} style={{ transform: 'scaleX(-1)' }} />
            {!camEnabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/55">
                <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]"><VideoOff className="h-7 w-7" /></span>
                <p className="text-sm font-medium">Camera is off</p>
              </div>
            )}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-black/55 p-2 backdrop-blur-md">
              <button type="button" onClick={toggleMic} aria-label={micEnabled ? 'Turn microphone off' : 'Turn microphone on'} aria-pressed={!micEnabled} className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${micEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500 text-white'}`}>
                {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>
              <button type="button" onClick={toggleCam} aria-label={camEnabled ? 'Turn camera off' : 'Turn camera on'} aria-pressed={!camEnabled} className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${camEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500 text-white'}`}>
                {camEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-white/40">Check your camera and microphone before entering.</p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-6">
          <span className="mb-5 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">Ready to join</span>
          <h1 className="text-2xl font-semibold tracking-tight">Your lesson is ready</h1>
          {sessionInfo && (
            <div className="my-6 border-y border-white/10 py-5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/40">Lecturer</p>
              <p className="mt-1 text-base font-semibold">{sessionInfo.lecturerName}</p>
              <p className="mt-3 text-sm text-white/50">{new Date(sessionInfo.startsAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </div>
          )}
          <button onClick={() => onJoin(micEnabled, camEnabled)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-bold text-[#10201c] transition-colors hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10201c]">
            Enter classroom <ChevronRight className="h-4 w-4" />
          </button>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/40"><Wifi className="h-3.5 w-3.5" /> Encrypted LiveKit connection</p>
        </section>
      </main>
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
