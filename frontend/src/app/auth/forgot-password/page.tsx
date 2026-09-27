'use client';

import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import Logo from '@/components/ui/logo';

export default function ForgotPasswordPage() {
  return (
    <div className="pattern-islamic flex min-h-dvh items-center justify-center bg-[#f7faf8] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-[-0.025em]">Reset your password</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Enter your email and we&apos;ll send you a reset link</p>
        </div>
        <div className="rounded-[var(--radius-control)] border border-stone-200 bg-white p-6 shadow-[0_12px_35px_rgba(9,95,70,0.08)] sm:p-8">
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <input id="email" type="email" placeholder="you@example.com" className="h-12 w-full rounded-[var(--radius-control)] border border-stone-300 bg-white pl-10 pr-4 text-sm outline-none transition-colors hover:border-stone-400 focus:border-[#095F46] focus:ring-2 focus:ring-[#095F46]/20" />
              </div>
            </div>
            <button type="submit" className="brand-button brand-button-primary h-12 w-full">
              Send reset link
            </button>
          </form>
        </div>
        <Link href="/auth/signin" className="flex items-center justify-center gap-1 text-sm text-[hsl(var(--muted-foreground))] mt-6 hover:text-[hsl(var(--primary))]">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
