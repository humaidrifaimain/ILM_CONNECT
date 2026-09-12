'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      // 1. Register the user
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: cleanEmail,
          password,
          role: 'STUDENT',
          fullName: `${firstName} ${lastName}`.trim(),
          phone: '000000000', // Mock phone for now
          country: 'Unknown',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      // 2. Log them in immediately after successful registration
      const loginRes = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      login(loginRes.user, loginRes.token);
      router.push(`/student/dashboard`);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="w-full max-w-md mx-auto">
          <Link href="/" className="flex items-center gap-2.5 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)]">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight">IlmConnect</span>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Create your account</h1>
          <p className="text-[hsl(var(--muted-foreground))] mb-8">Start your Islamic education journey today</p>

          {error && (
            <div className="p-3.5 mb-5 rounded-xl bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">First name</label>
                <input required type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Aisha" className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Last name</label>
                <input required type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Khan" className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email address</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" minLength={6} className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] pr-11" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <label className="flex items-start gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <input required type="checkbox" className="h-4 w-4 rounded mt-0.5" />
              <span>I agree to the <Link href="#" className="text-[hsl(var(--primary))] underline">Terms of Service</Link> and <Link href="#" className="text-[hsl(var(--primary))] underline">Privacy Policy</Link></span>
            </label>
            <button disabled={isLoading} type="submit" className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg transition-all disabled:opacity-50">
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-[hsl(var(--primary))] font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="hidden md:block w-1/2 relative">
        <Image src="/images/signin-side.png" alt="Islamic architecture and Quran" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-12 left-8 right-8 text-white">
          <p className="text-2xl font-bold leading-snug">&ldquo;The ink of the scholar is more sacred than the blood of the martyr&rdquo;</p>
          <p className="text-sm text-white/70 mt-2">— Prophet Muhammad ﷺ</p>
        </div>
      </div>
    </div>
  );
}
