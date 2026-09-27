import type { ReactNode } from 'react';
import Image from 'next/image';
import Logo from '@/components/ui/logo';

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  quote: string;
  attribution: string;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  quote,
  attribution,
}: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-[#f7faf8] text-stone-950">
      <div className="grid min-h-dvh w-full lg:grid-cols-[1fr_1.06fr]">
        <section
          className="relative flex overflow-hidden border-t-[6px] border-[#095F46] bg-[#f7faf8] px-6 py-7 sm:border-t-0 sm:px-12 sm:py-8 sm:pl-24 lg:px-14 lg:pl-28 xl:px-20 xl:pl-32"
          aria-labelledby="auth-title"
        >
          <div className="pattern-islamic pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />

          <div
            className="absolute inset-y-0 left-0 hidden w-14 flex-col items-center justify-between bg-[#095F46] py-8 text-[#10BF8D] sm:flex"
            aria-hidden="true"
          >
            <svg viewBox="0 0 28 28" className="h-7 w-7" fill="none">
              <path d="M14 2 18 10 26 14 18 18 14 26 10 18 2 14 10 10 14 2Z" stroke="currentColor" strokeWidth="1" />
              <path d="m14 7 2.5 4.5L21 14l-4.5 2.5L14 21l-2.5-4.5L7 14l4.5-2.5L14 7Z" stroke="currentColor" strokeWidth="1" />
            </svg>
            <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold tracking-[0.24em]">
              ILMBIT · ONLINE ISLAMIC EDUCATION
            </span>
            <span className="h-10 w-px bg-[#10BF8D]/60" />
          </div>

          <div className="relative mx-auto flex w-full max-w-[29rem] flex-col">
            <div className="flex items-center gap-5 pb-5">
              <Logo size="md" />
              <span className="h-px flex-1 bg-[#095F46]/15" aria-hidden="true" />
            </div>

            <div className="my-auto py-10 sm:py-12">
              <header className="max-w-md">
                <div className="mb-5 flex items-center gap-3" aria-hidden="true">
                  <span className="h-px w-10 bg-[#0B8663]" />
                  <span className="h-2 w-2 rotate-45 border border-[#10BF8D]" />
                  <span className="h-px w-4 bg-[#0B8663]" />
                </div>
                <h1
                  id="auth-title"
                  className="font-display text-[2rem] font-bold leading-[1.12] tracking-[-0.035em] text-stone-950 sm:text-[2.45rem]"
                >
                  {title}
                </h1>
                <p className="mt-3 max-w-sm text-[15px] leading-6 text-stone-600">
                  {description}
                </p>
              </header>

              <div className="mt-7">{children}</div>

              <div className="mt-6 flex items-center gap-4 text-sm text-stone-600">
                <span className="h-px flex-1 bg-[#095F46]/15" aria-hidden="true" />
                <div>{footer}</div>
                <span className="h-px w-8 bg-[#095F46]/15" aria-hidden="true" />
              </div>
            </div>

            <p className="text-xs leading-5 text-stone-500">
              Structured, one-to-one Islamic education.
            </p>
          </div>
        </section>

        <aside className="relative hidden min-h-dvh overflow-hidden bg-stone-950 lg:block">
          <Image
            src="/images/signin-side.png"
            alt="Islamic learning environment"
            fill
            priority
            sizes="53vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/50 to-stone-950/20" />
          <div className="absolute inset-x-10 bottom-16 text-center text-white">
            <blockquote className="mx-auto max-w-2xl text-4xl font-bold leading-tight tracking-[-0.03em] drop-shadow-[0_4px_18px_rgba(0,0,0,0.65)]">
              &ldquo;{quote}&rdquo;
            </blockquote>
            <p className="mt-5 text-lg font-semibold text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.65)]">
              {attribution}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
