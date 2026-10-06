import DashboardSidebar, { DashboardMobileNav } from './dashboard-sidebar';
import { DashboardTopbar } from './dashboard-nav';

export function DashboardShell({ children, floatingAction }: {
  children: React.ReactNode;
  floatingAction?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f5f7f6] text-stone-900">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar />
        <DashboardMobileNav />
        <main className="min-w-0 w-full flex-1 p-3 sm:p-4 lg:p-4">{children}</main>
      </div>
      {floatingAction}
    </div>
  );
}
