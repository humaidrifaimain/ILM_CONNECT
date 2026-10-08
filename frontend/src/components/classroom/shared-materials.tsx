'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, downloadMaterial } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/components/ui/toast';
import { studentUi } from '@/components/student/student-dashboard-ui';
interface Material { id: string; title: string; fileSize: number; session?: { studentId: string; startsAt: string; lesson?: { module: { learningPathId: string } } }; }
interface Session { id: string; startsAt: string; student?: { fullName: string }; lesson?: { module?: { learningPathId: string } }; }
export function SharedMaterials({ courseId }: { courseId: string }) {
  const { user } = useAuth(); const lecturer = user?.role === 'LECTURER'; const client = useQueryClient();
  const { data: materials = [], isPending, isError } = useQuery<Material[]>({ queryKey: ['sharedMaterials'], queryFn: () => apiFetch('/materials') });
  const { data: sessions = [] } = useQuery<Session[]>({ queryKey: ['lecturerSessions'], queryFn: () => apiFetch('/bookings/lecturer'), enabled: lecturer });
  const upload = useMutation({ mutationFn: (form: FormData) => apiFetch('/materials/upload', { method: 'POST', body: form }), onSuccess: () => { client.invalidateQueries({ queryKey: ['sharedMaterials'] }); toast.success('Material shared'); }, onError: error => toast.error('Upload failed', error.message) });
  // A file belongs to the course of its session's lesson. Files attached to sessions
  // without a lesson stay visible, with their session date, rather than disappear.
  const visible = materials.filter(file => !file.session?.lesson || file.session.lesson.module.learningPathId === courseId);
  const availableSessions = sessions.filter(session => !session.lesson?.module || session.lesson.module.learningPathId === courseId);
  return <section className="rounded-xl border border-[#d6e0db] bg-white p-5"><h2 className="font-semibold">Shared files</h2>{lecturer && <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={event => { event.preventDefault(); upload.mutate(new FormData(event.currentTarget)); }}><label className="text-sm">Title<input name="title" required maxLength={200} className={`${studentUi.field} mt-1`} /></label><label className="text-sm">Share with a session<select name="sessionId" required className={`${studentUi.field} mt-1`}><option value="">Choose a session</option>{availableSessions.map(session => <option key={session.id} value={session.id}>{session.student?.fullName || 'Student'} · {new Date(session.startsAt).toLocaleString()}</option>)}</select></label><label className="text-sm">PDF or image · up to 10 MB<input name="file" type="file" required accept="application/pdf,image/png,image/jpeg" className="mt-1 block w-full text-sm" /></label><div className="flex items-end"><button disabled={upload.isPending || availableSessions.length === 0} className={studentUi.primaryButton}>{upload.isPending ? 'Uploading…' : 'Upload & share'}</button></div></form>}
    {isPending ? <p role="status" className="mt-4 text-sm">Loading files…</p> : isError ? <p role="alert" className="mt-4">Unable to load shared files.</p> : visible.length === 0 ? <p className="mt-4 text-sm text-[#56635c]">No files shared yet.</p> : <ul className="mt-4 divide-y divide-[#d6e0db]">{visible.map(file => <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{file.title}</p><p className="text-xs text-[#56635c]">{Math.ceil(file.fileSize / 1024)} KB{file.session ? ` · Session ${new Date(file.session.startsAt).toLocaleDateString()}` : ''}</p></div><button className={studentUi.secondaryButton} onClick={async () => { try { await downloadMaterial(file.id, file.title); } catch (error) { toast.error('Download failed', error instanceof Error ? error.message : 'Try again'); } }}>Download</button></li>)}</ul>}
  </section>;
}
