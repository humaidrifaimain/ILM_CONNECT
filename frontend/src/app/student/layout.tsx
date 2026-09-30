import { DashboardShell } from '@/components/layout/dashboard-shell';
import { SubscriptionGate } from '@/components/student/subscription-gate';
import MessageFAB from '@/components/chat/message-fab';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <SubscriptionGate><DashboardShell floatingAction={<MessageFAB />}>{children}</DashboardShell></SubscriptionGate>;
}
