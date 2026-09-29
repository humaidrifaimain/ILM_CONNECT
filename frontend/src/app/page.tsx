'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronRight,
  Check,
  Quote,
  ArrowLeft,
  ArrowRight,
  X,
} from 'lucide-react';
import { motion, useInView, AnimatePresence, type Variants } from 'framer-motion';
import WaitlistModal from '@/components/waitlist-modal';
import HowItWorks from '@/components/how-it-works';

function AnimatedCounter({
  target,
  duration = 2000,
  decimals = 0,
  suffix = '',
  start = false,
}: {
  target: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  start?: boolean;
}) {
  const [count, setCount] = useState(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!start || hasAnimatedRef.current) return;

    hasAnimatedRef.current = true;
    let animationStart: number | null = null;
    let animationFrameId: number;

    const easeOutExpo = (x: number): number => {
      return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    };

    const step = (timestamp: number) => {
      if (animationStart === null) animationStart = timestamp;
      const elapsed = timestamp - animationStart;
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
  }, [start, target, duration]);

  const formatted =
    decimals > 0
      ? count.toFixed(decimals)
      : Math.floor(count).toLocaleString('en-US');

  return (
    <span className="tabular-nums" suppressHydrationWarning>
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

interface TestimonialStory {
  name: string;
  role: string;
  location: string;
  quote: string;
  fullStory: string;
  course: string;
}

const diasporaTestimonials: TestimonialStory[] = [
  {
    name: 'Sarah Ahmed',
    role: 'Parent of 2',
    location: 'London, UK',
    quote: 'Ilmbit has boosted our children’s Quran fluency astronomically, transforming how they engage with the Holy Quran.',
    fullStory: 'Ilmbit has boosted our children’s Quran fluency astronomically, transforming how they engage with the Holy Quran. Finding punctual, gentle teachers in London with high Tajweed standards was always a challenge. Now my 8-year-old and 11-year-old look forward to their classes with Maulavi Ismail.',
    course: '1:1 Tajweed Recitation',
  },
  {
    name: 'Dr. Tariq Mansoor',
    role: 'Father & Physician',
    location: 'Toronto, Canada',
    quote: 'Ilmbit is more essential to our family routine than our local weekend school. It’s a powerful solution to diaspora education.',
    fullStory: 'Ilmbit is more essential to our family routine than our local weekend school. It’s a powerful solution to diaspora education. With my unpredictable hospital shifts, being able to reschedule and get reliable 1:1 attention for my sons has been an absolute game changer.',
    course: 'Hifz Memorization',
  },
  {
    name: 'Muhammad Rashid',
    role: 'Adult Revert Student',
    location: 'Sydney, Australia',
    quote: 'Finding patient, authentic Sri Lankan scholars was nearly impossible until Ilmbit. My recitation confidence has reached a whole new level.',
    fullStory: 'Finding patient, authentic Sri Lankan scholars was nearly impossible until Ilmbit. As a revert learning Arabic phonetics from scratch, Sheikh Ahmed’s patience and encouragement gave me the confidence to recite accurately in daily prayers without hesitation.',
    course: 'Noorani Qaida & Tajweed',
  },
  {
    name: 'Amina Diallo',
    role: 'Mother of 9yo student',
    location: 'Paris, France',
    quote: 'The 1:1 Tajweed coaching from Maulavi Ismail is exceptional. My daughter eagerly prepares for her live sessions twice every week.',
    fullStory: 'The 1:1 Tajweed coaching from Maulavi Ismail is exceptional. My daughter eagerly prepares for her live sessions twice every week. Her pronunciation and rhythm have blossomed in just three months, and the progress feedback keeps our whole family motivated.',
    course: 'Tajweed Recitation',
  },
  {
    name: 'Fatima Zahra',
    role: 'Parent & Educator',
    location: 'Dallas, USA',
    quote: 'The structured progress reports and authentic scholar discipline gave our home the exact spiritual grounding we were searching for.',
    fullStory: 'The structured progress reports and authentic scholar discipline gave our home the exact spiritual grounding and recitation excellence we were searching for. You get traditional madrasa quality with modern LMS scheduling and recording.',
    course: '1:1 Tajweed Recitation',
  },
  {
    name: 'Zayd Al-Husseini',
    role: 'Hifz Student',
    location: 'Dubai, UAE',
    quote: 'Completed my Hifz revision with Sheikh Ahmed. His gentle correction and deep mastery of Hafs recitation is something you rarely find online.',
    fullStory: 'Completed my Hifz revision with Sheikh Ahmed. His gentle correction and deep mastery of Hafs recitation is something you rarely find online. The virtual classroom tools and audio clarity made reviewing five Juz a week seamless.',
    course: 'Advanced Hifz Revision',
  },
];

const TESTIMONIAL_ROTATION_MS = 6500;



const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const cardStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const revealViewport = {
  once: true,
  amount: 0.22,
  margin: '0px 0px -12% 0px',
} as const;

export default function HomePage() {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [selectedStory, setSelectedStory] = useState<TestimonialStory | null>(null);
  const testimonialRef = useRef<HTMLDivElement>(null);
  const testimonialsInView = useInView(testimonialRef, { once: true, amount: 0.2 });

  const statsRef = useRef<HTMLDivElement>(null);
  const statsActive = useInView(statsRef, {
    once: true,
    amount: 0.35,
    margin: '0px 0px -10% 0px',
  });

  const changeTestimonial = (direction: 'previous' | 'next') => {
    setTestimonialIndex((current) => {
      if (direction === 'previous') {
        return (current - 1 + diasporaTestimonials.length) % diasporaTestimonials.length;
      }
      return (current + 1) % diasporaTestimonials.length;
    });
  };

  useEffect(() => {
    if (!testimonialsInView || selectedStory) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTestimonialIndex((current) => (current + 1) % diasporaTestimonials.length);
    }, TESTIMONIAL_ROTATION_MS);

    return () => window.clearTimeout(timer);
  }, [testimonialIndex, testimonialsInView, selectedStory]);

  const activeTestimonial = diasporaTestimonials[testimonialIndex];


  return (
    <>
      {/* ========================================================================= */}
      {/* 1. HERO SECTION — Background Video, Headline & Dual CTAs */}
      {/* ========================================================================= */}
      <section className="home-hero-section relative flex flex-col items-center justify-center overflow-hidden bg-stone-950 text-white select-none">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/ilmbit-hero-poster.jpg')" }}
        >
          <video
            className="hero-brand-video h-full w-full object-cover object-center"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/images/ilmbit-hero-poster.jpg"
            aria-hidden="true"
          >
            <source src="/ilmbit-hero-boomerang.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/75" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.45)_100%)]" />
        </div>

        {/* Top spacer for fixed header alignment */}
        <div className="w-full h-16 sm:h-20 shrink-0 pointer-events-none" aria-hidden="true" />

        {/* Centered Hero Content */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          variants={sectionReveal}
          className="relative z-20 my-auto py-12 sm:py-16 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center max-w-4xl mx-auto w-full"
        >
          <div className="relative mx-auto max-w-3xl w-full">
            {/* 2-Line Headline */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight drop-shadow-lg max-w-3xl mx-auto">
              <span className="block">Learn Quran &amp; Islamic Studies</span>
              <span className="block text-emerald-50 font-semibold text-lg sm:text-2xl lg:text-3xl mt-2">
                from Qualified Scholars Worldwide
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 sm:mt-5 text-sm sm:text-base text-stone-200 max-w-xl mx-auto leading-relaxed drop-shadow-md font-normal">
              Personalized 1:1 online Tajweed and Islamic studies with verified Sanad-certified scholars, tailored for diaspora families.
            </p>

            {/* Dual Pill CTA Buttons */}
            <div className="mt-7 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Link
                href="#courses"
                className="brand-button brand-button-inverse px-7"
              >
                View Courses
              </Link>
              <Link
                href="/auth/signup"
                className="brand-button brand-button-primary px-8"
              >
                Free Trial
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Bottom spacer balancing fixed header */}
        <div className="w-full h-16 sm:h-20 shrink-0 pointer-events-none" aria-hidden="true" />
      </section>

      {/* ========================================================================= */}
      {/* LIGHT-THEMED SANCTUARY CONTAINER (Animated Gradient & Ambient Glow) */}
      {/* ========================================================================= */}
      <div className="relative bg-sanctuary-light overflow-hidden text-stone-900 select-none">
        {/* Ambient floating glow orbs matching hero sanctuary palette */}
        <div className="absolute top-[3%] -right-[15%] w-[650px] h-[650px] rounded-full bg-emerald-200/35 blur-[140px] animate-ambient-orb-1 pointer-events-none" />
        <div className="absolute top-[26%] -left-[15%] w-[600px] h-[600px] rounded-full bg-teal-100/45 blur-[130px] animate-ambient-orb-2 pointer-events-none" />
        <div className="absolute top-[50%] -right-[12%] w-[700px] h-[700px] rounded-full bg-teal-200/30 blur-[140px] animate-ambient-orb-1 pointer-events-none" />
        <div className="absolute top-[75%] -left-[14%] w-[650px] h-[650px] rounded-full bg-emerald-200/25 blur-[130px] animate-ambient-orb-2 pointer-events-none" />

        {/* ========================================================================= */}
        {/* 2. WHY ILMBIT / MISSION SECTION — Reference-Style Content & Stats */}
        {/* ========================================================================= */}
        <section
          id="mission"
          suppressHydrationWarning
          className="relative z-20 overflow-hidden border-b border-stone-200/60 py-14 select-none sm:py-18 lg:py-20"
        >
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:items-center lg:gap-12 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={sectionReveal}
              className="flex flex-col justify-center max-w-3xl"
            >
              <h2 className="max-w-[610px] text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-stone-950 leading-[1.15]" suppressHydrationWarning>
                <span>Grow In Sacred Knowledge So You Can </span>
                <span className="block text-[#095F46]">Live With Purpose &amp; Iman</span>
              </h2>

              <p className="mt-6 max-w-[560px] text-sm font-normal leading-relaxed text-stone-500 sm:text-base">
                Finding verified, authentic Islamic teachers who can guide your family with patience and consistency shouldn&apos;t be difficult. Ilmbit bridges you directly with qualified scholars for structured 1:1 online learning tailored to your timezone and personal pace.
              </p>

              <div className="mt-7 space-y-3.5">
                {[
                  'Flexible 1:1 training programs',
                  'Experienced scholars & certified teachers',
                  'Free incoming trial lesson',
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#095F46]/10 text-[#095F46]">
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-bold tracking-tight text-stone-900 sm:text-base">
                      {feature}
                    </h3>
                  </div>
                ))}
              </div>

            </motion.div>

            {/* --------------------------------------------------------------------- */}
            {/* 3. PLATFORM STATS SECTION (Hidden until launch) */}
            {/* --------------------------------------------------------------------- */}
            {/*
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={sectionReveal}
              className="flex items-center -mx-4 sm:-mx-6 lg:col-span-7 lg:mx-0 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] lg:w-full"
            >
              <div
                id="stats"
                ref={statsRef}
                className="grid w-full scroll-mt-32 grid-cols-2 bg-[#eef7f3] border-y border-[#d5e3dc] lg:grid-cols-4 lg:border-0"
              >
                {platformStats.map((stat, idx) => (
                  <div
                    key={stat.label}
                    className={`flex min-h-[120px] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[140px] sm:px-8 sm:py-10 lg:min-h-[148px] lg:px-4 lg:py-8 ${
                      idx % 2 === 0 ? 'border-r border-[#d5e3dc]' : ''
                    } ${idx < 2 ? 'border-b border-[#d5e3dc]' : ''} ${
                      idx < platformStats.length - 1 ? 'lg:border-r lg:border-[#d5e3dc]' : 'lg:border-r-0'
                    } lg:border-b-0`}
                  >
                    <h3 className="mb-2 text-4xl font-black tracking-tight text-[#095F46] sm:text-5xl lg:text-[34px] xl:text-4xl">
                      <AnimatedCounter
                        target={stat.target}
                        decimals={stat.decimals}
                        suffix={stat.suffix}
                        duration={2000}
                        start={statsActive}
                      />
                    </h3>
                    <p className="stat-label mx-auto max-w-[150px] text-xs font-bold leading-snug tracking-tight text-stone-700 sm:text-sm lg:text-xs xl:text-sm">
                      {stat.label === 'Teaching Hours Completed' ? (
                        <>
                          Teaching Hours<br />Completed
                        </>
                      ) : (
                        stat.label
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
            */}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. HOW IT WORKS SECTION — Interactive 4-Step Student Guide */}
        {/* ========================================================================= */}
        <section
          id="how-it-works"
          className="py-16 sm:py-20 lg:py-24 bg-[#f6f8f6] text-stone-900 border-b border-stone-200/60 scroll-mt-16 select-none relative overflow-hidden"
        >
          <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={sectionReveal}
              className="text-center max-w-3xl mx-auto mb-10 sm:mb-14"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-stone-950 leading-[1.15] mb-3 sm:mb-4">
                How It Works
              </h2>
              <p className="text-stone-600 font-normal text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                Start learning in minutes. Our streamlined process connects you with certified scholars seamlessly.
              </p>
            </motion.div>

            <HowItWorks />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. COURSES & PRICING SECTION — Minimalist 3-Card Grid */}
        {/* ========================================================================= */}
        <section
          id="courses"
          className="py-14 sm:py-18 lg:py-20 bg-transparent text-stone-900 scroll-mt-16 relative overflow-hidden border-b border-stone-200/60 select-none"
        >
          <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Header matching user voice instructions & Reference */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={sectionReveal}
              className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 lg:mb-12"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-stone-950 leading-[1.15] mb-3">
                Our Courses
              </h2>
              <p className="text-stone-500 font-normal text-xs sm:text-sm lg:text-base max-w-xl mx-auto leading-relaxed">
                Choose the right course for your Islamic education journey
              </p>
            </motion.div>

            {/* 3 Pricing & Course Cards Grid matching Reference Image */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={cardStagger}
              className="grid md:grid-cols-3 gap-4 lg:gap-6 items-stretch"
            >
              {/* CARD 1: Beginner Plan (Noorani Qaida) */}
              <motion.div
                variants={cardItem}
                className="rounded-3xl bg-white/95 backdrop-blur-md border border-stone-200/90 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-lg transition-all duration-300"
              >
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-950 tracking-tight mb-2">
                    Noorani Qaida
                  </h3>
                  <p className="text-stone-500 text-xs sm:text-[13px] leading-relaxed mb-5">
                    For beginners and children learning Quranic Arabic letters, correct pronunciation, and basic reading rules.
                  </p>

                  {/* Price Tag */}
                  <div className="flex items-baseline gap-1 mb-6 pb-5 border-b border-stone-100">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-stone-950">
                      $49
                    </span>
                    <span className="text-xs font-semibold text-stone-400">
                      / month
                    </span>
                  </div>

                  <Link
                    href="/auth/signup"
                    className="brand-button brand-button-primary mb-6 w-full"
                  >
                    Select Plan
                  </Link>

                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">
                    What&apos;s Included
                  </div>
                  <ul className="space-y-2.5 text-xs text-stone-600 font-medium">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>8 sessions per month (2/week)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>45-minute 1:1 live sessions</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>Letter pronunciation &amp; Makharij</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>Session recordings &amp; notes</span>
                    </li>
                  </ul>

                  <div className="mt-5 pt-4 border-t border-stone-100">
                    <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100/90 p-3 sm:p-3.5 flex flex-col gap-2">
                      <p className="text-sm font-bold text-stone-900">
                        Start Strong
                      </p>
                      <Link href="/pricing#fast-track-plans" className="brand-button brand-button-secondary w-full justify-between px-4 text-xs">
                        <span>Explore Fast Track Plan</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* CARD 2: Intermediate Plan (Tajweed Mastery) — Matching Card Style */}
              <motion.div
                variants={cardItem}
                className="rounded-3xl bg-white/95 backdrop-blur-md border border-stone-200/90 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-lg transition-all duration-300"
              >
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-950 tracking-tight mb-2">
                    Tajweed Mastery
                  </h3>
                  <p className="text-stone-500 text-xs sm:text-[13px] leading-relaxed mb-5">
                    Master the science of Tajweed, rules of elongation, stops, and beautiful melodic recitation with Sanad scholars.
                  </p>

                  {/* Price Tag */}
                  <div className="flex items-baseline gap-1 mb-6 pb-5 border-b border-stone-100">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-stone-950">
                      $59
                    </span>
                    <span className="text-xs font-semibold text-stone-400">
                      / month
                    </span>
                  </div>

                  <Link
                    href="/auth/signup"
                    className="brand-button brand-button-primary mb-6 w-full"
                  >
                    Select Plan
                  </Link>

                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">
                    What&apos;s Included
                  </div>
                  <ul className="space-y-2.5 text-xs text-stone-600 font-medium">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>8 sessions per month (2/week)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>45-minute 1:1 live sessions</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>Comprehensive Tajweed theoretical rules</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>Melodic recitation &amp; Waqf guidance</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>Monthly progress evaluation</span>
                    </li>
                  </ul>

                  <div className="mt-5 pt-4 border-t border-stone-100">
                    <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100/90 p-3 sm:p-3.5 flex flex-col gap-2">
                      <p className="text-sm font-bold text-stone-900">
                        Recite Better
                      </p>
                      <Link href="/pricing#fast-track-plans" className="brand-button brand-button-secondary w-full justify-between px-4 text-xs">
                        <span>Explore Fast Track Plan</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* CARD 3: Intensive Memorization (Hifz) */}
              <motion.div
                variants={cardItem}
                className="rounded-3xl bg-white/95 backdrop-blur-md border border-stone-200/90 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-lg transition-all duration-300"
              >
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-950 tracking-tight mb-2">
                    Hifz Program
                  </h3>
                  <p className="text-stone-500 text-xs sm:text-[13px] leading-relaxed mb-5">
                    Structured Quran memorization with dedicated daily revision, retention strategies, and individual Sanad pathway.
                  </p>

                  {/* Price Tag */}
                  <div className="flex items-baseline gap-1 mb-6 pb-5 border-b border-stone-100">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-stone-950">
                      $79
                    </span>
                    <span className="text-xs font-semibold text-stone-400">
                      / month
                    </span>
                  </div>

                  <Link
                    href="/auth/signup"
                    className="brand-button brand-button-primary mb-6 w-full"
                  >
                    Select Plan
                  </Link>

                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">
                    What&apos;s Included
                  </div>
                  <ul className="space-y-2.5 text-xs text-stone-600 font-medium">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>8 sessions per month (2/week)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>45-minute 1:1 live sessions</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>Dedicated Hifz coach</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>Structured memorization schedule</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 stroke-[2.5]" />
                      <span>Revision tracking &amp; lecturer messaging</span>
                    </li>
                  </ul>

                  <div className="mt-5 pt-4 border-t border-stone-100">
                    <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100/90 p-3 sm:p-3.5 flex flex-col gap-2">
                      <p className="text-sm font-bold text-stone-900">
                        Memorize More
                      </p>
                      <Link href="/pricing#fast-track-plans" className="brand-button brand-button-secondary w-full justify-between px-4 text-xs">
                        <span>Explore Fast Track Plan</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. TESTIMONIALS SECTION (Hidden until launch) */}
        {/* ========================================================================= */}
        {/*
        <section id="testimonials" className="py-14 sm:py-18 lg:py-20 bg-transparent scroll-mt-16 text-stone-900 border-b border-stone-200/60 select-none">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={sectionReveal}
              className="mx-auto mb-9 max-w-2xl text-center sm:mb-11"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-stone-950 leading-[1.15] mb-3">
                What Our Community Says
              </h2>
              <p className="mx-auto max-w-xl text-sm leading-relaxed text-stone-500 sm:text-base">
                From families and students learning with Ilmbit around the world.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs sm:text-sm">
                <span className="tracking-[0.12em] text-[#a66b13]" aria-label="Five out of five stars">★★★★★</span>
                <span className="font-bold text-stone-800">4.8</span>
                <span className="text-stone-400">from 500+ family reviews</span>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={sectionReveal}
              ref={testimonialRef}
              className="relative mx-auto max-w-3xl"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={testimonialIndex}
                  initial={{ opacity: 0, y: 14, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.985 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden rounded-[28px] border border-stone-200/90 bg-white/95 backdrop-blur-sm text-stone-950 shadow-[0_20px_50px_rgba(9,95,70,0.06)] sm:rounded-[32px] p-6 sm:p-9 lg:p-10"
                  aria-live="polite"
                >
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <Quote className="h-9 w-9 fill-[#095f46]/10 text-[#095f46]" aria-hidden="true" />
                        <span className="inline-flex items-center rounded-full bg-[#095f46]/10 px-3 py-1 text-xs font-bold text-[#095f46]">
                          {activeTestimonial.course}
                        </span>
                      </div>
                      <p className="text-xl font-semibold leading-[1.4] tracking-tight text-stone-950 sm:text-2xl lg:text-[26px]">
                        &ldquo;{activeTestimonial.quote}&rdquo;
                      </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-stone-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-base font-black text-stone-950 sm:text-lg">{activeTestimonial.name}</p>
                        <p className="mt-0.5 text-xs font-medium text-stone-500 sm:text-sm">
                          {activeTestimonial.role} · {activeTestimonial.location}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStory(activeTestimonial)}
                        className="inline-flex items-center gap-2 rounded-full bg-[#095f46] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#074c38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095f46] focus-visible:ring-offset-2 self-start sm:self-auto cursor-pointer"
                      >
                        Read full story
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="mt-7 flex items-center justify-center gap-4 sm:gap-5">
                <button
                  type="button"
                  onClick={() => changeTestimonial('previous')}
                  aria-label="Previous testimonial"
                  className="brand-icon-button h-10 w-10 flex-none border border-stone-200 bg-white text-stone-700 shadow-sm hover:border-[#095f46] hover:bg-[#095f46] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095f46] focus-visible:ring-offset-2 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5" aria-label={`Testimonial ${testimonialIndex + 1} of ${diasporaTestimonials.length}`}>
                  {diasporaTestimonials.map((testimonial, index) => (
                    <button
                      key={testimonial.name}
                      type="button"
                      onClick={() => setTestimonialIndex(index)}
                      aria-label={`Show ${testimonial.name}'s testimonial`}
                      aria-current={index === testimonialIndex ? 'true' : undefined}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${index === testimonialIndex ? 'w-8 bg-[#095f46]' : 'w-2.5 bg-stone-300 hover:bg-stone-400'}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => changeTestimonial('next')}
                  aria-label="Next testimonial"
                  className="brand-icon-button h-10 w-10 flex-none border border-stone-200 bg-white text-stone-700 shadow-sm hover:border-[#095f46] hover:bg-[#095f46] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095f46] focus-visible:ring-offset-2 cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {selectedStory && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="testimonial-dialog-title"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-100"
                >
                  <button
                    onClick={() => setSelectedStory(null)}
                    aria-label="Close story"
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="mb-6 border-b border-stone-200 pb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#095f46]">Community story</p>
                    <h3 id="testimonial-dialog-title" className="mt-3 text-xl font-bold tracking-tight text-stone-950">{selectedStory.name}</h3>
                    <p className="mt-1 text-sm text-stone-500">{selectedStory.role} · {selectedStory.location}</p>
                  </div>

                  <p className="text-stone-800 text-sm sm:text-base leading-relaxed mb-6 font-medium">
                    &ldquo;{selectedStory.fullStory}&rdquo;
                  </p>

                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-between text-xs text-stone-600">
                    <span className="font-semibold text-stone-900">Enrolled In: {selectedStory.course}</span>
                    <span className="text-emerald-700 font-bold">Verified Diaspora Family</span>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </section>
        */}
      </div>

      {/* ========================================================================= */}
      {/* 7. BOTTOM CALL TO ACTION / WAITLIST BANNER SECTION */}
      {/* ========================================================================= */}
      <section className="relative w-full overflow-hidden bg-[#f5f7f6] py-20 sm:py-24 lg:py-28 text-stone-900 select-none border-t border-stone-200/70">
        <Image
          src="/images/home-cta-quran.jpg"
          alt=""
          fill
          aria-hidden="true"
          className="object-cover object-[center_52%] opacity-[0.05] mix-blend-multiply"
          sizes="100vw"
        />
        {/* Soft atmospheric gradients matching site standards */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#f5f7f6] via-[#f5f7f6]/95 to-[#eaf2ee]/85" />
        <div className="absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-emerald-200/25 blur-3xl pointer-events-none" />

        {/* Brand Mark Watermark */}
        <Image
          src="/images/ilmbit-mark-green.png"
          alt=""
          width={380}
          height={380}
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 bottom-0 w-52 select-none object-contain opacity-[0.07] sm:w-72 lg:right-10 lg:w-96"
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={sectionReveal}
            className="flex flex-col justify-center max-w-[640px]"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-stone-950 leading-[1.15] mb-4">
              Begin Your Sacred Journey of Knowledge
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
              Tell us what you want to learn. We will use it to prepare the right scholar match and schedule.
            </p>

            <div className="mt-8">
              <Link
                href="/auth/signup"
                className="brand-button brand-button-primary px-8 text-base shadow-sm"
              >
                <span>Free Trial</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. WAITLIST MODAL POPUP COMPONENT */}
      {/* ========================================================================= */}
      <WaitlistModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
      />
    </>
  );
}
