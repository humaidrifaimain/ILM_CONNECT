'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat, useConnectionState } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';

type ChatState = ReturnType<typeof useChat>;

export function MeetingChat({ chatMessages, send, isSending }: ChatState) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const sending = useRef(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const connected = useConnectionState() === ConnectionState.Connected;

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ block: 'end' });
  }, [chatMessages]);

  const submit = async () => {
    const message = draft.trim();
    if (!message || sending.current || isSending || !connected) return;
    sending.current = true;
    setError('');
    try {
      await send(message);
      setDraft('');
    } catch {
      setError('Message could not be sent. Try again.');
    } finally {
      sending.current = false;
      input.current?.focus();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col select-text">
      <div role="log" aria-label="Meeting messages" aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {chatMessages.length === 0 && <p className="text-sm leading-6 text-white/75">No messages yet. Send a message to everyone in this meeting.</p>}
        {chatMessages.map((message) => (
          <div key={message.id} className="min-w-0">
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 break-words font-semibold text-emerald-200">{message.from?.isLocal ? 'You' : message.from?.name || message.from?.identity || 'Participant'}</span>
              <time dateTime={new Date(message.timestamp).toISOString()} className="shrink-0 text-white/70">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white [overflow-wrap:anywhere]">{message.message}</p>
          </div>
        ))}
        <div ref={messagesEnd} />
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="shrink-0 space-y-3 border-t border-white/10 p-4">
        <p className="text-xs leading-5 text-white/75">To everyone. Messages are available during this connection only.</p>
        <label htmlFor="meeting-message" className="sr-only">Message everyone</label>
        <textarea ref={input} id="meeting-message" value={draft} disabled={isSending} maxLength={2000} rows={3} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); }
        }} placeholder="Write a message" className="w-full resize-none rounded-lg border border-white/25 bg-black/20 p-3 text-sm text-white placeholder:text-white/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300" />
        {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
        {!connected && <p role="status" className="text-sm text-white/80">Chat will be available when connected.</p>}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-white/70">Shift + Enter for a new line</span>
          <button type="submit" disabled={!connected || isSending || !draft.trim()} className="min-h-11 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">{isSending ? 'Sending…' : 'Send'}</button>
        </div>
      </form>
    </div>
  );
}
