import type { ComponentType, ReactNode } from 'react';

export function DashboardStatCard({ label, value, detail, icon: Icon }: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <article className="rounded-xl border border-[#d6e0db] bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#202823]">{label}</h2>
          <div className="mt-2 text-2xl font-bold leading-none text-[#0b3027]">{value}</div>
          {detail && <p className="mt-2 text-xs font-semibold text-[#56635c]">{detail}</p>}
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#c5d4cd] bg-[#e8f0ed] text-[#095F46]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </article>
  );
}
