'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { studentUi } from '@/components/student/student-dashboard-ui';
import { toast } from '@/components/ui/toast';
export function RecordAssessment({ studentId, enabled }: { studentId: string; enabled: boolean }) {
  const client = useQueryClient();
  const save = useMutation({ mutationFn: (data: { title: string; score: number; feedback: string }) => apiFetch('/progress/assessments', { method: 'POST', body: JSON.stringify({ ...data, studentId }) }), onSuccess: () => { client.invalidateQueries(); toast.success('Assessment recorded', 'The student can now view their score and feedback.'); }, onError: error => toast.error('Unable to record assessment', error.message) });
  return <details className="my-4 rounded-xl border border-[#d6e0db] bg-white p-4"><summary className="cursor-pointer text-sm font-semibold text-[#095F46]">Record assessment result</summary>{!enabled ? <p className="mt-3 text-sm text-[#56635c]">Grant course access before recording an assessment.</p> : <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); save.mutate({ title: String(form.get('title')), score: Number(form.get('score')), feedback: String(form.get('feedback')) }); }}><label className="text-sm">Assessment title<input name="title" required maxLength={200} className={`${studentUi.field} mt-1`} /></label><label className="text-sm">Score out of 100<input name="score" type="number" required min="0" max="100" step="0.01" className={`${studentUi.field} mt-1`} /></label><label className="text-sm sm:col-span-2">Feedback<textarea name="feedback" maxLength={2000} rows={3} className={`${studentUi.field} mt-1`} /></label><button disabled={save.isPending} className={`${studentUi.primaryButton} justify-self-start`}>{save.isPending ? 'Saving…' : 'Save result'}</button></form>}</details>;
}
