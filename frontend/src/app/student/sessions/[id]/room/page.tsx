import { redirect } from 'next/navigation';

export default async function StudentSessionRoomRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/student/courses/beginner-qaida/sessions/${id}/room`);
}
