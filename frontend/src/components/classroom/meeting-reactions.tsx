'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConnectionState, useDataChannel, useLocalParticipant } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { Smile } from 'lucide-react';
import styles from './classroom.module.css';

const reactions = [
  { emoji: '👍', label: 'Thumbs up' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '😮', label: 'Surprised' },
] as const;

type ReactionOrigin = { x: number; y: number };
type Reaction = { id: number; identity: string; emoji: string; origin: ReactionOrigin; expiresAt: number };

export function useMeetingReactions() {
  const [active, setActive] = useState<Reaction[]>([]);
  const sequence = useRef(0);
  const pickerAnchor = useRef<HTMLDivElement>(null);
  const { localParticipant } = useLocalParticipant();
  const connected = useConnectionState() === ConnectionState.Connected;
  const add = useCallback((identity: string, emoji: string, origin?: ReactionOrigin) => {
    const bounds = (pickerAnchor.current?.querySelector('[data-reaction-picker]') || pickerAnchor.current)?.getBoundingClientRect();
    if (!origin && !bounds) return;
    const reaction = { id: ++sequence.current, identity, emoji, origin: origin || { x: bounds!.left + bounds!.width / 2, y: bounds!.top + bounds!.height / 2 }, expiresAt: Date.now() + 3200 };
    setActive((current) => [...current.filter((item) => item.identity !== identity).slice(-7), reaction]);
  }, []);
  const receive = useCallback((message: { payload: Uint8Array; from?: { identity: string; name?: string } }) => {
    if (!message.from || message.payload.byteLength > 64) return;
    const emoji = new TextDecoder().decode(message.payload);
    if (reactions.some((reaction) => reaction.emoji === emoji)) add(message.from.identity, emoji);
  }, [add]);
  const { send, isSending } = useDataChannel('ilm.meeting.reaction', receive);
  useEffect(() => {
    if (!active.length) return;
    const timer = window.setTimeout(() => setActive((current) => current.filter((item) => item.expiresAt > Date.now())), Math.max(0, Math.min(...active.map((item) => item.expiresAt)) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [active]);

  const publish = async (emoji: string, origin: ReactionOrigin) => {
    if (!connected || !reactions.some((reaction) => reaction.emoji === emoji)) return;
    add(localParticipant.identity, emoji, origin);
    await send(new TextEncoder().encode(emoji), { reliable: true });
  };
  return { active: connected ? active : [], publish, pickerAnchor, disabled: !connected || isSending };
}

export function MeetingReactionEffects({ active }: { active: Reaction[] }) {
  if (!active.length) return null;
  return createPortal(<div className={styles.reactionEffects} aria-label="Meeting reactions" role="status" aria-live="polite">
    {active.map((reaction) => <div key={reaction.id} className={styles.reactionBurst} style={{ left: reaction.origin.x, top: reaction.origin.y }}>
      <span className="sr-only">{reaction.emoji} reaction</span>
      <div aria-hidden="true" className={styles.reactionParticles}>
        <span className={styles.reactionMain}>{reaction.emoji}</span>
        {[-2, -1, 1, 2].map((offset, particle) => <span key={offset} className={styles.reactionParticle} style={{ '--reaction-drift': `${offset * 36}px`, animationDelay: `${particle * 90}ms` } as React.CSSProperties}>{reaction.emoji}</span>)}
      </div>
    </div>)}
  </div>, document.body);
}

export function MeetingReactions({ publish, disabled, pickerAnchor }: Pick<ReturnType<typeof useMeetingReactions>, 'publish' | 'disabled' | 'pickerAnchor'>) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const root = pickerAnchor;
  const trigger = useRef<HTMLButtonElement>(null);
  const sending = useRef(false);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[data-reaction]')?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, root]);

  return (
    <div ref={root} className="relative" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }} onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={trigger} type="button" aria-label="Reactions" aria-expanded={open} aria-controls="meeting-reactions" onClick={() => { setError(''); setOpen(!open); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><Smile className="h-5 w-5" /></button>
      <div data-reaction-picker id="meeting-reactions" role="group" aria-label="Send a reaction" aria-hidden={!open} inert={!open} className={`absolute bottom-full right-0 mb-3 w-56 rounded-xl border border-white/20 bg-[#0a130f] p-3 shadow-xl ${open ? 'visible' : 'invisible pointer-events-none'}`}>
        <p className="mb-2 text-xs text-white/80">Send a reaction</p>
        <div className="grid grid-cols-3 gap-2">{reactions.map(({ emoji, label }) => <button data-reaction key={label} type="button" aria-label={label} title={label} disabled={disabled} onClick={async (event) => {
          if (sending.current) return;
          sending.current = true;
          setError('');
          const bounds = event.currentTarget.getBoundingClientRect();
          try { await publish(emoji, { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }); setOpen(false); trigger.current?.focus(); } catch { setError('Reaction could not be sent. Try again.'); } finally { sending.current = false; }
        }} className="flex h-11 items-center justify-center rounded-lg text-2xl hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:opacity-50"><span aria-hidden="true">{emoji}</span></button>)}</div>
        {disabled && <p className="mt-2 text-xs text-white/80">Reactions need a connection.</p>}
        {error && <p role="alert" className="mt-2 text-xs text-rose-200">{error}</p>}
      </div>
    </div>
  );
}
