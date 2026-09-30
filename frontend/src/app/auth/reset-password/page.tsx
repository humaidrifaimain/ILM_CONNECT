'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/ui/logo';
import { apiFetch } from '@/lib/api';
export default function ResetPasswordPage() { return <Suspense fallback={<p role="status">Loading…</p>}><ResetPasswordForm /></Suspense>; }
function ResetPasswordForm() {
  const token = useSearchParams().get('token');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  return <main className="flex min-h-dvh items-center justify-center bg-[#f7faf8] px-4 py-12"><div className="w-full max-w-md"><div className="mb-6 flex justify-center"><Logo size="lg" /></div><h1 className="mb-6 text-center text-2xl font-bold">Choose a new password</h1><form className="space-y-4 rounded-xl border border-stone-200 bg-white p-6" onSubmit={async event => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const password = String(data.get('password')); setError('');
    if (password !== data.get('confirm')) { setError('Passwords do not match.'); return; }
    setPending(true); try { const result = await apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }), skipRedirect: true }); setMessage(result.message); } catch (error) { setError(error instanceof Error ? error.message : 'Unable to reset your password'); } finally { setPending(false); }
  }}>{!token ? <p role="alert">This reset link is incomplete. Request a new link from Forgot Password.</p> : message ? <p role="status" className="text-[#095F46]">{message}</p> : <><label className="block text-sm font-medium">New password<input type="password" name="password" required minLength={8} maxLength={128} autoComplete="new-password" className="mt-2 h-12 w-full rounded-lg border border-stone-300 px-3" /></label><label className="block text-sm font-medium">Confirm password<input type="password" name="confirm" required minLength={8} maxLength={128} autoComplete="new-password" className="mt-2 h-12 w-full rounded-lg border border-stone-300 px-3" /></label><p className="text-xs text-stone-500">Use at least 8 characters.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={pending} className="brand-button brand-button-primary h-12 w-full">{pending ? 'Updating…' : 'Update password'}</button></>}<Link href="/auth/signin" className="block text-center text-sm text-[#095F46] underline">Back to sign in</Link></form></div></main>;
}
