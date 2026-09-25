'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Check,
  Quote,
  X,
} from 'lucide-react';
import { motion, AnimatePresence, useInView, type Variants } from 'framer-motion';
import WaitlistModal from '@/components/waitlist-modal';
import HowItWorks from '@/components/how-it-works';

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






interface TestimonialStory {
  name: string;
  role: string;
  location: string;
  quote: string;
  fullStory: string;
  course: string;
  avatar: string;
}

const diasporaTestimonials: TestimonialStory[] = [
  {
    name: 'Sarah Ahmed',
    role: 'Parent of 2',
    location: 'London, UK',
    quote: 'Ilmbit has boosted our children’s Quran fluency astronomically, transforming how they engage with the Holy Quran.',
    fullStory: 'Ilmbit has boosted our children’s Quran fluency astronomically, transforming how they engage with the Holy Quran. Finding punctual, gentle teachers in London with high Tajweed standards was always a challenge. Now my 8-year-old and 11-year-old look forward to their classes with Maulavi Ismail.',
    course: '1:1 Tajweed Recitation',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=face',
  },
  {
    name: 'Dr. Tariq Mansoor',
    role: 'Father & Physician',
    location: 'Toronto, Canada',
    quote: 'Ilmbit is more essential to our family routine than our local weekend school. It’s a powerful solution to diaspora education.',
    fullStory: 'Ilmbit is more essential to our family routine than our local weekend school. It’s a powerful solution to diaspora education. With my unpredictable hospital shifts, being able to reschedule and get reliable 1:1 attention for my sons has been an absolute game changer.',
    course: 'Hifz Memorization',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
  },
  {
    name: 'Muhammad Rashid',
    role: 'Adult Revert Student',
    location: 'Sydney, Australia',
    quote: 'Finding patient, authentic Sri Lankan scholars was nearly impossible until Ilmbit. My recitation confidence has reached a whole new level.',
    fullStory: 'Finding patient, authentic Sri Lankan scholars was nearly impossible until Ilmbit. As a revert learning Arabic phonetics from scratch, Sheikh Ahmed’s patience and encouragement gave me the confidence to recite accurately in daily prayers without hesitation.',
    course: 'Noorani Qaida & Tajweed',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face',
  },
  {
    name: 'Amina Diallo',
    role: 'Mother of 9yo student',
    location: 'Paris, France',
    quote: 'The 1:1 Tajweed coaching from Maulavi Ismail is exceptional. My daughter eagerly prepares for her live sessions twice every week.',
    fullStory: 'The 1:1 Tajweed coaching from Maulavi Ismail is exceptional. My daughter eagerly prepares for her live sessions twice every week. Her pronunciation and rhythm have blossomed in just three months, and the progress feedback keeps our whole family motivated.',
    course: 'Tajweed Recitation',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face',
  },
  {
    name: 'Fatima Zahra',
    role: 'Parent & Educator',
    location: 'Dallas, USA',
    quote: 'The structured progress reports and authentic scholar discipline gave our home the exact spiritual grounding we were searching for.',
    fullStory: 'The structured progress reports and authentic scholar discipline gave our home the exact spiritual grounding and recitation excellence we were searching for. You get traditional madrasa quality with modern LMS scheduling and recording.',
    course: '1:1 Tajweed Recitation',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop&crop=face',
  },
  {
    name: 'Zayd Al-Husseini',
    role: 'Hifz Student',
    location: 'Dubai, UAE',
    quote: 'Completed my Hifz revision with Sheikh Ahmed. His gentle correction and deep mastery of Hafs recitation is something you rarely find online.',
    fullStory: 'Completed my Hifz revision with Sheikh Ahmed. His gentle correction and deep mastery of Hafs recitation is something you rarely find online. The virtual classroom tools and audio clarity made reviewing five Juz a week seamless.',
    course: 'Advanced Hifz Revision',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop&crop=face',
  },
];

const TESTIMONIAL_ROTATION_MS = 6500;

export default function HomePage() {
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [selectedStory, setSelectedStory] = useState<TestimonialStory | null>(null);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const testimonialRef = useRef<HTMLDivElement>(null);
  const testimonialsInView = useInView(testimonialRef, { once: false, amount: 0.35 });

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
  const activePortrait = activeTestimonial.avatar.replace('w=120&h=120', 'w=800&h=900');

  return (
    <>
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* HERO SECTION — Ultra-Modern Minimal Glassmorphic Layout Matching Reference */}
      {/* ========================================================================= */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-stone-950 text-white select-none">
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
          viewport={{ once: false, amount: 0.2 }}
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
                href="/about#waitlist"
                className="brand-button brand-button-primary px-8"
              >
                Book Free Trial
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
        {/* WHY ILMBIT SECTION — Editorial Split Showcase Matching Reference */}
        {/* ========================================================================= */}
        <section
          id="mission"
          className="relative z-20 py-16 sm:py-24 border-b border-stone-200/60 select-none overflow-hidden"
        >
          {/* Subtle decorative curved arrow bottom right */}
          <svg
            className="absolute bottom-6 right-6 sm:right-16 w-20 h-20 text-stone-300 pointer-events-none hidden sm:block opacity-60"
            viewBox="0 0 100 100"
            fill="none"
          >
            <path
              d="M 30 85 C 42 45, 68 28, 82 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
            <path
              d="M 72 18 L 82 14 L 86 25"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
              {/* Left Column: Overlapping Organic Shaped Photo Composition */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.2 }}
                variants={sectionReveal}
                className="lg:col-span-6 relative pb-10 sm:pb-12 pl-4 sm:pl-8 pr-2"
              >
                {/* Subtle top-left decorative flourish arrow */}
                <svg
                  className="absolute -top-10 left-0 w-16 h-16 text-stone-300 pointer-events-none hidden sm:block opacity-60 -rotate-12"
                  viewBox="0 0 100 100"
                  fill="none"
                >
                  <path
                    d="M 20 20 C 50 15, 68 38, 58 72"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 48 68 L 58 74 L 66 64"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Main Scholar Photo Frame */}
                <div className="relative w-full max-w-[490px] mx-auto aspect-[4/3] rounded-t-[36px] sm:rounded-t-[44px] rounded-br-[110px] sm:rounded-br-[150px] rounded-bl-[36px] overflow-hidden shadow-[0_16px_45px_rgba(0,0,0,0.09)] border border-stone-200/80 bg-stone-100">
                  <Image
                    src="/images/why-ilm-scholar.jpg"
                    alt="Islamic scholar teaching Quran online via laptop"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 490px"
                  />
                  {/* Soft inner vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/10 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Small Lime Accent Dot on Right Outer Border */}
                <div className="absolute right-0 sm:right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#84cc16] shadow-sm z-20" />

                {/* Overlapping Inset Student Hands / Quran Photo at Bottom-Left */}
                <div className="absolute bottom-0 left-0 sm:left-2 w-44 sm:w-56 md:w-60 aspect-[4/3] rounded-[28px] sm:rounded-[36px] border-[6px] sm:border-[8px] border-white shadow-[0_20px_45px_rgba(0,0,0,0.16)] overflow-hidden bg-stone-100 z-10">
                  <Image
                    src="/images/why-ilm-quran-hands.jpg"
                    alt="Student following Holy Quran recitation with wooden pointer"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 176px, 240px"
                  />
                </div>
              </motion.div>

              {/* Right Column: Narrative, Value Proposition & Checklist */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.2 }}
                variants={sectionReveal}
                className="lg:col-span-6 flex flex-col justify-center lg:pl-4"
              >
                {/* High-Impact Heading with Brand Green Accent */}
                <h2 className="max-w-[620px] text-3xl sm:text-4xl lg:text-[40px] xl:text-[44px] font-bold sm:font-extrabold tracking-tight text-stone-950 leading-[1.14] sm:leading-[1.12] mb-5">
                  Grow In Sacred Knowledge So You Can{' '}
                  <span className="text-[#095F46] block sm:inline mt-1 sm:mt-0">Live With Purpose &amp; Iman</span>
                </h2>

                {/* Narrative Paragraph */}
                <p className="text-stone-500 font-normal text-sm sm:text-base leading-relaxed mb-7 max-w-xl">
                  Finding verified, authentic Islamic teachers who can guide your family with patience and consistency shouldn&apos;t be difficult. Ilmbit bridges you directly with qualified scholars for structured 1:1 online learning tailored to your timezone and personal pace.
                </p>

                {/* Clean Feature Checklist with Brand Green Checkmarks */}
                <div className="space-y-3.5 mb-9">
                  {[
                    'Flexible 1:1 training programs',
                    'Experienced scholars & certified teachers',
                    'Free incoming trial lesson',
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[#095F46] bg-[#095F46]/10 shrink-0">
                        <svg
                          className="w-3.5 h-3.5 stroke-[2.5]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-stone-900 text-sm sm:text-base tracking-tight">
                        {feature}
                      </h3>
                    </div>
                  ))}
                </div>

                {/* CTA Button — Redirects to /about with Brand Green #095F46 */}
                <div className="flex items-center">
                  <Link
                    href="/about"
                    className="brand-button brand-button-primary px-9"
                  >
                    Learn More
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PLATFORM STATS STRIP — Compact 4 Metrics Directly Below Why Ilmbit */}
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
                    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#095F46] tracking-tight mb-1.5">
                      <AnimatedCounter
                        target={stat.target}
                        decimals={stat.decimals}
                        suffix={stat.suffix}
                        duration={2000}
                      />
                    </h3>
                    <p className="text-stone-900 text-xs sm:text-sm lg:text-[15px] font-bold tracking-tight">
                      {stat.label}
                    </p>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HOW IT WORKS SECTION — Interactive four-step guide */}
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
              viewport={{ once: false, amount: 0.2 }}
              variants={sectionReveal}
              className="text-center max-w-3xl mx-auto mb-10 sm:mb-14"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-950 mb-3 sm:mb-4">
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
        {/* COURSES SECTION — Reference Minimalist 3-Card Layout Fitting In One Screen */}
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
              viewport={{ once: false, amount: 0.2 }}
              variants={sectionReveal}
              className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 lg:mb-12"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-950 mb-3">
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
              viewport={{ once: false, amount: 0.15 }}
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
                    href="/about#waitlist"
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
                    href="/about#waitlist"
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
                    href="/about#waitlist"
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
        {/* TESTIMONIALS SECTION — Brand-aligned speech cards */}
        {/* ========================================================================= */}
        <section id="testimonials" className="py-14 sm:py-18 lg:py-20 bg-transparent scroll-mt-16 text-stone-900 border-b border-stone-200/60 select-none">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.2 }}
              variants={sectionReveal}
              className="mx-auto mb-9 max-w-2xl text-center sm:mb-11"
            >
              <h2 className="mb-3 text-3xl font-black tracking-tight text-stone-950 sm:text-4xl lg:text-5xl">
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
              viewport={{ once: false, amount: 0.15 }}
              variants={sectionReveal}
              ref={testimonialRef}
              className="relative mx-auto max-w-4xl"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={testimonialIndex}
                  initial={{ opacity: 0, y: 14, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.985 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden rounded-[28px] border border-white/18 bg-[#f1f4f0] text-stone-950 shadow-[0_24px_70px_rgba(0,0,0,0.18)] sm:rounded-[32px]"
                  aria-live="polite"
                >
                  <div className="relative grid min-h-[360px] md:grid-cols-[1.18fr_0.82fr]">
                    <div className="order-1 flex flex-col justify-between px-6 py-7 sm:px-9 sm:py-9 md:order-1 lg:px-12 lg:py-11">
                      <div>
                        <Quote className="h-9 w-9 fill-[#095f46]/10 text-[#095f46]" aria-hidden="true" />
                        <p className="mt-5 pr-24 text-xl font-semibold leading-[1.35] tracking-tight text-stone-950 sm:pr-32 sm:text-2xl md:pr-0 lg:text-[28px]">
                          &ldquo;{activeTestimonial.quote}&rdquo;
                        </p>
                      </div>

                      <div className="mt-8">
                        <p className="text-sm font-black text-stone-950 sm:text-base">{activeTestimonial.name}</p>
                        <p className="mt-1 text-xs font-medium text-stone-500 sm:text-sm">
                          {activeTestimonial.role} · {activeTestimonial.location}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedStory(activeTestimonial)}
                          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#095f46] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#074c38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095f46] focus-visible:ring-offset-2"
                        >
                          Read full story
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="absolute right-5 top-5 order-2 h-24 w-24 overflow-hidden rounded-2xl bg-[#dfe7e1] shadow-[0_14px_30px_rgba(9,95,70,0.16)] sm:right-8 sm:top-8 sm:h-28 sm:w-28 md:relative md:right-auto md:top-auto md:h-auto md:w-auto md:rounded-none md:shadow-none">
                      <Image
                        src={activePortrait}
                        alt={activeTestimonial.name}
                        fill
                        unoptimized
                        className="object-cover object-center"
                        sizes="(max-width: 767px) 100vw, 360px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#095f46]/12 via-transparent to-transparent md:bg-gradient-to-r md:from-[#f1f4f0] md:via-transparent md:to-transparent" />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="mt-7 flex items-center justify-center gap-4 sm:gap-5">
                <button
                  type="button"
                  onClick={() => changeTestimonial('previous')}
                  aria-label="Previous testimonial"
                  className="brand-icon-button h-10 w-10 flex-none border border-stone-200 bg-white text-stone-700 shadow-sm hover:border-[#095f46] hover:bg-[#095f46] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095f46] focus-visible:ring-offset-2"
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
                      className={`h-1.5 rounded-full transition-all duration-300 ${index === testimonialIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/35 hover:bg-white/70'}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => changeTestimonial('next')}
                  aria-label="Next testimonial"
                  className="brand-icon-button h-10 w-10 flex-none border border-stone-200 bg-white text-stone-700 shadow-sm hover:border-[#095f46] hover:bg-[#095f46] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095f46] focus-visible:ring-offset-2"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>

          {/* Read Story Modal Dialog */}
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

        {/* ========================================================================= */}
        {/* BOTTOM CALL TO ACTION — Floating Sanctuary Card */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-20 lg:py-24 relative">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.2 }}
              variants={sectionReveal}
              className="relative min-h-[390px] overflow-hidden rounded-[34px] border border-[#095F46]/15 bg-[#083f33] p-7 text-white shadow-[0_22px_70px_rgba(20,32,27,0.12)] sm:min-h-[420px] sm:p-10 lg:min-h-[430px] lg:p-12"
            >
              <Image
                src="/images/home-cta-quran.jpg"
                alt=""
                fill
                aria-hidden="true"
                className="object-cover object-[center_52%]"
                sizes="(max-width: 1024px) 100vw, 960px"
              />
              <div className="absolute inset-0 bg-[#063f33]/90" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#02120f]/98 via-[#063f33]/92 to-[#063f33]/78" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#041f19]/62 via-[#063f33]/28 to-[#041f19]/78" />
              <Image
                src="/images/ilmbit-mark-white.png"
                alt=""
                width={290}
                height={290}
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 bottom-0 w-44 select-none object-contain opacity-[0.10] sm:w-56 lg:-right-6 lg:w-64"
              />

              <div className="relative z-10 flex min-h-[326px] flex-col justify-center sm:min-h-[340px] lg:min-h-[334px]">
                <div className="max-w-[620px]">
                  <h2 className="mb-5 text-4xl font-black leading-[0.94] tracking-[-0.045em] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.38)] sm:text-5xl lg:text-6xl">
                    Begin Your Sacred Journey of Knowledge
                  </h2>
                  <p className="max-w-xl text-base leading-relaxed text-emerald-50/88 drop-shadow-[0_1px_10px_rgba(0,0,0,0.32)] sm:text-lg">
                    Tell us what you want to learn. We will use it to prepare the right scholar match and schedule.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsWaitlistOpen(true)}
                    className="brand-button brand-button-inverse mt-8 px-8"
                  >
                    <span>Join the Waitlist</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

      </div>
      <WaitlistModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
      />
    </>
  );
}
