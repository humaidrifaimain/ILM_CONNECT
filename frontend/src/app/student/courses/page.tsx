'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { StudentCard, StudentProgressBars, studentUi } from '@/components/student/student-dashboard-ui';
interface CourseProfile { assignedLecturer?: { fullName: string }; progress?: { progressPercentage: number; currentLearningPath?: { id: string; title: string } }; }
export default function MyCoursesPage() {
  const { data: profile, isLoading, isError } = useQuery<CourseProfile>({ queryKey: ['studentProfile'], queryFn: () => apiFetch('/profile/student') });
  const course = profile?.progress?.currentLearningPath;
  const progress = Math.max(0, Math.min(100, profile?.progress?.progressPercentage ?? 0));
  return <div className={studentUi.page}>
    {!course || isLoading || isError ? <StudentCard className="p-5"><p className="text-sm text-[#56635c]">{isLoading ? 'Loading courses…' : isError ? 'Unable to load your courses.' : 'No learning path assigned yet. Contact your lecturer to get started.'}</p></StudentCard> : <StudentCard className="p-5">
      <h2 className="text-lg font-semibold">{course.title}</h2>
      <p className="mt-1 text-sm text-[#56635c]">{profile?.assignedLecturer ? `Instructor: ${profile.assignedLecturer.fullName}` : 'No lecturer assigned yet'}</p>
      <div className="mt-5"><p className="mb-2 text-sm">Course progress: {progress}%</p><StudentProgressBars value={progress} /></div>
      <div className="mt-5 flex flex-wrap gap-3"><Link href={`/student/courses/${course.id}/materials`} className={studentUi.primaryButton}>Materials</Link><Link href={`/student/courses/${course.id}/sessions/book`} className={studentUi.secondaryButton}>Book session</Link></div>
    </StudentCard>}
  </div>;
}
