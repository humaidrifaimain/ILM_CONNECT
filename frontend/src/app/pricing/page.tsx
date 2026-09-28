'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';

const fadeUp: Variants = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

interface CourseCardData {
  id: string;
  title: string;
  levelLabel: string;
  description: string;
  features: string[];
}

const standardCourses: CourseCardData[] = [
  {
    id: 'beginner-qaida',
    title: 'Noorani Qaida',
    levelLabel: 'Beginner Level',
    description: 'Fundamental course for beginners to learn the Arabic alphabet, letter joining, and foundational pronunciation rules.',
    features: [
      '8 live 1:1 sessions per month (2/week)',
      '45-minute sessions with qualified instructor',
      'Letter recognition & Makharij rules',
      'Progress tracking dashboard',
      'Flexible rescheduling (12h notice)',
    ],
  },
  {
    id: 'intermediate-tajweed',
    title: 'Tajweed Quran Recitation',
    levelLabel: 'Intermediate Level',
    description: 'Quran recitation with proper pronunciation rules (Tajweed) and melodic rhythm for intermediate learners.',
    features: [
      '8 live 1:1 sessions per month (2/week)',
      '45-minute sessions with certified scholar',
      'Pronunciation correction & rules',
      'Progress tracking dashboard',
      'Flexible rescheduling (12h notice)',
    ],
  },
  {
    id: 'advanced-hifz',
    title: 'Hifz Memorization',
    levelLabel: 'Advanced Level',
    description: 'Advanced Quran memorization — structured memorization program with systematic revision tracking.',
    features: [
      '8 live 1:1 sessions per month (2/week)',
      '45-minute sessions with dedicated Hifz coach',
      'Structured memorization schedule',
      'Progress tracking dashboard',
      'Flexible rescheduling (12h notice)',
    ],
  },
];

const fastTrackCourses: CourseCardData[] = [
  {
    id: 'beginner-qaida',
    title: 'Noorani Qaida',
    levelLabel: 'Beginner Level · Accelerated',
    description: 'Accelerate Arabic literacy and Quran reading fluency with intensive 3x weekly live sessions and replayable recordings.',
    features: [
      '12 live 1:1 sessions per month (3/week)',
      '45-minute sessions with qualified instructor',
      'Replayable cloud session recordings included',
      'Monthly detailed progress & Tajweed report',
      'Accelerated curriculum progression',
      'Flexible rescheduling (12h notice)',
    ],
  },
  {
    id: 'intermediate-tajweed',
    title: 'Tajweed Quran Recitation',
    levelLabel: 'Intermediate Level · Accelerated',
    description: 'Master proper Tajweed rules and melodic recitation faster with 12 monthly sessions and recorded scholar feedback.',
    features: [
      '12 live 1:1 sessions per month (3/week)',
      '45-minute sessions with certified scholar',
      'Replayable cloud session recordings included',
      'Monthly detailed progress & Tajweed report',
      'Accelerated curriculum progression',
      'Flexible rescheduling (12h notice)',
    ],
  },
  {
    id: 'advanced-hifz',
    title: 'Hifz Memorization',
    levelLabel: 'Advanced Level · Accelerated',
    description: 'Intensive Quran memorization with 3 weekly sessions, daily revision accountability, and milestone progress tracking.',
    features: [
      '12 live 1:1 sessions per month (3/week)',
      '45-minute sessions with dedicated Hifz coach',
      'Replayable cloud session recordings included',
      'Monthly detailed progress & Hifz milestone report',
      'Accelerated memorization progression',
      'Flexible rescheduling (12h notice)',
    ],
  },
];

const faqs = [
  {
    q: 'Can I try before subscribing?',
    a: 'Yes! Every new student can book a free 30-minute trial session for the Standard Plan with one of our scholars across any discipline. No payment information is required to start your trial.',
  },
  {
    q: 'Why does Fast Track not offer a free trial?',
    a: 'The Fast Track plan is an intensive 12-session monthly program designed for accelerated progress, complete with cloud session recordings and monthly written reports. New students can use the Standard Plan trial to experience our scholars, and then enroll directly in Fast Track.',
  },
  {
    q: 'What is the main difference between Standard and Fast Track?',
    a: 'The Standard Plan provides 8 sessions per month (2 sessions a week) for $59. The Fast Track Plan accelerates learning with 12 sessions per month (3 sessions a week) for $89, and adds replayable cloud recordings and detailed monthly progress evaluations.',
  },
  {
    q: 'Can I switch from Standard to Fast Track later?',
    a: 'Yes, anytime! You can upgrade to Fast Track or adjust your pacing directly from your student billing dashboard at the start of any billing cycle.',
  },
  {
    q: 'How are sessions conducted?',
    a: 'All sessions are conducted via our built-in live video platform in a private 1:1 classroom with your dedicated scholar. Simply click "Join" when your session begins.',
  },
  {
    q: 'Can I change my lecturer if needed?',
    a: 'Yes! You can request a lecturer switch at any time. You will receive a trial session with the new lecturer before confirming the switch.',
  },
  {
    q: 'What is the cancellation and rescheduling policy?',
    a: 'Sessions can be rescheduled for free up to 12 hours before the start time. Subscriptions can be cancelled anytime with no long-term contracts.',
  },
];

export default function PricingPage() {
  const [openFaqs, setOpenFaqs] = useState<number[]>([]);
  const shouldReduceMotion = useReducedMotion();

  const toggleFaq = (index: number) => {
    setOpenFaqs((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="relative min-h-screen bg-sanctuary-light text-stone-900 select-none overflow-hidden pt-28 sm:pt-32 pb-16 sm:pb-20 lg:pb-24">
      {/* Background Ambience */}
      <div className="absolute top-12 -right-24 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl pointer-events-none" />
      <div className="absolute top-[35%] -left-28 h-[32rem] w-[32rem] rounded-full bg-teal-100/50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 h-80 w-80 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />

      <motion.a
        href="#fast-track-plans"
        aria-label="Scroll to Fast Track plans"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[#095F46]/20 bg-white/95 text-[#095F46] shadow-[0_10px_30px_rgba(9,95,70,0.18)] backdrop-blur transition-colors duration-200 hover:bg-[#095F46] hover:text-white sm:bottom-7 sm:right-7 sm:h-14 sm:w-14"
      >
        <motion.span
          aria-hidden="true"
          animate={shouldReduceMotion ? undefined : { y: [0, 5, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-5 w-5 stroke-[2.5] sm:h-6 sm:w-6" />
        </motion.span>
      </motion.a>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14 sm:space-y-16 lg:space-y-20">
        {/* Clean, Minimal Page Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={fadeUp}
          className="text-center max-w-3xl mx-auto"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-950 mb-3">
            Simple, Transparent Pricing
          </h1>
          <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            Choose your learning discipline and pace. Start with a foundational 8-session Standard plan, or accelerate your journey with the intensive 12-session Fast Track plan.
          </p>
        </motion.div>

        {/* ========================================================================= */}
        {/* SECTION 1: Standard Plans (2 Sessions / Week · Free Trial Included)       */}
        {/* ========================================================================= */}
        <section id="standard-plans" className="scroll-mt-24 space-y-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={fadeUp}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-2xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-stone-950 leading-[1.2] mb-2 sm:whitespace-nowrap">
              <span>Standard Plans</span>{' '}
              <span className="text-sm sm:text-xl lg:text-2xl font-normal text-stone-500 tracking-normal whitespace-nowrap">
                (2 Sessions / Week)
              </span>
            </h2>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed max-w-2xl mx-auto">
              8 live 1:1 sessions per month with qualified scholars. Steady, structured learning with a complimentary 30-minute trial session.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {standardCourses.map((course, i) => (
              <motion.div
                key={`standard-${course.id}`}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                variants={fadeUp}
                transition={{ delay: i * 0.1 }}
                className="group relative flex flex-col justify-between rounded-3xl p-7 sm:p-8 transition-all duration-200 bg-white border border-stone-200/90 hover:border-stone-300 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-lg"
              >
                <div>
                  {/* Course Title as Main Heading */}
                  <h3 className="text-xl sm:text-2xl font-black text-stone-950 tracking-tight mb-1">
                    {course.title}
                  </h3>

                  {/* Level Sub-label (Smaller Font) */}
                  <div className="mb-3 text-xs font-semibold tracking-[0.04em] text-[#095F46]">
                    {course.levelLabel}
                  </div>

                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-6 min-h-[40px]">
                    {course.description}
                  </p>

                  {/* Price Tag */}
                  <div className="mb-6 pb-6 border-b border-stone-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-stone-950 tracking-tight">$59</span>
                      <span className="text-xs sm:text-sm font-medium text-stone-500">/ month</span>
                    </div>
                    <div className="text-xs text-stone-500 mt-1 font-medium">
                      8 live 1:1 sessions · 2 sessions per week
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3 mb-6">
                    {course.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-xs sm:text-sm text-stone-700">
                        <div className="w-4.5 h-4.5 rounded-full bg-emerald-50 text-[#095F46] flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Free Trial Button for Standard Plans */}
                <div className="mt-auto pt-2">
                  <div className="text-[11px] text-stone-500 text-center mb-3">
                    Includes complimentary 30-min trial session.
                  </div>
                  <Link
                    href="/about#waitlist"
                    className="brand-button brand-button-primary w-full"
                  >
                    Join Waitlist
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: Fast Track Plans (3 Sessions / Week · Direct Enrollment)       */}
        {/* ========================================================================= */}
        <section id="fast-track-plans" className="scroll-mt-24 space-y-8 rounded-[2rem] border border-[#095F46]/10 bg-white/45 px-0 py-8 sm:px-6 sm:py-10 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={fadeUp}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-2xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-stone-950 leading-[1.2] mb-2 sm:whitespace-nowrap">
              <span>Fast Track Plans</span>{' '}
              <span className="text-sm sm:text-xl lg:text-2xl font-normal text-stone-500 tracking-normal whitespace-nowrap">
                (3 Sessions / Week)
              </span>
            </h2>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed max-w-2xl mx-auto">
              12 live 1:1 sessions per month with replayable cloud recordings and detailed monthly progress reports. Designed for intensive, rapid progress.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {fastTrackCourses.map((course, i) => (
              <motion.div
                key={`fasttrack-${course.id}`}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                variants={fadeUp}
                transition={{ delay: i * 0.1 }}
                className="group relative flex flex-col justify-between rounded-3xl p-7 sm:p-8 transition-all duration-200 bg-white border border-stone-200/90 hover:border-emerald-500/50 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-lg ring-1 ring-emerald-500/10"
              >
                <div>
                  {/* Course Title as Main Heading */}
                  <h3 className="text-xl sm:text-2xl font-black text-stone-950 tracking-tight mb-1">
                    {course.title}
                  </h3>

                  {/* Level Sub-label (Smaller Font) */}
                  <div className="mb-3 text-xs font-semibold tracking-[0.04em] text-[#095F46]">
                    {course.levelLabel}
                  </div>

                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-6 min-h-[40px]">
                    {course.description}
                  </p>

                  {/* Price Tag */}
                  <div className="mb-6 pb-6 border-b border-stone-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-[#095F46] tracking-tight">$89</span>
                      <span className="text-xs sm:text-sm font-medium text-stone-500">/ month</span>
                    </div>
                    <div className="text-xs text-stone-500 mt-1 font-medium">
                      12 live 1:1 sessions · 3 sessions per week
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3 mb-6">
                    {course.features.map((f, idx) => (
                      <li key={f} className="flex items-start gap-3 text-xs sm:text-sm text-stone-700">
                        <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          idx === 2 || idx === 3
                            ? 'bg-[#095F46] text-white shadow-xs'
                            : 'bg-emerald-50 text-[#095F46]'
                        }`}>
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                        <span className={idx === 2 || idx === 3 ? 'font-semibold text-stone-900' : ''}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Direct Enrollment Button (NO Free Trial for Fast Track) */}
                <div className="mt-auto pt-2">
                  <div className="text-[11px] text-stone-500 text-center mb-3">
                    Direct monthly subscription. Cancel anytime.
                  </div>
                  <Link
                    href="/about#waitlist"
                    className="brand-button brand-button-primary w-full"
                  >
                    Enroll in Fast Track
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: Collapsible FAQs Section                                       */}
        {/* ========================================================================= */}
        <div className="pt-4 max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={fadeUp}
            className="text-center mb-10"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-stone-950 tracking-tight leading-[1.15]">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div className="space-y-3.5">
            {faqs.map((faq, i) => {
              const isOpen = openFaqs.includes(i);
              return (
                <motion.div
                  key={faq.q}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={fadeUp}
                  transition={{ delay: i * 0.05 }}
                  className={`group rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isOpen
                      ? 'border-[#095F46]/45 bg-white shadow-[0_8px_30px_rgba(9,95,70,0.08)] ring-1 ring-[#095F46]/20'
                      : 'border-stone-200/90 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#095F46]/35 hover:shadow-[0_8px_24px_rgba(9,95,70,0.08)] hover:-translate-y-0.5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between text-left px-6 py-4.5 sm:py-5 cursor-pointer select-none transition-colors"
                  >
                    <span
                      className={`text-xs sm:text-sm font-bold tracking-tight transition-colors duration-200 ${
                        isOpen
                          ? 'text-[#095F46]'
                          : 'text-stone-900 group-hover:text-stone-950'
                      }`}
                    >
                      {faq.q}
                    </span>
                    <div
                      className={`shrink-0 ml-4 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                        isOpen
                          ? 'bg-[#095F46] text-white rotate-90 shadow-[0_2px_8px_rgba(9,95,70,0.25)]'
                          : 'bg-stone-100 text-stone-500 group-hover:bg-[#095F46]/10 group-hover:text-[#095F46] group-hover:scale-105 group-hover:translate-x-0.5'
                      }`}
                    >
                      <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="faq-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                          height: 'auto',
                          opacity: 1,
                          transition: {
                            height: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
                            opacity: { duration: 0.22, delay: 0.05 },
                          },
                        }}
                        exit={{
                          height: 0,
                          opacity: 0,
                          transition: {
                            height: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
                            opacity: { duration: 0.15 },
                          },
                        }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100/90">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
