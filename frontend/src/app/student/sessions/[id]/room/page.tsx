import { redirect } from 'next/navigation';

export default function StudentSessionRoomRedirect({ params }: { params: { id: string } }) {
  redirect(`/student/courses/beginner-qaida/sessions/${params.id}/room`);
}
