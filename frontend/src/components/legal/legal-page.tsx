import Link from 'next/link';
import type { ReactNode } from 'react';

type LegalSection = {
  title: string;
  content: ReactNode;
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  summary: string;
  updatedAt: string;
  sections: LegalSection[];
};

export function LegalPage({
  eyebrow,
  title,
  summary,
  updatedAt,
  sections,
}: LegalPageProps) {
  return (
    <div className="min-h-screen bg-[#f7f8f5] pb-20 pt-28 text-stone-900 sm:pt-32">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#071412] via-[#0c211e] to-[#112f2a] px-6 py-10 text-white shadow-[0_24px_80px_rgba(7,20,18,0.14)] sm:px-10 sm:py-14 lg:px-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-emerald-50/80 sm:text-base">
            {summary}
          </p>
          <p className="mt-6 text-xs font-semibold text-emerald-100/60">
            Last updated: {updatedAt}
          </p>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
          <article className="rounded-[2rem] border border-stone-200/80 bg-white px-6 py-8 shadow-[0_16px_50px_rgba(28,25,23,0.05)] sm:px-10 sm:py-10">
            <div className="space-y-10">
              {sections.map((section, index) => (
                <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-32">
                  <h2 className="text-xl font-black tracking-tight text-stone-950 sm:text-2xl">
                    {index + 1}. {section.title}
                  </h2>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-stone-600 sm:text-[15px]">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <aside className="rounded-3xl border border-emerald-900/10 bg-emerald-50/70 p-5 lg:sticky lg:top-28">
            <h2 className="text-sm font-black text-stone-950">Need help?</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Questions about these terms or your personal information are welcome.
            </p>
            <a
              href="mailto:support@ilmbit.com"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#095F46] px-4 text-center text-sm font-bold text-white transition-colors hover:bg-[#074c38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095F46] focus-visible:ring-offset-2"
            >
              support@ilmbit.com
            </a>
            <Link
              href="/"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-stone-800 transition-colors hover:border-emerald-200 hover:bg-emerald-50"
            >
              Return home
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
