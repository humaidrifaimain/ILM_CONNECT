'use client';

import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { STUDENT_TIME_WINDOWS } from '@/lib/student-availability';
import { COUNTRY_CALLING_CODES } from '@/lib/country-calling-codes';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const inputClassName =
  'h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 text-base sm:text-[15px] text-stone-950 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-stone-500 hover:border-stone-400 focus:border-[#095F46] focus:ring-2 focus:ring-[#095F46]/20';

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [countryIso, setCountryIso] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [preferredHours, setPreferredHours] = useState<number[]>([]);
  const [availabilityError, setAvailabilityError] = useState('');
  const router = useRouter();
  const { login } = useAuth();
  const selectedCountry = COUNTRY_CALLING_CODES.find((country) => country.iso2 === countryIso);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;
    setError('');
    const phone = whatsappNumber.trim().replace(/[\s()-]/g, '');
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      setError('Enter a valid WhatsApp number with its country code.');
      document.getElementById('whatsapp-number')?.focus();
      return;
    }
    if (!selectedCountry) return;
    if (!preferredHours.length) {
      setAvailabilityError('Choose at least one time window.');
      document.getElementById('availability-morning')?.focus();
      return;
    }
    setAvailabilityError('');
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
          gender,
          dateOfBirth,
          phone,
          country: selectedCountry.name,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferredHours,
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
      compact
      title="Create an account"
      description="Learn one-to-one with a dedicated scholar."
      quote="Structured, one-to-one Islamic education."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/auth/signin" className="font-bold text-[#095F46] underline-offset-4 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
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

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="gender" className="mb-1.5 block text-[13px] font-bold text-stone-800">Gender</label>
            <select id="gender" required autoComplete="sex" value={gender} onChange={(event) => setGender(event.target.value)} className={inputClassName}>
              <option value="" disabled>Select gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="date-of-birth" className="mb-1.5 block text-[13px] font-bold text-stone-800">Date of birth</label>
            <input id="date-of-birth" required type="date" autoComplete="bday" min="0001-01-01" max={new Date().toISOString().slice(0, 10)} value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} className={`${inputClassName} min-w-0`} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="country" className="mb-1.5 block text-[13px] font-bold text-stone-800">Country</label>
            <select id="country" required autoComplete="country" value={countryIso} onChange={(event) => setCountryIso(event.target.value)} className={inputClassName}>
              <option value="" disabled>Select country</option>
              {COUNTRY_CALLING_CODES.map((country) => <option key={country.iso2} value={country.iso2}>{country.name}</option>)}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="whatsapp-number" className="mb-1.5 block text-[13px] font-bold text-stone-800">WhatsApp number</label>
            <input id="whatsapp-number" required type="tel" autoComplete="tel" inputMode="tel" maxLength={25} value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} placeholder={`${selectedCountry?.dialCode || '+94'} 77 123 4567`} aria-describedby="whatsapp-hint" className={inputClassName} />
            <p id="whatsapp-hint" className="mt-1 text-xs text-stone-600">Include your country code.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
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

        <div className="min-w-0">
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
              className="brand-icon-button absolute right-0 top-1/2 h-11 w-11 -translate-y-1/2 flex-none text-stone-400 hover:bg-emerald-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095F46]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
        </div>

        <fieldset disabled={isLoading} aria-describedby="availability-timezone availability-hint" className="space-y-2.5 pt-1">
          <legend className="text-[13px] font-bold text-stone-800">When can you learn?</legend>
          <p id="availability-hint" className="text-[13px] leading-5 text-stone-600">Choose your times for lecturer assignment.</p>
          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
            {STUDENT_TIME_WINDOWS.map((window) => {
              const checked = window.hours.every(hour => preferredHours.includes(hour));
              return <label key={window.id} className={`relative flex min-h-11 min-w-0 cursor-pointer flex-col justify-center rounded-lg border p-2.5 transition-colors focus-within:ring-2 focus-within:ring-[#095F46]/25 focus-within:ring-offset-2 ${checked ? 'border-[#095F46] bg-[#edf7f1]' : 'border-stone-300 bg-white hover:border-[#095F46]/60 hover:bg-[#f4f9f6]'}`}>
                <span className="flex min-w-0 items-center justify-between gap-2 pr-6 min-[400px]:block min-[400px]:pr-0"><span className="block text-xs font-bold text-stone-900 min-[400px]:pr-5 sm:text-[13px]">{window.label}</span><span className="block text-xs leading-4 text-stone-600 min-[400px]:mt-1.5">{window.time.replaceAll(':00', '')}</span></span>
                <input id={`availability-${window.id}`} type="checkbox" checked={checked} aria-invalid={!!availabilityError} aria-describedby={availabilityError ? 'availability-error' : undefined}
                  className="absolute right-2.5 top-3 h-4 w-4 accent-[#095F46] sm:right-3"
                  onChange={() => {
                    setAvailabilityError('');
                    setPreferredHours(current => checked ? current.filter(hour => !window.hours.includes(hour)) : [...new Set([...current, ...window.hours])].sort((a, b) => a - b));
                  }} />
              </label>;
            })}
          </div>
          <p id="availability-timezone" className="text-xs leading-5 text-stone-600">Sri Lanka time · Asia/Colombo · UTC+5:30</p>
          {availabilityError && <p id="availability-error" role="alert" className="text-[13px] text-red-700">{availabilityError}</p>}
        </fieldset>

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

        {error && <div role="alert" className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <button
          disabled={isLoading}
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#095F46] px-4 text-sm font-semibold text-white hover:bg-[#074d39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095F46] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7faf8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
