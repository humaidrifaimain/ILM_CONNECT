'use client';

export function DashboardLoadingOverlay() {
  return <div className="fixed inset-0 z-[200] bg-[#f5f7f6]" role="status" aria-label="Loading dashboard">
    <div aria-hidden="true" className="h-full blur-sm">
      <div className="h-20 border-b border-[#d6e0db] bg-white" />
      <div className="m-8 grid grid-cols-3 gap-5">{[0, 1, 2].map(item => <div key={item} className="h-36 rounded-xl bg-white" />)}</div>
      <div className="mx-8 h-72 rounded-xl bg-white" />
    </div>
    <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-md">
      <div aria-hidden="true" className="h-14 w-14 animate-spin rounded-full border-[3px] border-[#095F46]/15 border-t-[#095F46]" />
    </div>
  </div>;
}
