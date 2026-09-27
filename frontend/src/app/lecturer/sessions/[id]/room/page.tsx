'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';
import {
  Loader2, AlertTriangle, RotateCcw,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { InteractiveClassroom } from '@/components/classroom/interactive-classroom';
import { LiveClassroom } from '@/components/classroom/live-classroom';

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

// ─── Main Lecturer Room Page ─────────────────────────────────────────────────
export default function LecturerSessionRoom({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);
  const router = useRouter();

  const [state, setState] = useState<'loading' | 'connected' | 'error'>('loading');
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReopening, setIsReopening] = useState(false);

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
              ? 'This session is currently marked as canceled or past in the database. You can reactivate it to start teaching.'
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
      <LiveClassroom
        sessionInfo={tokenData.session}
        userRole="lecturer"
        onLeave={() => router.push('/lecturer/sessions')}
      />
    </LiveKitRoom>
  );
}
