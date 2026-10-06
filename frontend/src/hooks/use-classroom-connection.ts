'use client';

import { useCallback, useEffect, useRef } from 'react';
import { isCanceledClassroomConnection } from '@/lib/classroom-connection';

export function useClassroomConnection(onLeave: () => void, onError: (error: Error) => void) {
  const active = useRef(true);
  const leaving = useRef(false);
  const connected = useRef(false);

  useEffect(() => {
    active.current = true;
    leaving.current = false;
    connected.current = false;
    return () => { active.current = false; };
  }, []);

  const handleLeave = useCallback(() => {
    if (!active.current || leaving.current) return;
    leaving.current = true;
    onLeave();
  }, [onLeave]);

  const handleError = useCallback((error: Error) => {
    if (!active.current || leaving.current || isCanceledClassroomConnection(error)) return;
    connected.current = false;
    onError(error);
  }, [onError]);

  const handleConnected = useCallback(() => {
    if (active.current && !leaving.current) connected.current = true;
  }, []);

  const handleDisconnected = useCallback(() => {
    if (!connected.current) return;
    connected.current = false;
    handleLeave();
  }, [handleLeave]);

  return { handleLeave, handleError, handleConnected, handleDisconnected };
}
