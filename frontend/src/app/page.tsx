'use client';

import { useState } from 'react';
import { useSubscriptionPlans } from '@/lib/subscription-plans';
import { CurrencySelector, usePricingCurrency } from '@/lib/pricing-currency';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronRight,
  Check,
} from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
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

const revealViewport = {
  once: true,
  amount: 0.22,
  margin: '0px 0px -12% 0px',
} as const;

export default function HomePage() {
  const { data: plans = [] } = useSubscriptionPlans();
  const { format } = usePricingCurrency();
  const price = (id: string) => { const plan = plans.find(item => item.id === id); return plan ? format(plan) : 'Price unavailable'; };
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
      {/* 1. HERO SECTION — Single Image with Left-Aligned Typography & Logo Alignment */}
      {/* ========================================================================= */}
      <section className="home-hero-section relative flex flex-col justify-between overflow-hidden bg-stone-950 text-white select-none">
        {/* Background Single Image — Student Reciting Holy Quran */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-stone-950">
          <Image
            src="/home images/test24.png"
            alt="Student reciting Holy Quran in mosque"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[75%_center] sm:object-center"
          />

          {/* Angelic aesthetic warm golden filter & divine atmospheric radiance */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-soft-light opacity-75"
            style={{
              background:
                'linear-gradient(135deg, rgba(245, 222, 160, 0.45) 0%, rgba(220, 180, 85, 0.25) 45%, rgba(180, 135, 45, 0.35) 100%)',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none mix-blend-screen opacity-35"
            style={{
              background:
                'radial-gradient(ellipse 85% 55% at 50% 12%, rgba(255, 248, 220, 0.55) 0%, rgba(234, 208, 138, 0.25) 50%, transparent 100%)',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none mix-blend-color opacity-20"
            style={{ backgroundColor: '#D4AF37' }}
          />

          {/* Cinematic Black Vignette Effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 95% 85% at 50% 50%, transparent 20%, rgba(0, 0, 0, 0.50) 65%, rgba(0, 0, 0, 0.90) 100%)',
            }}
          />
          {/* Left-side dark gradient for enhanced contrast & readability of left-aligned typography */}
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/85 via-stone-950/45 to-transparent pointer-events-none" />
          {/* Subtle top & bottom edge darkening for clean cinematic framing & navbar / marquee contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/70 via-transparent to-stone-950/80 pointer-events-none" />
        </div>

        {/* Top spacer for fixed header alignment */}
        <div className="w-full h-16 sm:h-20 shrink-0 pointer-events-none" aria-hidden="true" />

        {/* Left-Aligned Hero Content — Exactly aligned to Header Logo */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-20 my-auto w-full px-4 sm:px-6 lg:px-12 flex flex-col items-center py-8 sm:py-12"
        >
          <div className="w-full max-w-7xl px-5 sm:px-7">
            <div className="max-w-2xl lg:max-w-3xl flex flex-col items-start text-left">
              {/* 3-Line Triangle Format Headline (Short peak -> Medium -> Long base in 1 line) */}
              <h1 className="text-[28px] sm:text-[34px] md:text-[40px] lg:text-[48px] xl:text-[52px] font-bold tracking-tight text-white leading-[1.12] drop-shadow-[0_2px_10px_rgba(0,0,0,0.40)] font-bricolage text-left">
                <span className="block text-white">Learn Quran</span>
                <span className="block text-white mt-1 sm:mt-1.5">&amp; Islamic Studies</span>
                <span className="block text-[#EAD08A] mt-2 sm:mt-2.5 text-[20px] sm:text-[25px] md:text-[30px] lg:text-[35px] xl:text-[38px] font-semibold tracking-tight whitespace-nowrap">
                  from Qualified Scholars Worldwide
                </span>
              </h1>

              {/* Dual Pill CTA Buttons with thinned font */}
              <div className="mt-8 sm:mt-11 flex flex-wrap items-center justify-start gap-3.5 sm:gap-4">
                <Link
                  href="#courses"
                  className="brand-button brand-button-inverse px-8 py-3 text-sm sm:text-base !font-light tracking-wide shadow-lg shadow-black/40"
                >
                  View Courses
                </Link>
                <Link
                  href="/about#waitlist"
                  className="brand-button brand-button-primary px-8 py-3 text-sm sm:text-base !font-light tracking-wide shadow-lg shadow-black/40"
                >
                  Join the Waitlist
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* Bottom Green Fat Line Marquee — Infinite Seamless Scroll to Waitlist */}
        {/* ========================================================================= */}
        <Link
          href="/about#waitlist"
          className="hero-bottom-marquee group relative z-30 w-full !rounded-none rounded-none bg-[#095F46] hover:bg-[#074D38] border-t border-emerald-400/25 text-white py-3 sm:py-3.5 overflow-hidden flex items-center transition-colors duration-200 shadow-[0_-4px_25px_rgba(0,0,0,0.5)] cursor-pointer shrink-0"
          aria-label="Join the waitlist and get 20% off"
        >
          <div className="flex w-full overflow-hidden select-none">
            <div className="animate-hero-marquee flex items-center whitespace-nowrap shrink-0">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-6 sm:gap-8 mx-4 sm:mx-6 shrink-0">
                  <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white drop-shadow-sm flex items-center gap-2">
                    <span>Join The Waitlist &amp; Get 20% Off</span>
                    <span className="text-emerald-200 group-hover:translate-x-0.5 transition-transform">→</span>
                  </span>
                  <span className="text-[#EAD08A] text-xs sm:text-sm" aria-hidden="true">✦</span>
                  <span className="text-xs sm:text-sm font-medium tracking-wide uppercase text-emerald-100/90">
                    Limited Early Access Offer
                  </span>
                  <span className="text-[#EAD08A] text-xs sm:text-sm" aria-hidden="true">✦</span>
                </div>
              ))}
            </div>
            <div className="animate-hero-marquee flex items-center whitespace-nowrap shrink-0" aria-hidden="true">
              {[...Array(8)].map((_, i) => (
                <div key={`dup-${i}`} className="flex items-center gap-6 sm:gap-8 mx-4 sm:mx-6 shrink-0">
                  <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white drop-shadow-sm flex items-center gap-2">
                    <span>Join The Waitlist &amp; Get 20% Off</span>
                    <span className="text-emerald-200 group-hover:translate-x-0.5 transition-transform">→</span>
                  </span>
                  <span className="text-[#EAD08A] text-xs sm:text-sm" aria-hidden="true">✦</span>
                  <span className="text-xs sm:text-sm font-medium tracking-wide uppercase text-emerald-100/90">
                    Limited Early Access Offer
                  </span>
                  <span className="text-[#EAD08A] text-xs sm:text-sm" aria-hidden="true">✦</span>
                </div>
              ))}
            </div>
          </div>
        </Link>
      </section>

      {/* ========================================================================= */}
      {/* LIGHT-THEMED SANCTUARY CONTAINER (Animated Gradient & Ambient Glow) */}
      {/* ========================================================================= */}
      <div className="relative bg-sanctuary-light overflow-hidden text-stone-900 select-none">
        {/* Ambient floating glow orbs matching green + aesthetic warm yellowish sanctuary palette */}
        <div className="absolute top-[3%] -right-[15%] w-[650px] h-[650px] rounded-full bg-[#095F46]/10 blur-[140px] animate-ambient-orb-1 pointer-events-none" />
        <div className="absolute top-[26%] -left-[15%] w-[600px] h-[600px] rounded-full bg-[#EAD08A]/15 blur-[130px] animate-ambient-orb-2 pointer-events-none" />
        <div className="absolute top-[50%] -right-[12%] w-[700px] h-[700px] rounded-full bg-[#EAD08A]/12 blur-[140px] animate-ambient-orb-1 pointer-events-none" />
        <div className="absolute top-[75%] -left-[14%] w-[650px] h-[650px] rounded-full bg-[#095F46]/10 blur-[130px] animate-ambient-orb-2 pointer-events-none" />

        {/* ========================================================================= */}
        {/* 2. WHY ILMBIT / MISSION SECTION — Reference-Style Content & Stats */}
        {/* ========================================================================= */}
        <section
          id="mission"
          suppressHydrationWarning
          className="relative z-20 overflow-hidden border-b border-stone-200/60 py-16 select-none sm:py-20 lg:py-24"
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              {/* Left Column: Mission & Core Value */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={revealViewport}
                variants={sectionReveal}
                className="flex flex-col justify-center lg:col-span-6"
              >
                <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-stone-950 leading-[1.18] font-bricolage" suppressHydrationWarning>
                  <span>Grow In Sacred Knowledge So You Can </span>
                  <span className="block text-[#095F46]">Live With Purpose &amp; Iman</span>
                </h2>

                <p className="mt-5 text-sm sm:text-base font-normal leading-relaxed text-stone-600">
                  Finding verified, authentic Islamic teachers who can guide your family with patience and consistency shouldn&apos;t be difficult. Ilmbit bridges Sri Lankan families living abroad directly with qualified scholars for structured 1:1 online learning tailored to your timezone and personal pace.
                </p>

                <div className="mt-7 space-y-3.5">
                  {[
                    { title: 'Personalized 1:1 Learning Paths', desc: 'From Noorani Qaida phonetics to advanced Sanad Tajweed' },
                    { title: 'Verified Scholars & Certified Maulavis', desc: 'Rigorous vetting with verified Sanad and English fluency' },
                    { title: 'Sri Lankan Families Living Abroad', desc: 'Flexible 1:1 rescheduling across UK, Middle East, Australia & overseas timezones' },
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#095F46]/10 text-[#095F46] mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-[15px] font-bold tracking-tight text-stone-900">
                          {feature.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-stone-500 font-normal">
                          {feature.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    href="/about"
                    className="brand-button brand-button-primary px-7 py-3 text-xs tracking-wider uppercase !font-light inline-flex items-center gap-2 group"
                  >
                    <span>Learn More</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </motion.div>

              {/* Right Column: High-Fidelity Scholar Teaching Visual with Floating Badges */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={revealViewport}
                variants={sectionReveal}
                className="relative lg:col-span-6 flex justify-center"
              >
                <div className="relative w-full max-w-lg lg:max-w-none">
                  {/* Subtle warm golden background glow */}
                  <div className="absolute -inset-4 bg-gradient-to-tr from-[#095F46]/10 via-[#EAD08A]/20 to-transparent rounded-[36px] blur-2xl -z-10" />

                  {/* Main Image Frame - Clean & aesthetic with no tags or bars */}
                  <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden border border-stone-200/90 shadow-[0_20px_50px_rgba(9,95,70,0.08)] bg-stone-100">
                    <Image
                      src="/images/why-ilm-scholar.jpg"
                      alt="Verified Islamic scholar conducting 1:1 online Quran recitation lesson"
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover object-center"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
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

            <div className="mb-6 text-center"><CurrencySelector /></div>
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
                      {price('beginner-qaida-standard')}
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
                    <div className="rounded-2xl bg-[#FCF8EE] border border-[#EAD08A]/60 p-3 sm:p-3.5 flex flex-col gap-2">
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
                      {price('intermediate-tajweed-standard')}
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
                    <div className="rounded-2xl bg-[#FCF8EE] border border-[#EAD08A]/60 p-3 sm:p-3.5 flex flex-col gap-2">
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
                      {price('advanced-hifz-standard')}
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
                    <div className="rounded-2xl bg-[#FCF8EE] border border-[#EAD08A]/60 p-3 sm:p-3.5 flex flex-col gap-2">
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
        <div className="absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-[#EAD08A]/20 blur-3xl pointer-events-none" />

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
