'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useRoomContext,
  useConnectionState,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, ConnectionState } from 'livekit-client';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare,
  Monitor, X, ChevronRight, Loader2, Camera, AlertTriangle,
  Clock, Wifi, WifiOff, FileText, RotateCcw,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { InteractiveClassroom } from '@/components/classroom/interactive-classroom';

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

// ─── Session Timer ───────────────────────────────────────────────────────────
function SessionTimer({ startsAt }: { startsAt: string }) {
  const [elapsed, setElapsed] = useState('00:00:00');
  useEffect(() => {
    const start = new Date(startsAt).getTime();
    const interval = setInterval(() => {
      const diff = Math.max(0, Date.now() - start);
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startsAt]);
  return (
    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-white/10 text-white/70 flex items-center gap-1.5">
      <Clock className="h-3 w-3" /> {elapsed}
    </span>
  );
}

function ConnectionIndicator() {
  const state = useConnectionState();
  const config: Record<string, { label: string; color: string; icon: any }> = {
    [ConnectionState.Connected]: { label: 'Connected', color: 'bg-green-500/20 text-green-400', icon: Wifi },
    [ConnectionState.Connecting]: { label: 'Connecting...', color: 'bg-yellow-500/20 text-yellow-400', icon: Wifi },
    [ConnectionState.Reconnecting]: { label: 'Reconnecting...', color: 'bg-yellow-500/20 text-yellow-400', icon: Wifi },
    [ConnectionState.Disconnected]: { label: 'Disconnected', color: 'bg-red-500/20 text-red-400', icon: WifiOff },
  };
  const c = config[state] || config[ConnectionState.Disconnected];
  const Icon = c.icon;
  return (
    <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${c.color}`}>
      <Icon className="h-3.5 w-3.5" /> {c.label}
    </div>
  );
}

// ─── Lecturer Video Stage ────────────────────────────────────────────────────
function LecturerVideoStage({ sessionInfo, showNotes, setShowNotes }: {
  sessionInfo: SessionInfo;
  showNotes: boolean;
  setShowNotes: (v: boolean) => void;
}) {
  const router = useRouter();
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
    { source: Track.Source.Microphone, withPlaceholder: false },
  ]);
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setIsScreenSharing(!!localParticipant.isScreenShareEnabled);
  }, [localParticipant.isScreenShareEnabled]);

  const remoteCameraTrack = tracks.find(
    t => t.participant.identity !== localParticipant.identity && t.source === Track.Source.Camera && t.publication?.track
  );
  const localCameraTrack = tracks.find(
    t => t.participant.identity === localParticipant.identity && t.source === Track.Source.Camera
  );
  const screenShareTrack = tracks.find(
    t => t.source === Track.Source.ScreenShare && (t.publication?.track || t.publication?.isSubscribed)
  ) || tracks.find(t => t.source === Track.Source.ScreenShare);
  const remoteParticipant = participants.find(p => p.identity !== localParticipant.identity);
  const remoteName = remoteParticipant?.name || sessionInfo.studentName;

  const toggleScreenShare = async () => {
    try {
      const next = !localParticipant.isScreenShareEnabled;
      await localParticipant.setScreenShareEnabled(next);
      setIsScreenSharing(next);
    } catch (err) { console.error('Screen share error:', err); }
  };

  const handleEndSession = () => {
    room.disconnect();
    router.push('/lecturer/sessions');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] text-white flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-5 bg-[#0f172a]/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <h1 className="font-semibold text-sm lg:text-base truncate">Session with {sessionInfo.studentName}</h1>
          <SessionTimer startsAt={sessionInfo.startsAt} />
        </div>
        <ConnectionIndicator />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 relative transition-all duration-300 p-3 ${showNotes ? 'mr-[360px]' : ''}`}>
          <div className="w-full h-full bg-black rounded-2xl overflow-hidden relative border border-white/10">
            {screenShareTrack?.publication?.track ? (
              <VideoTrack trackRef={screenShareTrack} className="w-full h-full object-contain" />
            ) : remoteCameraTrack?.publication?.track ? (
              <VideoTrack trackRef={remoteCameraTrack} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[hsl(168,65%,45%)] to-[hsl(168,50%,55%)] flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-white">
                    {remoteName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <p className="text-white/60 text-sm">{remoteName}</p>
                <p className="text-white/30 text-xs mt-1">Waiting for student to join...</p>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1.5 rounded-lg text-sm font-medium backdrop-blur-sm z-10">{remoteName}</div>
            <div className="absolute bottom-3 right-3 w-40 lg:w-48 aspect-video bg-[#1e293b] rounded-xl border-2 border-white/20 overflow-hidden shadow-2xl z-10">
              {localParticipant.isCameraEnabled && localCameraTrack?.publication?.track ? (
                <VideoTrack trackRef={localCameraTrack} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><VideoOff className="h-5 w-5 text-white/30" /></div>
              )}
              <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-2 py-0.5 rounded text-[10px] font-medium z-10">You (Lecturer)</div>
            </div>
          </div>
        </div>

        {/* Session Notes Panel */}
        <div className={`absolute top-14 right-0 bottom-[76px] w-[360px] bg-[#1e293b] border-l border-white/10 flex flex-col transition-transform duration-300 ${showNotes ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="font-semibold flex items-center gap-2 text-sm"><FileText className="h-4 w-4" /> Session Notes</h2>
            <button onClick={() => setShowNotes(false)} className="p-1 hover:bg-white/10 rounded-md transition-colors"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Live Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Topics covered, student progress, homework..."
                className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white/90 placeholder-white/30 resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(168,80%,26%)]"
              />
            </div>
            <div className="text-xs text-white/30">Notes are saved automatically at the end of the session.</div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="h-[76px] bg-[#0f172a] border-t border-white/10 flex items-center justify-center px-6 gap-3 z-10 flex-shrink-0">
        <button onClick={() => localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${localParticipant.isMicrophoneEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500 hover:bg-red-600'}`}>
          {localParticipant.isMicrophoneEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>
        <button onClick={async () => {
          await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
        }}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${localParticipant.isCameraEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500 hover:bg-red-600'}`}>
          {localParticipant.isCameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>
        <button onClick={toggleScreenShare}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-[hsl(168,80%,26%)] ring-2 ring-[hsl(168,80%,26%)]' : 'bg-white/10 hover:bg-white/20'}`}>
          <Monitor className="h-5 w-5" />
        </button>
        {!showNotes && (
          <button onClick={() => setShowNotes(true)} className="h-12 w-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all">
            <FileText className="h-5 w-5" />
          </button>
        )}
        <button onClick={handleEndSession} className="ml-6 px-6 py-2.5 rounded-full text-sm font-semibold bg-red-500 hover:bg-red-600 transition-colors flex items-center gap-2">
          <PhoneOff className="h-4 w-4" /> End Session
        </button>
      </div>
    </div>
  );
}

// ─── Main Lecturer Room Page ─────────────────────────────────────────────────
export default function LecturerSessionRoom() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [state, setState] = useState<'loading' | 'connected' | 'error'>('loading');
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReopening, setIsReopening] = useState(false);
  const [showNotes, setShowNotes] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/livekit/token/${sessionId}`);
        setSessionInfo(data.session);
        setTokenData(data);
        setState('connected');
      } catch (err: any) {
        if (err.data?.session) {
          setSessionInfo(err.data.session);
        }
        setError(err.message || 'Failed to connect');
        setState('error');
      }
    })();
  }, [sessionId]);

  const handleReopenAndStart = async () => {
    setIsReopening(true);
    try {
      const data = await apiFetch(`/livekit/token/${sessionId}?reopen=true`);
      setSessionInfo(data.session);
      setTokenData(data);
      setError(null);
      setState('connected');
      toast.success('Session Reopened', 'The session has been reactivated. Starting classroom...');
    } catch (err: any) {
      toast.error('Reopen Failed', err.message || 'Could not reactivate session.');
      setError(err.message);
    } finally {
      setIsReopening(false);
    }
  };

  const effectiveSession: SessionInfo = sessionInfo || tokenData?.session || {
    id: sessionId,
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
    status: 'CANCELED',
    studentName: 'Student',
    lecturerName: 'Lecturer',
  };

  const isCanceledError = error?.toLowerCase().includes('cancel');

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
              ? 'This session is currently marked as canceled or past in the database. You can reactivate this session to start teaching immediately, or launch the interactive classroom in simulation mode.'
              : error}
          </p>

          {(sessionInfo || tokenData?.session) && (
            <div className="mb-6 p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] flex items-center justify-center gap-4 flex-wrap">
              <span><strong>Student:</strong> {(sessionInfo || tokenData?.session)?.studentName}</span>
              <span>•</span>
              <span><strong>Time:</strong> {new Date((sessionInfo || tokenData?.session)?.startsAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {isCanceledError && (
              <button
                onClick={handleReopenAndStart}
                disabled={isReopening}
                className="w-full py-3 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isReopening ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Reactivating Session...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" /> Reopen & Start Class
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => {
                setTokenData({
                  token: 'sim_token',
                  wsUrl: '',
                  isSimulation: true,
                  roomName: `ilm-session-${sessionId}`,
                  session: effectiveSession,
                  warning: error || undefined,
                });
                setState('connected');
              }}
              className={`w-full py-3 px-5 rounded-xl text-sm font-semibold transition-all ${
                isCanceledError
                  ? 'border border-[hsl(var(--primary)/0.4)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.08)]'
                  : 'text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg'
              }`}
            >
              Start in Interactive Classroom
            </button>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => router.push('/lecturer/sessions')}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Back to Sessions
              </button>
              <button
                onClick={async () => {
                  setError(null);
                  setState('loading');
                  try {
                    const data = await apiFetch(`/livekit/token/${sessionId}`);
                    setSessionInfo(data.session);
                    setTokenData(data);
                    setState('connected');
                  } catch (err: any) {
                    if (err.data?.session) {
                      setSessionInfo(err.data.session);
                    }
                    setError(err.message || 'Failed to connect');
                    setState('error');
                  }
                }}
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

  if (state === 'loading' || !tokenData) {
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--background))] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-[hsl(168,80%,26%)] animate-spin mx-auto mb-4" />
          <p className="text-[hsl(var(--muted-foreground))] text-sm">Connecting to session...</p>
        </div>
      </div>
    );
  }

  // Interactive Classroom (WebRTC camera, microphone, student notes & chat)
  if (tokenData.isSimulation || !tokenData.wsUrl) {
    return (
      <InteractiveClassroom
        sessionInfo={tokenData.session}
        userRole="lecturer"
        warning={tokenData.warning}
        onLeave={() => router.push('/lecturer/sessions')}
      />
    );
  }

  return (
    <LiveKitRoom
      token={tokenData.token}
      serverUrl={tokenData.wsUrl}
      connect={true}
      video={true}
      audio={true}
      onError={(err) => {
        console.error('LiveKit connection error:', err);
        setError(err.message || 'Failed to connect to LiveKit video server');
        setState('error');
      }}
      onDisconnected={() => router.push('/lecturer/sessions')}
      style={{ height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 50 }}
    >
      <LecturerVideoStage sessionInfo={tokenData.session} showNotes={showNotes} setShowNotes={setShowNotes} />
    </LiveKitRoom>
  );
}
