'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleDemoLogin = async (role: 'student' | 'lecturer' | 'admin' | 'staff') => {
    // Note: Demo access requires these users to actually exist in the DB seeded data!
    let demoEmail = '';
    let demoPass = 'ilmconnect123';

    if (role === 'student') demoEmail = 'student1@ilmconnect.com';
    else if (role === 'lecturer') demoEmail = 'ahmed.raza@ilmconnect.com';
    else if (role === 'admin') demoEmail = 'admin@ilmconnect.com';
    else demoEmail = 'staff@example.com';

    setEmail(demoEmail);
    setPassword(demoPass);
    // Submit normally with these credentials
    try {
      setIsLoading(true);
      setError('');
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: demoEmail, password: demoPass }),
      });
      login(data.user);
      const rawRole = data.user.role.toLowerCase();
      const routeRole = rawRole === 'super_admin' ? 'admin' : rawRole;
      router.push(`/${routeRole}/dashboard`);
    } catch (err: any) {
      setError(err.message || 'Demo login failed. Make sure DB is seeded.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(data.user);
      const rawRole = data.user.role.toLowerCase();
      const routeRole = rawRole === 'super_admin' ? 'admin' : rawRole;
      router.push(`/${routeRole}/dashboard`);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left block — Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)]">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight">IlmConnect</span>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-[hsl(var(--muted-foreground))] mb-8">Sign in to continue your learning journey</p>

          {error && (
            <div className="p-3.5 mb-5 rounded-xl bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email address</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] pr-11 transition-colors" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded" /> Remember me</label>
              <Link href="/auth/forgot-password" className="text-sm text-[hsl(var(--primary))] hover:underline">Forgot password?</Link>
            </div>
            <button disabled={isLoading} type="submit" className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg transition-all disabled:opacity-50">
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Access */}
          <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
            <p className="text-xs text-[hsl(var(--muted-foreground))] text-center mb-3">Quick Demo Access (Requires Seeded DB)</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { role: 'student' as const, label: 'Student', color: 'text-[hsl(var(--primary))]' },
                { role: 'lecturer' as const, label: 'Lecturer', color: 'text-purple-600 dark:text-purple-400' },
                { role: 'staff' as const, label: 'Staff', color: 'text-blue-600 dark:text-blue-400' },
                { role: 'admin' as const, label: 'Admin', color: 'text-amber-600 dark:text-amber-400' },
              ].map((d) => (
                <button disabled={isLoading} type="button" key={d.role} onClick={() => handleDemoLogin(d.role)} className={`py-2 rounded-xl text-xs font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50 ${d.color}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-[hsl(var(--primary))] font-medium hover:underline">Sign up</Link>
          </p>
        </div>
      </div>

      {/* Right block — Image */}
      <div className="hidden md:block w-1/2 relative">
        <Image src="/images/signin-side.png" alt="Islamic architecture and Quran" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-12 left-8 right-8 text-white">
          <p className="text-2xl font-bold leading-snug">&ldquo;Seek knowledge from the cradle to the grave&rdquo;</p>
          <p className="text-sm text-white/70 mt-2">— Prophet Muhammad ﷺ</p>
        </div>
      </div>
    </div>
  );
}
