'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnectionState, useDataChannel, useLocalParticipant } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { Smile } from 'lucide-react';

const reactions = [
  { emoji: '👍', label: 'Thumbs up' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '😮', label: 'Surprised' },
] as const;

type Reaction = { identity: string; name: string; emoji: string; expiresAt: number };

export function useMeetingReactions() {
  const [active, setActive] = useState<Reaction[]>([]);
  const { localParticipant } = useLocalParticipant();
  const connected = useConnectionState() === ConnectionState.Connected;
  const add = useCallback((identity: string, name: string, emoji: string) => {
    setActive((current) => [...current.filter((item) => item.identity !== identity).slice(-7), { identity, name, emoji, expiresAt: Date.now() + 5000 }]);
  }, []);
  const receive = useCallback((message: { payload: Uint8Array; from?: { identity: string; name?: string } }) => {
    if (!message.from || message.payload.byteLength > 64) return;
    const emoji = new TextDecoder().decode(message.payload);
    if (reactions.some((reaction) => reaction.emoji === emoji)) add(message.from.identity, message.from.name || message.from.identity, emoji);
  }, [add]);
  const { send, isSending } = useDataChannel('ilm.meeting.reaction', receive);
  useEffect(() => {
    if (!active.length) return;
    const timer = window.setTimeout(() => setActive((current) => current.filter((item) => item.expiresAt > Date.now())), Math.max(0, Math.min(...active.map((item) => item.expiresAt)) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [active]);

  const publish = async (emoji: string) => {
    await send(new TextEncoder().encode(emoji), { reliable: true });
    add(localParticipant.identity, 'You', emoji);
  };
  return { active: connected ? active : [], publish, disabled: !connected || isSending };
}

export function MeetingReactions({ publish, disabled }: Pick<ReturnType<typeof useMeetingReactions>, 'publish' | 'disabled'>) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const sending = useRef(false);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[data-reaction]')?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return (
    <div ref={root} className="relative" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button ref={trigger} type="button" aria-label="Reactions" aria-expanded={open} aria-controls="meeting-reactions" onClick={() => { setError(''); setOpen(!open); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><Smile className="h-5 w-5" /></button>
      {open && <div id="meeting-reactions" role="group" aria-label="Send a reaction" className="absolute bottom-full right-0 mb-3 w-56 rounded-xl border border-white/20 bg-[#0a130f] p-3 shadow-xl">
        <p className="mb-2 text-xs text-white/80">Send a reaction</p>
        <div className="grid grid-cols-3 gap-2">{reactions.map(({ emoji, label }) => <button data-reaction key={label} type="button" aria-label={label} title={label} disabled={disabled} onClick={async () => {
          if (sending.current) return;
          sending.current = true;
          setError('');
          try { await publish(emoji); setOpen(false); trigger.current?.focus(); } catch { setError('Reaction could not be sent. Try again.'); } finally { sending.current = false; }
        }} className="flex h-11 items-center justify-center rounded-lg text-2xl hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:opacity-50"><span aria-hidden="true">{emoji}</span></button>)}</div>
        {disabled && <p className="mt-2 text-xs text-white/80">Reactions need a connection.</p>}
        {error && <p role="alert" className="mt-2 text-xs text-rose-200">{error}</p>}
      </div>}
    </div>
  );
}
