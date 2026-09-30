import type { ComponentType, ReactNode } from 'react';

type IconType = ComponentType<{ className?: string }>;

export const studentUi = {
  page: 'w-full space-y-5 animate-fade-in',
  card: 'rounded-xl border border-[#d6e0db] bg-white shadow-sm',
  mutedCard: 'rounded-xl border border-[#d6e0db] bg-[#f5f7f6]',
  panel: 'rounded-xl border border-[#d6e0db] bg-white p-4 shadow-sm',
  softPanel: 'rounded-xl border border-[#d6e0db] bg-[#f5f7f6] p-4',
  field:
    'w-full rounded-xl border border-[#d6e0db] bg-white px-3.5 py-2.5 text-sm text-[#202823] outline-none transition focus:border-[#095F46] focus:ring-2 focus:ring-[#095F46]/15',
  primaryButton:
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#095F46] px-4 text-xs font-bold text-white transition-colors hover:bg-[#074c38] disabled:opacity-50',
  secondaryButton:
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#b9cac2] bg-white px-4 text-xs font-bold text-[#095F46] transition-colors hover:bg-[#e8f0ed]',
};

export function StudentPageHeader({
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  if (!action) return null;

  return <section className="flex justify-end px-1">{action}</section>;
}

export function StudentCard({
  children,
  className = '',
  muted = false,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return <article className={`${muted ? studentUi.softPanel : studentUi.panel} ${className}`}>{children}</article>;
}

export function StudentIconTile({ icon: Icon, tone = 'primary' }: { icon: IconType; tone?: 'primary' | 'accent' | 'neutral' }) {
  const toneClass =
    tone === 'accent'
      ? 'border-[#10BF8D]/30 bg-[#10BF8D]/10 text-[#095F46]'
      : tone === 'neutral'
        ? 'border-[#d6e0db] bg-[#f5f7f6] text-[#56635c]'
        : 'border-[#c5d4cd] bg-[#e8f0ed] text-[#095F46]';

  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${toneClass}`}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function StudentStatusPill({
  children,
  tone = 'primary',
}: {
  children: ReactNode;
  tone?: 'primary' | 'accent' | 'neutral' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'accent'
      ? 'bg-[#10BF8D]/12 text-[#095F46]'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-700'
        : tone === 'danger'
          ? 'bg-rose-100 text-rose-700'
          : tone === 'neutral'
            ? 'bg-[#f0f3f1] text-[#56635c]'
            : 'bg-[#e8f0ed] text-[#095F46]';

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass}`}>{children}</span>;
}

export function StudentProgressBars({ value, bars = 34 }: { value: number; bars?: number }) {
  const activeBars = Math.round(Math.max(0, Math.min(100, value)) / (100 / bars));

  return (
    <div className="flex h-5 items-end gap-[3px]" aria-hidden="true">
      {Array.from({ length: bars }).map((_, index) => (
        <span
          key={index}
          className={`h-full w-full rounded-full ${index < activeBars ? 'bg-[#095F46]' : 'bg-[#e6ece8]'}`}
        />
      ))}
    </div>
  );
}
