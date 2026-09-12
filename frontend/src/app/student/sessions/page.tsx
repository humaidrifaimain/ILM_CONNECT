import { redirect } from 'next/navigation';

export default function StudentSessionsRedirect() {
  redirect('/student/courses/beginner-qaida/sessions');
}
