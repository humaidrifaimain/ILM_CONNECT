'use client';

import { useState } from 'react';
import { useDialogAccessibility } from '@/lib/use-dialog-accessibility';
import { STUDENT_TIME_WINDOWS } from '@/lib/student-availability';

export function AvailabilityDialog({ open, initialHours = [], busy, error, onClose, onSave }: {
  open: boolean;
  initialHours?: number[];
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (hours: number[]) => void;
}) {
  const [hours, setHours] = useState(initialHours);
  const ref = useDialogAccessibility(open, () => { if (!busy) onClose(); });
  if (!open) return null;

  return <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/45 p-4" onClick={() => { if (!busy) onClose(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="student-availability-title" aria-describedby="student-availability-description" tabIndex={-1}
      className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-xl sm:p-6" onClick={event => event.stopPropagation()}>
      <h2 id="student-availability-title" className="text-xl font-bold">When can you attend lessons?</h2>
      <p id="student-availability-description" className="mt-2 text-sm leading-6 text-stone-600">Choose the windows that work for you. We’ll use these to assign a lecturer. Your lesson time will be confirmed separately.</p>
      <p className="mt-4 text-sm font-semibold">All times are Sri Lanka time (Asia/Colombo, UTC+5:30).</p>
      <form onSubmit={event => { event.preventDefault(); if (hours.length) onSave(hours); }}>
        <fieldset disabled={busy} className="mt-4 space-y-2">
          <legend className="sr-only">Available time windows</legend>
          {STUDENT_TIME_WINDOWS.map(window => {
            const checked = window.hours.every(hour => hours.includes(hour));
            return <label key={window.id} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border p-3 ${checked ? 'border-[#095F46] bg-[#f0f7f3]' : 'border-stone-300'}`}>
              <input type="checkbox" checked={checked} className="h-5 w-5 shrink-0 accent-[#095F46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46]"
                onChange={() => setHours(current => checked ? current.filter(hour => !window.hours.includes(hour)) : [...new Set([...current, ...window.hours])].sort((a, b) => a - b))} />
              <span><span className="block text-sm font-semibold">{window.label}</span><span className="block text-sm text-stone-600">{window.time}</span></span>
            </label>;
          })}
        </fieldset>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <p className="mt-3 text-sm text-stone-600">Select one or more windows.</p>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-lg border border-stone-300 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46]">Back</button>
          <button type="submit" disabled={busy || !hours.length} className="min-h-11 rounded-lg bg-[#095F46] px-4 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#095F46]">{busy ? 'Saving...' : 'Confirm availability'}</button>
        </div>
      </form>
    </div>
  </div>;
}
