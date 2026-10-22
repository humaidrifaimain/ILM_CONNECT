'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CourseRequest } from '@/lib/course-requests';

export function LecturerCourseRequests() {
  const client = useQueryClient();
  const requests = useQuery<CourseRequest[]>({
    queryKey: ['lecturerCourseRequests'],
    queryFn: () => apiFetch('/curriculum/requests'),
    refetchInterval: 15000,
  });
  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACCEPTED' | 'DECLINED' }) =>
      apiFetch(`/curriculum/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['lecturerCourseRequests'] }),
        client.invalidateQueries({ queryKey: ['lecturerStudentsProgress'] }),
      ]);
    },
  });
  const pending = requests.data?.filter((request) => request.status === 'PENDING') || [];
  return (
    <section
      className="space-y-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"
      aria-labelledby="course-requests"
    >
      <h2 id="course-requests" className="text-lg font-semibold">
        Course requests
      </h2>
      {requests.isLoading ? (
        <p role="status">Loading requests…</p>
      ) : requests.isError ? (
        <div>
          <p role="alert">Unable to load course requests.</p>
          <button
            onClick={() => void requests.refetch()}
            className="mt-2 rounded-lg border px-4 py-2"
          >
            Retry
          </button>
        </div>
      ) : pending.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">No pending course requests.</p>
      ) : (
        pending.map((request) => (
          <article
            key={request.id}
            className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h3 className="font-semibold">{request.learningPath.title}</h3>
              <Link className="text-sm underline" href={`/lecturer/students/${request.studentId}`}>
                {request.student.fullName}
              </Link>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Requested {new Date(request.createdAt).toLocaleDateString()}. Acceptance assigns the
                course without marking lessons complete.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/lecturer/courses/${request.learningPathId}`}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Review course
              </Link>
              <button
                disabled={review.isPending}
                onClick={() => review.mutate({ id: request.id, status: 'ACCEPTED' })}
                className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm text-[hsl(var(--primary-foreground))] disabled:opacity-50"
              >
                Accept request
              </button>
              <button
                disabled={review.isPending}
                onClick={() => review.mutate({ id: request.id, status: 'DECLINED' })}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </article>
        ))
      )}
      {review.isError && (
        <p role="alert" className="text-sm text-red-700">
          {review.error.message}
        </p>
      )}
      {review.isSuccess && (
        <p role="status" className="text-sm">
          {review.variables.status === 'ACCEPTED'
            ? 'Course assigned. The student has been notified.'
            : 'Request declined. The student has been notified.'}
        </p>
      )}
    </section>
  );
}
