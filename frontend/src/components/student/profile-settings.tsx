'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/components/ui/toast';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { studentUi } from './student-dashboard-ui';

interface Profile { fullName: string; country?: string; timezone?: string; bio?: string; qualifications?: string; languages?: string[]; specializations?: string[]; payoutMethod?: string; }
export function ProfileSettings({ role }: { role: 'student' | 'lecturer' }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = [`${role}Profile`];
  const { data: profile, isLoading, isError } = useQuery<Profile>({ queryKey, queryFn: () => apiFetch(`/profile/${role}`) });
  const save = useMutation({
    mutationFn: (data: Record<string, string | string[]>) => apiFetch(`/profile/${role}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); toast.success('Profile saved', 'Your profile has been updated.'); },
    onError: error => toast.error('Save failed', error.message),
  });
  if (isLoading) return <LoadingScreen message="Loading profile…" />;
  if (isError || !profile) return <p role="alert">Unable to load your profile. Please refresh to retry.</p>;
  const fields = role === 'student' ? ['fullName', 'country', 'timezone'] : ['fullName', 'bio', 'languages', 'specializations', 'qualifications'];
  const labels: Record<string, string> = { fullName: 'Full name', country: 'Country', timezone: 'Timezone', bio: 'Bio', languages: 'Languages', specializations: 'Specializations', qualifications: 'Qualifications' };
  return <div className="grid w-full gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
    <form key={JSON.stringify(profile)} onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const data: Record<string, string | string[]> = {};
      for (const field of fields) {
        const value = String(form.get(field) || '').trim();
        data[field] = ['languages', 'specializations'].includes(field) ? value.split(',').map(item => item.trim()).filter(Boolean) : value;
      }
      save.mutate(data);
    }} className="rounded-xl border border-[#d6e0db] bg-white p-5">
      <h2 className="font-semibold">Profile</h2>
      <p className="mt-1 text-sm text-[#56635c]">{user?.email}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map(field => {
        const value = profile[field as keyof Profile];
        return <label key={field} className={`text-sm font-medium ${['bio', 'qualifications'].includes(field) ? 'sm:col-span-2' : ''}`}>
          {labels[field]}<input name={field} required={field === 'fullName'} defaultValue={Array.isArray(value) ? value.join(', ') : value || ''} className={`${studentUi.field} mt-1.5`} />
        </label>;
      })}</div>
      <button disabled={save.isPending} className={`${studentUi.primaryButton} mt-5`}>{save.isPending ? 'Saving…' : 'Save changes'}</button>
    </form>
    <div className="space-y-4">
      {role === 'lecturer' && <section className="rounded-xl border border-[#d6e0db] bg-white p-5"><h2 className="font-semibold">Payout method</h2><p className="mt-2 text-sm text-[#56635c]">{profile.payoutMethod || 'No payout method configured'}</p><Link href="/lecturer/support?tab=contact" className="mt-3 inline-block text-sm text-[#095F46] underline">Update payout details through support</Link></section>}
      <section className="rounded-xl border border-[#d6e0db] bg-white p-5"><h2 className="font-semibold">Account security</h2><Link href="/auth/forgot-password" className="mt-3 inline-block text-sm text-[#095F46] underline">Reset your password</Link></section>
    </div>
  </div>;
}
