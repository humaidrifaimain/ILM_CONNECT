import DashboardSidebar from '@/components/layout/dashboard-sidebar';
import { DashboardTopbar } from '@/components/layout/dashboard-nav';
import MessageFAB from '@/components/chat/message-fab';

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopbar />
        <div className="flex-1 p-4 lg:p-6">
          {children}
        </div>
      </div>
      <MessageFAB />
    </div>
  );
}

