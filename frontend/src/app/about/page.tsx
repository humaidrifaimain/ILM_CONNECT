'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import { motion, useInView, type Variants } from 'framer-motion';
import CountryPhoneInput from '@/components/country-phone-input';
import {
  formatInternationalPhone,
  getCountryCallingCode,
  type CountryCallingCode,
} from '@/lib/country-calling-codes';

const fadeUp: Variants = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function AnimatedCounter({
  target,
  duration = 2000,
  decimals = 0,
  suffix = '',
}: {
  target: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: false, margin: '-20px' });

  useEffect(() => {
    if (!inView) {
      setCount(0);
      return;
    }

    let start: number | null = null;
    let animationFrameId: number;

    const easeOutExpo = (x: number): number => {
      return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    };

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);

      setCount(eased * target);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [inView, target, duration]);

  const formatted =
    decimals > 0
      ? count.toFixed(decimals)
      : Math.floor(count).toLocaleString('en-US');

  return (
    <span ref={ref} className="tabular-nums">
      {formatted}{suffix}
    </span>
  );
}

const platformStats = [
  {
    target: 12,
    suffix: '+',
    decimals: 0,
    label: 'Qualified Scholars',
  },
  {
    target: 150,
    suffix: '+',
    decimals: 0,
    label: 'Active Students',
  },
  {
    target: 4.85,
    suffix: '',
    decimals: 2,
    label: 'Average Rating',
  },
  {
    target: 10000,
    suffix: '+',
    decimals: 0,
    label: 'Teaching Hours Completed',
  },
];

const values = [
  {
    title: 'Verified Scholars',
    desc: 'Personally vetted for authentic Sanad lineage and teaching adab.',
  },
  {
    title: 'Live 1:1 Sessions',
    desc: 'Private recitation correction focused and gently paced.',
  },
  {
    title: 'Built for Diaspora',
    desc: 'Flexible scheduling adapted for UK, US, Europe & Australia.',
  },
  {
    title: 'Structured Progress',
    desc: 'Milestone reports from foundational Qaida to advanced Tajweed.',
  },
  {
    title: 'Parent Confidence',
    desc: 'Direct communication, consistent scheduling, and safe environment.',
  },
  {
    title: 'Rooted Curriculum',
    desc: 'Classical Islamic disciplines with visible progress tracking.',
  },
];

const journey = [
  {
    title: 'Share Goals & Level',
    desc: 'Share the student’s goals and current level',
  },
  {
    title: 'Choose Learning Path',
    desc: 'Choose a learning path or request guidance',
  },
  {
    title: 'Scholar Matching',
    desc: 'Get matched with a qualified scholar',
  },
  {
    title: 'Steady Progress',
    desc: 'Begin weekly sessions with tracked progress',
  },
];

const learningRegions = [
  { label: 'UK', flag: 'uk' },
  { label: 'Europe', flag: 'eu' },
  { label: 'Australia', flag: 'au' },
  { label: 'US', flag: 'us' },
] as const;

const EU_FLAG_STARS = [
  { cx: 14, cy: 4 },
  { cx: 16.5, cy: 4.67 },
  { cx: 18.33, cy: 6.5 },
  { cx: 19, cy: 9 },
  { cx: 18.33, cy: 11.5 },
  { cx: 16.5, cy: 13.33 },
  { cx: 14, cy: 14 },
  { cx: 11.5, cy: 13.33 },
  { cx: 9.67, cy: 11.5 },
  { cx: 9, cy: 9 },
  { cx: 9.67, cy: 6.5 },
  { cx: 11.5, cy: 4.67 },
];

function RegionFlag({
  region,
  className = 'h-3.5 w-[22px] shrink-0 overflow-hidden rounded-[2px] ring-1 ring-white/25',
}: {
  region: (typeof learningRegions)[number]['flag'];
  className?: string;
}) {
  const sharedClassName = className;

  if (region === 'uk') {
    return (
      <svg aria-hidden="true" viewBox="0 0 28 18" className={sharedClassName}>
        <rect width="28" height="18" fill="#17365D" />
        <path d="M0 0 28 18M28 0 0 18" stroke="#fff" strokeWidth="5" />
        <path d="M0 0 28 18M28 0 0 18" stroke="#C8102E" strokeWidth="2" />
        <path d="M14 0v18M0 9h28" stroke="#fff" strokeWidth="6" />
        <path d="M14 0v18M0 9h28" stroke="#C8102E" strokeWidth="3.2" />
      </svg>
    );
  }

  if (region === 'eu') {
    return (
      <svg aria-hidden="true" viewBox="0 0 28 18" className={sharedClassName}>
        <rect width="28" height="18" fill="#003399" />
        {EU_FLAG_STARS.map((star, i) => (
          <circle key={i} cx={star.cx} cy={star.cy} r="0.75" fill="#FFCC00" />
        ))}
      </svg>
    );
  }

  if (region === 'au') {
    return (
      <svg aria-hidden="true" viewBox="0 0 28 18" className={sharedClassName}>
        <rect width="28" height="18" fill="#012169" />
        <path d="M0 0 12 8M12 0 0 8" stroke="#fff" strokeWidth="2.8" />
        <path d="M0 0 12 8M12 0 0 8" stroke="#C8102E" strokeWidth="1.2" />
        <path d="M6 0v8M0 4h12" stroke="#fff" strokeWidth="3" />
        <path d="M6 0v8M0 4h12" stroke="#C8102E" strokeWidth="1.5" />
        <circle cx="7" cy="13" r="1.25" fill="#fff" />
        <circle cx="20" cy="4" r="1" fill="#fff" />
        <circle cx="24" cy="8" r="0.9" fill="#fff" />
        <circle cx="20" cy="14" r="1" fill="#fff" />
        <circle cx="16" cy="9" r="0.8" fill="#fff" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 28 18" className={sharedClassName}>
      <rect width="28" height="18" fill="#fff" />
      {[0, 2.76, 5.52, 8.28, 11.04, 13.8, 16.56].map((y) => (
        <rect key={y} y={y} width="28" height="1.38" fill="#B22234" />
      ))}
      <rect width="12" height="9.7" fill="#3C3B6E" />
      {[2, 6, 10].flatMap((x) => [2, 5, 8].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.55" fill="#fff" />))}
    </svg>
  );
}

export default function AboutPage() {
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [waitlistPhoneCountry, setWaitlistPhoneCountry] = useState<CountryCallingCode>(() => getCountryCallingCode('LK'));
  const [waitlistCourse, setWaitlistCourse] = useState('Tajweed Quran Recitation');
  const [waitlistPace, setWaitlistPace] = useState<'standard' | 'fast-track'>('standard');
  const [waitlistNotes, setWaitlistNotes] = useState('');
  const [isWaitlistSubmitting, setIsWaitlistSubmitting] = useState(false);
  const [isWaitlistSubmitted, setIsWaitlistSubmitted] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistName || !waitlistEmail) return;
    setIsWaitlistSubmitting(true);
    try {
      const formattedPhone = formatInternationalPhone(waitlistPhone, waitlistPhoneCountry);
      const waitlistEntry = {
        fullName: waitlistName,
        email: waitlistEmail,
        phone: formattedPhone,
        rawPhone: waitlistPhone,
        phoneCountry: waitlistPhoneCountry.name,
        phoneCountryCode: waitlistPhoneCountry.iso2,
        phoneDialCode: waitlistPhoneCountry.dialCode,
        course: waitlistCourse,
        pace: waitlistPace,
        notes: waitlistNotes,
        submittedAt: new Date().toISOString(),
        source: 'about_page',
      };
      if (typeof window !== 'undefined') {
        const existing = JSON.parse(localStorage.getItem('ilm_waitlist_entries') || '[]');
        existing.push(waitlistEntry);
        localStorage.setItem('ilm_waitlist_entries', JSON.stringify(existing));
      }
      await new Promise((res) => setTimeout(res, 600));
      setIsWaitlistSubmitted(true);
    } finally {
      setIsWaitlistSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-sanctuary-light text-stone-900 select-none">
      <div className="absolute top-16 -right-24 h-96 w-96 rounded-full bg-emerald-200/45 blur-3xl pointer-events-none" />
      <div className="absolute top-[42%] -left-28 h-[32rem] w-[32rem] rounded-full bg-teal-100/60 blur-3xl pointer-events-none" />

      {/* ========================================================================= */}
      {/* HERO SECTION — Matching Site UI Standard & Aesthetic                      */}
      {/* ========================================================================= */}
      <section className="relative min-h-[54vh] sm:min-h-[58vh] lg:min-h-[62vh] flex flex-col justify-between overflow-hidden bg-stone-950 text-white select-none">
        {/* Background Visual with Signature Multi-Layer Ambient Lighting */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/about-hero-scholar-monochrome.jpg"
            alt="Islamic scholar reading the Quran in a mosque courtyard"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[55%_48%] opacity-90"
          />
          <div className="absolute inset-0 bg-[#095F46]/25 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#031e18]/85 via-[#095F46]/20 to-[#031e18]/95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(3,30,24,0.65)_100%)]" />
        </div>

        {/* Top spacer for fixed header alignment */}
        <div className="w-full h-16 sm:h-20 pointer-events-none" aria-hidden="true" />

        {/* Bottom-Center Hero Content matching Home Hero standard */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          variants={fadeUp}
          className="relative z-20 mt-auto pb-10 sm:pb-14 pt-8 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center"
        >
          <div className="relative mx-auto max-w-4xl w-full">
            {/* 2-Tone Headline matching Home Hero standard */}
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-snug drop-shadow-md max-w-2xl mx-auto">
              <span className="block">A Trusted Bridge Between</span>
              <span className="block text-emerald-50 font-semibold text-base sm:text-2xl lg:text-[28px] mt-1">
                Scholars &amp; Students Worldwide
              </span>
            </h1>

          </div>
        </motion.div>

        {/* Subtle Bottom Ambient Spacer */}
        <div className="relative z-20 pb-2" />
      </section>

      {/* ========================================================================= */}
      {/* INTRODUCTION SECTION — Replicating Reference Image Layout (Fits in 1 Page) */}
      {/* ========================================================================= */}
      <section className="relative z-10 py-14 sm:py-16 lg:py-20 bg-[#f8faf8] border-b border-stone-200/60 select-none">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-7 sm:space-y-8">
          
          {/* Top Row: Left Title vs Right Concise Text */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            {/* Left: Heading with Brand Green Accent (consistent font size) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.2 }}
              variants={fadeUp}
              className="lg:col-span-7"
            >
              <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight text-stone-950 leading-[1.2]">
                Make Serious Islamic Education{' '}
                <span className="text-[#095F46]">Easier To Access,</span> And Easier To Stay With!
              </h2>
            </motion.div>

            {/* Right: Minimal, clean explanatory text */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.2 }}
              variants={fadeUp}
              className="lg:col-span-5 text-stone-600 text-xs sm:text-sm leading-relaxed"
            >
              <p>
                Ilmbit bridges authentic traditional scholarship with modern 1:1 virtual classrooms and flexible scheduling designed specifically for diaspora families.
              </p>
            </motion.div>
          </div>

          {/* Learning principles */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={fadeUp}
            className="grid gap-4 lg:grid-cols-12 lg:grid-rows-2"
          >
            <article className="group relative min-h-[390px] overflow-hidden rounded-3xl bg-stone-900 lg:col-span-7 lg:row-span-2 lg:min-h-[500px]">
              <Image
                src="/images/about-verified-scholar.jpg"
                alt="Quran teacher seated beside an open copy of the Holy Quran"
                fill
                className="object-cover object-[center_54%] transition-transform duration-700 group-hover:scale-[1.025]"
                sizes="(max-width: 1024px) 100vw, 58vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#052d23]/95 via-[#052d23]/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-9">
                <h3 className="max-w-md text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                  Verified Scholars
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-emerald-50/85 sm:text-base">
                  Sanad-certified educators selected for Islamic depth and teaching adab.
                </p>
              </div>
            </article>

            <article className="group relative min-h-[270px] overflow-hidden rounded-3xl bg-stone-900 lg:col-span-5 lg:min-h-0">
              <Image
                src="/images/about-personal-attention-online.jpg"
                alt="Student receiving personal online Quran instruction"
                fill
                className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.035]"
                sizes="(max-width: 1024px) 100vw, 42vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-7">
                <h3 className="text-2xl font-bold tracking-tight">Personal Attention</h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-200">
                  Private sessions paced around the student, with direct Tajweed correction.
                </p>
              </div>
            </article>

            <article className="group relative flex min-h-[230px] flex-col justify-center overflow-hidden rounded-3xl border border-[#095F46]/12 bg-white lg:col-span-5 lg:min-h-0">
              <div className="relative p-6 text-stone-950 sm:p-7">
                <h3 className="text-2xl font-bold tracking-tight">Built Around You</h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-600">
                  Flexible scheduling designed around international time zones.
                </p>
                <div className="mt-5 flex items-center justify-center gap-3 sm:justify-start" aria-label="Available across the United Kingdom, Europe, Australia, and the United States">
                  {learningRegions.map((region) => (
                    <RegionFlag
                      key={region.flag}
                      region={region.flag}
                      className="h-auto w-10 overflow-hidden rounded-[4px] shadow-sm ring-1 ring-stone-900/10 sm:w-11"
                    />
                  ))}
                </div>
              </div>
            </article>
          </motion.div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* THE PLATFORM STANDARDS — Replicating Reference Layout */}
      {/* ========================================================================= */}
      <section id="standards" className="relative z-10 border-y border-stone-200/70 bg-white/50 py-14 sm:py-16 lg:py-20 backdrop-blur-sm scroll-mt-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Top Row: Left Image with Badge vs Right Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Image with Custom Rounded Corner & Floating Badge (matching reference) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.2 }}
              variants={fadeUp}
              className="lg:col-span-5 relative"
            >
              {/* Floating Circular Badge in Top-Left */}
              <div className="absolute -top-3 -left-3 sm:-top-5 sm:-left-5 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white shadow-[0_12px_36px_rgba(0,0,0,0.12)] border border-stone-100 flex flex-col items-center justify-center p-2 text-center z-20">
                <span className="text-lg sm:text-xl font-black text-[#095F46] tracking-tight leading-none">100%</span>
                <span className="text-[9px] sm:text-[10px] font-bold text-stone-600 uppercase tracking-wider mt-0.5 leading-tight text-center">Sanad Verified</span>
              </div>

              {/* Main Image with custom corner rounding */}
              <div className="relative w-full aspect-[4/3] rounded-3xl rounded-bl-[50px] sm:rounded-bl-[72px] overflow-hidden border-4 sm:border-6 border-white shadow-[0_16px_40px_rgba(0,0,0,0.08)] bg-stone-100">
                <Image
                  src="/images/about-standards-quran.jpg"
                  alt="An open copy of the Holy Quran on a reading stand"
                  fill
                  className="object-cover object-[center_58%]"
                  sizes="(max-width: 1024px) 100vw, 520px"
                />
              </div>
            </motion.div>

            {/* Right Column: Title, Minimal Description, 6 Points Grid, and Button */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.2 }}
              variants={fadeUp}
              className="lg:col-span-7 flex flex-col justify-center"
            >
              {/* Bold Main Heading - font size matched to Section 2 */}
              <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight text-stone-950 leading-[1.2] mb-3">
                Elevating Islamic Education With Uncompromising Standards
              </h2>

              {/* Minimal Introductory Description Paragraph */}
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-5">
                Every class, curriculum module, and scholar relationship is held to the highest benchmarks of authentic Islamic guidance.
              </p>

              {/* 6 Points in 2-Column Checklist Form (Compact & breathable) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 mb-6">
                {values.map((val) => (
                  <div key={val.title} className="flex items-start gap-2.5">
                    <div className="w-4.5 h-4.5 rounded-full bg-[#095F46] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-[13px] font-bold text-stone-900 leading-snug">
                        {val.title}
                      </div>
                      <p className="text-[11px] sm:text-xs text-stone-500 leading-snug mt-0.5">
                        {val.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div>
                <Link
                  href="/about#waitlist"
                  className="brand-button brand-button-primary px-7"
                >
                  Start Free Trial
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PLATFORM STATS STRIP — Compact 4 Metrics Directly Below Platform Standards (Matches Homepage) */}
      {/* ========================================================================= */}
      <section
        id="stats"
        className="relative z-20 py-8 sm:py-10 border-b border-stone-200/60 select-none bg-[#f8faf8]"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            variants={sectionReveal}
            className="grid grid-cols-2 md:grid-cols-4 items-center"
          >
            {platformStats.map((stat, idx) => {
              const isLastDesktop = idx === 3;
              const hasRightBorderMobile = idx % 2 === 0;
              const hasBottomBorderMobile = idx < 2;
              return (
                <div
                  key={stat.label}
                  className={`text-center py-3 sm:py-4 px-2 sm:px-6
                    ${!isLastDesktop ? 'md:border-r md:border-stone-300/70' : 'md:border-r-0'}
                    ${hasRightBorderMobile ? 'border-r border-stone-300/70' : ''}
                    ${hasBottomBorderMobile ? 'border-b border-stone-300/70 pb-6 md:border-b-0 md:pb-4' : 'pt-6 md:pt-4'}
                  `}
                >
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#095F46] tracking-tight mb-1.5">
                    <AnimatedCounter
                      target={stat.target}
                      decimals={stat.decimals}
                      suffix={stat.suffix}
                      duration={2000}
                    />
                  </div>
                  <div className="text-stone-700 text-xs sm:text-sm lg:text-[15px] font-semibold tracking-tight">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-14 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={fadeUp}
            className="group relative flex min-h-[390px] flex-col justify-end overflow-hidden rounded-3xl bg-stone-900 p-7 text-white sm:p-9 lg:col-span-5 lg:min-h-[460px]"
          >
            <Image
              src="/images/about-learning-journey.jpg"
              alt="Muslim graduate holding her diploma outside a mosque"
              fill
              className="object-cover object-[center_58%] transition-transform duration-700 group-hover:scale-[1.025]"
              sizes="(max-width: 1024px) 100vw, 42vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#052d23]/95 via-[#052d23]/45 to-stone-950/10" />
            <div className="relative z-10">
              <h2 className="text-2xl font-bold leading-[1.2] tracking-tight sm:text-3xl lg:text-[32px]">
                A calmer path from signup to steady learning.
              </h2>
              <p className="mt-3 max-w-md text-xs leading-relaxed text-emerald-50/85 sm:text-sm">
                The experience is intentionally simple: remove the friction, keep the scholar relationship strong, and make every next step obvious.
              </p>
              <div className="mt-6">
                <Link
                  href="/about#waitlist"
                  className="brand-button brand-button-inverse px-7"
                >
                  Get Started <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>

          <div className="lg:col-span-7 lg:pl-4">
            <ol className="border-y border-stone-300/80">
              {journey.map((item, i) => {
                return (
                  <motion.li
                    key={item.title}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: false, amount: 0.15 }}
                    variants={fadeUp}
                    transition={{ delay: i * 0.08 }}
                    className={`grid grid-cols-[52px_1fr] gap-4 border-b border-stone-300/80 py-5 last:border-b-0 sm:grid-cols-[64px_1fr] sm:gap-6 sm:py-6 ${
                      i === 1
                        ? 'lg:ml-8'
                        : i === 2
                          ? 'lg:ml-16'
                          : i === 3
                            ? 'lg:ml-24'
                            : ''
                    }`}
                  >
                    <span className="pt-0.5 text-2xl font-semibold tabular-nums tracking-[-0.04em] text-[#095F46]/45 sm:text-3xl">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="grid gap-1 sm:grid-cols-[minmax(165px,0.8fr)_1.2fr] sm:items-baseline sm:gap-7">
                      <h3 className="text-base font-bold tracking-tight text-stone-950 sm:text-lg">
                        {item.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-stone-500 sm:text-sm">
                        {item.desc}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <section id="waitlist" className="relative z-10 scroll-mt-28 px-4 pb-10 sm:px-6 sm:pb-14 lg:px-8 lg:pb-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          variants={fadeUp}
          className="relative mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-stone-200 bg-[#f7f7f3] shadow-[0_22px_70px_rgba(20,32,27,0.10)] lg:grid-cols-[0.82fr_1.18fr]"
        >
          <div className="relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-[#083f33] p-7 text-white sm:p-9 lg:min-h-0 lg:p-10">
            <Image
              src="/images/about-waitlist-quran.jpg"
              alt=""
              fill
              aria-hidden="true"
              className="pointer-events-none select-none object-cover object-[center_58%] opacity-70"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#052d23]/70 via-[#052d23]/80 to-[#031e18]/95" />
            <Image
              src="/images/ilmbit-mark-white.png"
              alt=""
              width={360}
              height={360}
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 select-none object-contain opacity-[0.075] sm:h-80 sm:w-80 lg:-bottom-20 lg:-right-24"
            />
            <div className="relative z-10">
              <h2 className="max-w-md text-3xl font-bold leading-[1.08] tracking-[-0.04em] text-white sm:text-4xl lg:text-[42px]">
                Begin Your Sacred Journey of Knowledge
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-emerald-50/75 sm:text-base">
                Tell us what you want to learn. We will use it to prepare the right scholar match and schedule.
              </p>
            </div>

            <div className="relative z-10 mt-12 border-t border-white/20 pt-5">
              <p className="text-sm font-semibold text-white">Priority matching</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-50/65">
                No credit card required. We will contact you when a suitable scholar schedule opens.
              </p>
            </div>
          </div>

          <div className="relative bg-[#f7f7f3] p-6 sm:p-8 lg:p-9">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#095F46]">Join the waitlist</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-stone-950">Your learning preferences</h3>
              </div>
              <span className="hidden text-xs text-stone-500 sm:block">Takes about a minute</span>
            </div>

            {!isWaitlistSubmitted ? (
              <form onSubmit={handleWaitlistSubmit} className="space-y-5 text-left">
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Full name <span className="text-[#095F46]">*</span>
                    <input
                      type="text"
                      required
                      value={waitlistName}
                      onChange={(e) => setWaitlistName(e.target.value)}
                      placeholder="Sarah Ahmed"
                      className="mt-1 block w-full border-0 border-b border-stone-300 bg-transparent px-0 py-2 text-sm text-stone-950 placeholder:text-stone-400 focus:border-[#095F46] focus:outline-none focus:ring-0"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-stone-700">
                    Email address <span className="text-[#095F46]">*</span>
                    <input
                      type="email"
                      required
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="mt-1 block w-full border-0 border-b border-stone-300 bg-transparent px-0 py-2 text-sm text-stone-950 placeholder:text-stone-400 focus:border-[#095F46] focus:outline-none focus:ring-0"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-stone-700">
                    Discipline of interest
                    <select
                      value={waitlistCourse}
                      onChange={(e) => setWaitlistCourse(e.target.value)}
                      className="mt-1 block w-full border-0 border-b border-stone-300 bg-transparent px-0 py-2 text-sm text-stone-950 focus:border-[#095F46] focus:outline-none focus:ring-0"
                    >
                      <option value="Noorani Qaida">Noorani Qaida (Beginner)</option>
                      <option value="Tajweed Quran Recitation">Tajweed Quran Recitation</option>
                      <option value="Hifz Memorization">Hifz Memorization (Advanced)</option>
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-stone-700">
                    Phone or WhatsApp
                    <CountryPhoneInput
                      value={waitlistPhone}
                      onChange={setWaitlistPhone}
                      selectedIso={waitlistPhoneCountry.iso2}
                      onCountryChange={setWaitlistPhoneCountry}
                      wrapperClassName="rounded-none border-0 border-b border-stone-300 bg-transparent focus-within:ring-0 focus-within:border-[#095F46]"
                      selectClassName="w-[118px] px-0 pr-2 py-2 border-stone-200 bg-transparent"
                      inputClassName="px-3 py-2 bg-transparent"
                    />
                  </label>
                </div>

                <fieldset>
                  <legend className="mb-2 text-xs font-semibold text-stone-700">Preferred learning pace</legend>
                  <div className="grid grid-cols-2 gap-1 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.025)]">
                    <button
                      type="button"
                      aria-pressed={waitlistPace === 'standard'}
                      onClick={() => setWaitlistPace('standard')}
                      className={`rounded-xl px-3 py-2.5 text-left transition-colors ${
                        waitlistPace === 'standard'
                          ? 'bg-[#095F46] text-white'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span className="block text-xs font-bold">Standard</span>
                      <span className={`mt-0.5 block text-[11px] ${waitlistPace === 'standard' ? 'text-emerald-50/75' : 'text-stone-500'}`}>
                        2 sessions / wk · $59/mo
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={waitlistPace === 'fast-track'}
                      onClick={() => setWaitlistPace('fast-track')}
                      className={`rounded-xl px-3 py-2.5 text-left transition-colors ${
                        waitlistPace === 'fast-track'
                          ? 'bg-[#095F46] text-white'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span className="block text-xs font-bold">Fast Track</span>
                      <span className={`mt-0.5 block text-[11px] ${waitlistPace === 'fast-track' ? 'text-emerald-50/75' : 'text-stone-500'}`}>
                        3 sessions / wk · $89/mo
                      </span>
                    </button>
                  </div>
                </fieldset>

                <label className="block text-xs font-semibold text-stone-700">
                  Notes or goals <span className="font-normal text-stone-400">(optional)</span>
                  <textarea
                    rows={2}
                    value={waitlistNotes}
                    onChange={(e) => setWaitlistNotes(e.target.value)}
                    placeholder="Schedule preferences, student age, or learning goals"
                    className="mt-1 block w-full resize-none border-0 border-b border-stone-300 bg-transparent px-0 py-2 text-sm text-stone-950 placeholder:text-stone-400 focus:border-[#095F46] focus:outline-none focus:ring-0"
                  />
                </label>

                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={isWaitlistSubmitting}
                    className="brand-button brand-button-primary justify-center px-7"
                  >
                    <span>{isWaitlistSubmitting ? 'Joining Waitlist...' : 'Join the Priority Waitlist'}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <p className="text-[11px] leading-relaxed text-stone-500">
                    We only use these details to arrange your scholar match.
                  </p>
                </div>
              </form>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e3f0ea] text-[#095F46] ring-1 ring-[#cce1d8]">
                  <Check className="h-7 w-7 stroke-[3]" />
                </div>
                <h3 className="text-2xl font-bold text-stone-950">
                  Alhamdulillah, You&apos;re on the Waitlist!
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-600">
                  We have reserved your priority place for <span className="font-bold text-stone-900">{waitlistCourse}</span> ({waitlistPace === 'fast-track' ? 'Fast Track · 3 sessions/wk' : 'Standard · 2 sessions/wk'}). We will reach out to <span className="font-bold text-[#095F46]">{waitlistEmail}</span> as soon as your matching scholar schedule opens up.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
