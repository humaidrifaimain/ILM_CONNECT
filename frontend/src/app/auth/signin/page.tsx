'use client';

import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const inputClassName =
  'h-12 w-full rounded-[var(--radius-control)] border border-stone-300 bg-white px-4 text-[15px] text-stone-950 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-stone-400 hover:border-stone-400 focus:border-[#095F46] focus:ring-2 focus:ring-[#095F46]/20';

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      login(data.user, data.token);
      const rawRole = (data.user?.role || '').toLowerCase();
      const routeRole = rawRole === 'super_admin' ? 'admin' : rawRole;
      router.push(`/${routeRole}/dashboard`);
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to continue your learning with Ilmbit."
      quote="Seek knowledge from the cradle to the grave"
      attribution="— Prophet Muhammad ﷺ"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="font-bold text-[#095F46] underline-offset-4 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      {error ? (
        <div
          role="alert"
          className="mb-5 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-[18px]">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-bold text-stone-800">
            Email address
          </label>
          <input
            id="email"
            required
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email address"
            className={inputClassName}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-4">
            <label htmlFor="password" className="text-[13px] font-bold text-stone-800">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[13px] font-bold text-[#095F46] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095F46]/30"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              required
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className={`${inputClassName} pr-14`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="brand-icon-button absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 flex-none text-stone-400 hover:bg-emerald-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095F46]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <button
          disabled={isLoading}
          type="submit"
          className="brand-button brand-button-primary mt-2 h-12 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095F46] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7faf8]"
        >
          {isLoading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  );
}
