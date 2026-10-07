import { DashboardShell } from '@/components/layout/dashboard-shell';
import MessageFAB from '@/components/chat/message-fab';
import { RequiredLessonFeedback } from '@/components/lecturer/required-lesson-feedback';

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
  return <RequiredLessonFeedback><DashboardShell floatingAction={<MessageFAB />}>{children}</DashboardShell></RequiredLessonFeedback>;
}
