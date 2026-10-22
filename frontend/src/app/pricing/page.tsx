'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import PublicPageHero, { publicPageFadeUp as fadeUp } from '@/components/public-page-hero';
import styles from './pricing.module.css';

interface CourseCardData {
  id: string;
  title: string;
  levelLabel: string;
  description: string;
  image: string;
  features: string[];
}

const standardCourses: CourseCardData[] = [
  {
    id: 'beginner-qaida',
    title: 'Noorani Qaida',
    levelLabel: 'Beginner Level',
    description: 'Fundamental course for beginners to learn the Arabic alphabet, letter joining, and foundational pronunciation rules.',
    image: '/images/pricing-qaida-v2.jpg',
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
    image: '/images/pricing-tajweed-v4.jpg',
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
    image: '/images/pricing-hifz-v2.jpg',
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
    image: '/images/pricing-qaida-v2.jpg',
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
    image: '/images/pricing-tajweed-v4.jpg',
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
    image: '/images/pricing-hifz-v2.jpg',
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
    a: 'Standard includes 8 sessions per month (2 per week). Fast Track includes 12 sessions per month (3 per week), replayable cloud recordings, and detailed monthly progress evaluations. Current prices are displayed with each course.',
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const [isFastTrackOpen, setIsFastTrackOpen] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaq((previous) => previous === index ? null : index);
  };

  return (
    <div className="relative min-h-screen bg-sanctuary-light text-stone-900 select-none overflow-hidden">

      {/* ========================================================================= */}
      {/* 1. HERO SECTION — Simple, Transparent Pricing                             */}
      {/* ========================================================================= */}
      <PublicPageHero
        title="Simple, Transparent Pricing"
        image="/images/pricing-hero-quran-volumes.jpg"
        imageAlt="Quran volumes with gold detailing arranged on a shelf"
        imageClassName="object-cover object-center opacity-85"
        scrollTarget="#standard-plans"
        scrollLabel="Scroll down to Standard Plans"
        overlay={<div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/60" />}
      />

      <div className={`${styles.patternBackground} pb-16 sm:pb-20 lg:pb-24`}>
      {/* Main Plans & FAQs Container with identical separation spacing */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 space-y-14 sm:space-y-16 lg:space-y-20">

        <div className="text-center"><CurrencySelector /></div>
        {/* ========================================================================= */}
        {/* SECTION 1: Standard Plans (2 Sessions / Week · Free Trial Included)       */}
        {/* ========================================================================= */}
        <section id="standard-plans" className="scroll-mt-24 space-y-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={fadeUp}
            className="text-left"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-stone-950 leading-[1.2]">
              <span>Standard Plans</span>{' '}
              <span className="text-sm sm:text-xl lg:text-2xl font-normal text-stone-500 tracking-normal whitespace-nowrap">
                (2 Sessions / Week)
              </span>
            </h2>
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
                className="group relative flex flex-col justify-between rounded-3xl overflow-hidden transition-all duration-300 bg-white border border-stone-200/80 hover:border-stone-300 shadow-[0_12px_36px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_48px_rgba(0,0,0,0.12)] hover:-translate-y-1"
              >
                {/* Full-Width Header Image Banner (matching reference design) */}
                <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-stone-900">
                  <Image
                    src={course.image}
                    alt={course.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className={`object-cover ${
                      course.id === 'advanced-hifz' ? 'object-[center_55%]' : 'object-center'
                    } transition-transform duration-500 group-hover:scale-105`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/35 to-stone-950/20" />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex flex-col justify-end">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 mb-1 drop-shadow-sm">
                      {course.levelLabel}
                    </span>
                    <h3 className="text-2xl font-bold text-white tracking-tight leading-tight drop-shadow-md">
                      {course.title}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-col flex-1 justify-between p-6 sm:p-7">
                  <div>
                    {/* Price Tag */}
                    <div className="mb-6 pb-6 border-b border-stone-100">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-black text-stone-950 tracking-tight">$59</span>
                        <span className="text-xs sm:text-sm font-medium text-stone-500">/ month</span>
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-3 mb-6">
                      {course.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm leading-relaxed text-stone-700">
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
                </div>
              </motion.div>
            ))}
          </div>

        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: Fast Track Plans (3 Sessions / Week · Direct Enrollment)       */}
        {/* ========================================================================= */}
        <section id="fast-track-plans" className="scroll-mt-24 space-y-8">
          <h2>
            <button
              type="button"
              onClick={() => setIsFastTrackOpen((open) => !open)}
              aria-expanded={isFastTrackOpen}
              aria-controls="fast-track-packages"
              className="flex w-full items-center justify-between gap-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#095F46]"
            >
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-stone-950 leading-[1.2]">Fast Track Plans</span>
                <span className="text-sm sm:text-xl lg:text-2xl font-normal text-stone-500 whitespace-nowrap">3 sessions / week</span>
              </span>
              <span className="flex shrink-0 items-center gap-3 sm:gap-5">
                <span className="text-right text-base sm:text-2xl font-bold text-[#095F46]">$89 / $89 / $89<span className="block text-xs sm:text-sm font-normal text-stone-500">per month</span></span>
                <ChevronDown aria-hidden="true" className={`h-5 w-5 sm:h-6 sm:w-6 ${isFastTrackOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>
          </h2>

          <div id="fast-track-packages" hidden={!isFastTrackOpen}>
          {isFastTrackOpen && <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {fastTrackCourses.map((course, i) => (
              <motion.div
                key={`fasttrack-${course.id}`}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                variants={fadeUp}
                transition={{ delay: i * 0.1 }}
                className="group relative flex flex-col justify-between rounded-3xl overflow-hidden transition-all duration-300 bg-white border border-stone-200/80 hover:border-emerald-500/50 shadow-[0_12px_36px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_22px_48px_rgba(9,95,70,0.16)] hover:-translate-y-1 ring-1 ring-emerald-500/15"
              >
                {/* Full-Width Header Image Banner (matching reference design) */}
                <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-stone-900">
                  <Image
                    src={course.image}
                    alt={course.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className={`object-cover ${
                      course.id === 'advanced-hifz'
                        ? 'object-[center_55%]'
                        : 'object-center'
                    } transition-transform duration-500 group-hover:scale-105`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/35 to-stone-950/20" />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex flex-col justify-end">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 mb-1 drop-shadow-sm">
                      {course.levelLabel}
                    </span>
                    <h3 className="text-2xl font-bold text-white tracking-tight leading-tight drop-shadow-md">
                      {course.title}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-col flex-1 justify-between p-6 sm:p-7">
                  <div>
                    {/* Price Tag */}
                    <div className="mb-6 pb-6 border-b border-stone-100">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-black text-[#095F46] tracking-tight">$89</span>
                        <span className="text-xs sm:text-sm font-medium text-stone-500">/ month</span>
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-3 mb-6">
                      {course.features.map((f, idx) => (
                        <li key={f} className="flex items-start gap-3 text-sm leading-relaxed text-stone-700">
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
                </div>
              </motion.div>
            ))}
          </div>}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: Collapsible FAQs Section                                       */}
        {/* ========================================================================= */}
        <section className="w-full pt-4" aria-labelledby="pricing-faq-heading">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={fadeUp}
            className="text-left mb-10"
          >
            <h2 id="pricing-faq-heading" className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-stone-950 tracking-tight leading-[1.15]">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div className="space-y-3.5">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <motion.div
                  key={faq.q}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={fadeUp}
                  transition={{ delay: i * 0.05 }}
                  className={`${styles.faqItem} ${isOpen ? styles.open : ''}`}
                >
                  <button
                    type="button"
                    id={`faq-question-${i}`}
                    onClick={() => toggleFaq(i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${i}`}
                    className={styles.question}
                  >
                    <span
                      className={styles.questionText}
                    >
                      {faq.q}
                    </span>
                    <ChevronDown aria-hidden="true" className={`${styles.chevron} ${isOpen ? styles.expandedChevron : ''}`} />
                  </button>

                  <motion.div
                    id={`faq-answer-${i}`}
                    role="region"
                    aria-labelledby={`faq-question-${i}`}
                    aria-hidden={!isOpen}
                    inert={!isOpen}
                    initial={false}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{
                      height: { duration: !reduceMotion && isOpen ? 0.6 : 0, ease: [0.22, 1, 0.36, 1] },
                      opacity: { duration: !reduceMotion && isOpen ? 0.8 : 0, ease: 'easeOut' },
                    }}
                    className={styles.answerPanel}
                  >
                    <p className={styles.answer}>{faq.a}</p>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
