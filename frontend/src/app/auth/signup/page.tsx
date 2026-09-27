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

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
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
      const cleanEmail = email.trim().toLowerCase();
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: cleanEmail,
          password,
          role: 'STUDENT',
          fullName: fullName.trim(),
          phone: '000000000',
          country: 'Unknown',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const loginResponse = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      login(loginResponse.user, loginResponse.token);
      router.push('/student/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create account. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create an account"
      description="Begin your Islamic learning journey with a dedicated scholar."
      quote="The ink of the scholar is more sacred than the blood of the martyr"
      attribution="— Prophet Muhammad ﷺ"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/auth/signin" className="font-bold text-[#095F46] underline-offset-4 hover:underline">
            Log in
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="full-name" className="mb-1.5 block text-[13px] font-bold text-stone-800">
            Full name
          </label>
          <input
            id="full-name"
            required
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Enter your name"
            className={inputClassName}
          />
        </div>

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
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-bold text-stone-800">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              required
              minLength={6}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
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

        <label className="flex items-start gap-2.5 pt-0.5 text-[13px] font-medium leading-5 text-stone-600">
          <input
            required
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded-[2px] border-stone-400 text-[#095F46] focus:ring-[#095F46]"
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" className="font-bold text-stone-950 underline-offset-4 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-bold text-stone-950 underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>

        <button
          disabled={isLoading}
          type="submit"
          className="brand-button brand-button-primary mt-2 h-12 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095F46] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7faf8]"
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
