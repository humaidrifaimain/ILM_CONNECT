'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CoursePath, CourseRequest } from '@/lib/course-requests';
import {
  StudentCard,
  StudentProgressBars,
  studentUi,
} from '@/components/student/student-dashboard-ui';

interface CourseProfile {
  assignedLecturerId?: string;
  assignedLecturer?: { fullName: string };
  progress?: { progressPercentage: number; currentLearningPath?: { id: string; title: string } };
}

export default function MyCoursesPage() {
  const client = useQueryClient();
  const profileQuery = useQuery<CourseProfile>({
    queryKey: ['studentProfile'],
    queryFn: () => apiFetch('/profile/student'),
    refetchInterval: 15000,
  });
  const pathsQuery = useQuery<CoursePath[]>({
    queryKey: ['curriculumPaths'],
    queryFn: () => apiFetch('/curriculum/paths'),
  });
  const requestsQuery = useQuery<CourseRequest[]>({
    queryKey: ['courseRequests'],
    queryFn: () => apiFetch('/curriculum/requests'),
    refetchInterval: 15000,
  });
  const request = useMutation({
    mutationFn: (learningPathId: string) =>
      apiFetch('/curriculum/requests', {
        method: 'POST',
        body: JSON.stringify({ learningPathId }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['courseRequests'] }),
  });
  const profile = profileQuery.data;
  const course = profile?.progress?.currentLearningPath;
  const progress = Math.max(0, Math.min(100, profile?.progress?.progressPercentage ?? 0));
  if (profileQuery.isLoading || pathsQuery.isLoading)
    return (
      <StudentCard>
        <p role="status">Loading courses…</p>
      </StudentCard>
    );
  if (profileQuery.isError || pathsQuery.isError)
    return (
      <StudentCard>
        <p role="alert">Unable to load courses.</p>
        <button
          className={studentUi.secondaryButton}
          onClick={() => {
            void profileQuery.refetch();
            void pathsQuery.refetch();
            void requestsQuery.refetch();
          }}
        >
          Retry
        </button>
      </StudentCard>
    );

  return (
    <div className={studentUi.page}>
      {course && (
        <StudentCard className="p-5">
          <h2 className="text-lg font-semibold">{course.title}</h2>
          <p className="mt-1 text-sm text-[#56635c]">
            Instructor: {profile?.assignedLecturer?.fullName || 'Awaiting lecturer assignment'}
          </p>
          <div className="mt-5">
            <p className="mb-2 text-sm">Course progress: {progress}%</p>
            <StudentProgressBars value={progress} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/student/courses/${course.id}/materials`}
              className={studentUi.primaryButton}
            >
              Materials
            </Link>
            <Link
              href={`/student/courses/${course.id}/sessions/book`}
              className={studentUi.secondaryButton}
            >
              Book session
            </Link>
          </div>
        </StudentCard>
      )}
      <section className="space-y-4" aria-labelledby="available-courses">
        <div>
          <h2 id="available-courses" className="text-lg font-semibold">
            Available courses
          </h2>
          <p className="mt-1 text-sm text-[#56635c]">
            Choose a course and send a request to your lecturer for review.
          </p>
        </div>
        {requestsQuery.isLoading && (
          <p role="status" className="text-sm">
            Loading course requests…
          </p>
        )}
        {requestsQuery.isError && (
          <StudentCard>
            <p role="alert" className="text-sm">
              Course requests are temporarily unavailable. You can still browse courses.
            </p>
            <button
              className={studentUi.secondaryButton}
              onClick={() => void requestsQuery.refetch()}
            >
              Retry requests
            </button>
          </StudentCard>
        )}
        {!profile?.assignedLecturer && (
          <StudentCard>
            <p className="text-sm">
              You can browse courses now.{' '}
              <Link href="/student/support" className="font-semibold underline">
                Contact support
              </Link>{' '}
              to get matched with a lecturer before sending a request.
            </p>
          </StudentCard>
        )}
        {request.isError && (
          <p role="alert" className="text-sm text-red-700">
            {request.error.message}
          </p>
        )}
        {request.isSuccess && (
          <p role="status" className="text-sm text-[#095F46]">
            Request sent. Your lecturer will review it.
          </p>
        )}
        {pathsQuery.data?.length === 0 && (
          <StudentCard>
            <p>No courses are available yet.</p>
          </StudentCard>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {pathsQuery.data?.map((path) => {
            const saved = requestsQuery.data?.find(
              (row) =>
                row.learningPathId === path.id && row.lecturerId === profile?.assignedLecturerId,
            );
            const assigned = course?.id === path.id;
            const pending = saved?.status === 'PENDING';
            return (
              <StudentCard key={path.id} className="flex flex-col p-5">
                <h3 className="text-base font-semibold">{path.title}</h3>
                <p className="mt-2 text-sm text-[#56635c]">{path.description}</p>
                <p className="mt-3 text-sm text-[#56635c]">
                  {path.level} · {path.modules.length} modules ·{' '}
                  {path.modules.reduce((sum, module) => sum + module.lessons.length, 0)} lessons
                </p>
                <div className="mt-4 space-y-2">
                  {saved && (
                    <p className="text-sm" role="status">
                      {pending
                        ? 'Awaiting lecturer review'
                        : saved.status === 'DECLINED'
                          ? 'Your lecturer declined this request. You can request again.'
                          : 'Request accepted'}
                    </p>
                  )}
                  {course && !assigned && (
                    <p className="text-sm text-[#56635c]">
                      Ask your lecturer before changing your assigned course.
                    </p>
                  )}
                  <button
                    className={studentUi.primaryButton}
                    disabled={
                      Boolean(course) ||
                      pending ||
                      !profile?.assignedLecturer ||
                      request.isPending ||
                      requestsQuery.isLoading ||
                      requestsQuery.isError
                    }
                    onClick={() => request.mutate(path.id)}
                  >
                    {assigned
                      ? 'Your current course'
                      : pending
                        ? 'Request pending'
                        : request.isPending && request.variables === path.id
                          ? 'Sending request…'
                          : saved?.status === 'DECLINED'
                            ? 'Request again'
                            : 'Request course'}
                  </button>
                </div>
              </StudentCard>
            );
          })}
        </div>
      </section>
    </div>
  );
}
