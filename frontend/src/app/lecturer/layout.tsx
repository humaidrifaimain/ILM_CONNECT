import { DashboardShell } from '@/components/layout/dashboard-shell';
import MessageFAB from '@/components/chat/message-fab';

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell floatingAction={<MessageFAB />}>{children}</DashboardShell>;
}
