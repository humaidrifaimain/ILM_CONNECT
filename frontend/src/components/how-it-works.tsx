'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, BookOpen, ShieldCheck, Video, ArrowRight } from 'lucide-react';

const steps = [
  {
    step: '01',
    title: 'Create Student Profile',
    desc: 'Register in 2 minutes. Tell us your goals, Arabic reading level, and preferred weekly schedule.',
    icon: UserPlus,
    image: '/images/how-it-works-step-1-v7.jpg',
    imageAlt: 'Ilmbit student profile registration on laptop screen',
    badge: 'Quick 2-Min Setup',
    ctaText: 'Get Started',
    ctaLink: '/about#waitlist',
  },
  {
    step: '02',
    title: 'Select Course Plan',
    desc: 'Choose from Noorani Qaida phonetics, Tajweed Recitation, or intensive Hifz memorization.',
    icon: BookOpen,
    image: '/images/how-it-works-step-2-v7.jpg',
    imageAlt: 'Ilmbit course plans and transparent monthly pricing',
    badge: 'Standard & Fast-Track',
    ctaText: 'View Course Plans',
    ctaLink: '#courses',
  },
  {
    step: '03',
    title: 'Match With Scholar',
    desc: 'Our academic team pairs you with a verified, Sanad-certified Islamic scholar tailored to your timezone.',
    icon: ShieldCheck,
    image: '/images/how-it-works-step-3-v7.jpg',
    imageAlt: 'Academic team matching student with certified scholar',
    badge: 'Sanad Verified',
    ctaText: 'About Our Vetting',
    ctaLink: '/about',
  },
  {
    step: '04',
    title: 'Live 1:1 Sacred Sessions',
    desc: 'Attend interactive live video classes with Tajweed correction, milestone tracking, and session recordings.',
    icon: Video,
    image: '/images/how-it-works-step-4-v4.jpg',
    imageAlt: 'Interactive 1:1 Quran recitation lesson on laptop screen',
    badge: 'Live Interactive Video',
    ctaText: 'Join Classroom',
    ctaLink: '/about#waitlist',
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const current = steps[activeStep];
  const IconComponent = current.icon;

  return (
    <div className="w-full">
      {/* 4 Clean Progressive Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8 sm:mb-12">
        {steps.map((item, index) => {
          const isActive = activeStep === index;
          const Icon = item.icon;
          return (
            <button
              key={item.step}
              type="button"
              onClick={() => setActiveStep(index)}
              className={`text-left rounded-3xl p-5 sm:p-6 transition-all duration-300 relative cursor-pointer border ${
                isActive
                  ? 'bg-white border-[#095F46] shadow-[0_12px_32px_rgba(9,95,70,0.10)] ring-2 ring-[#095F46]/20'
                  : 'bg-white/80 hover:bg-white border-stone-200/80 hover:border-stone-300 hover:shadow-md'
              }`}
            >
              {/* Top row: Number & Icon */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex items-center justify-center font-bold text-xs tracking-wider px-2.5 py-1 rounded-full ${
                    isActive
                      ? 'bg-[#095F46] text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  STEP {item.step}
                </span>
                <div
                  className={`h-9 w-9 rounded-2xl flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-[#095F46]/10 text-[#095F46]'
                      : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              {/* Title & Desc */}
              <h3 className="text-base sm:text-lg font-bold text-stone-950 font-bricolage mb-1.5 leading-snug">
                {item.title}
              </h3>
              <p className="text-xs sm:text-[13px] text-stone-500 font-normal leading-relaxed">
                {item.desc}
              </p>

              {/* Active gold accent indicator */}
              {isActive && (
                <div className="absolute -bottom-[2px] left-8 right-8 h-[3px] bg-gradient-to-r from-[#095F46] via-[#EAD08A] to-[#095F46] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Interactive Live Classroom / Platform Showcase Container */}
      <div className="relative rounded-3xl overflow-hidden border border-stone-200/90 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-4 sm:p-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Laptop Screen Preview */}
          <div className="lg:col-span-8 order-2 lg:order-1">
            <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-stone-200 bg-stone-950 shadow-inner">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.image}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  <Image
                    src={current.image}
                    alt={current.imageAlt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 65vw"
                    className="object-cover object-top"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Step Details & Action */}
          <div className="lg:col-span-4 order-1 lg:order-2 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FCF8EE] border border-[#EAD08A]/60 text-[#855B14] text-[11px] font-bold uppercase tracking-wider mb-3 w-fit">
              <span>{current.badge}</span>
            </div>

            <div className="text-3xl sm:text-4xl font-black text-[#095F46] font-bricolage mb-2">
              {current.step}
            </div>

            <h4 className="text-xl sm:text-2xl font-bold text-stone-950 font-bricolage mb-3 leading-snug">
              {current.title}
            </h4>

            <p className="text-sm text-stone-600 leading-relaxed font-normal mb-6">
              {current.desc}
            </p>

            <Link
              href={current.ctaLink}
              className="brand-button brand-button-primary w-fit px-6 text-xs tracking-wider uppercase !font-light"
            >
              <span>{current.ctaText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
