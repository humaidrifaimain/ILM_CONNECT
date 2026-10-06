import { DashboardShell } from '@/components/layout/dashboard-shell';
import { SubscriptionGate } from '@/components/student/subscription-gate';
import MessageFAB from '@/components/chat/message-fab';
import { AvailabilitySettings } from '@/components/student/availability-settings';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <SubscriptionGate><DashboardShell floatingAction={<div className="hidden lg:block"><MessageFAB /></div>}><AvailabilitySettings prompt />{children}</DashboardShell></SubscriptionGate>;
}
