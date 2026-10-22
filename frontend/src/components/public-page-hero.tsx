'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

export const publicPageFadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

interface PublicPageHeroProps {
  title: string;
  subtitle?: string;
  image: string;
  imageAlt: string;
  imageClassName: string;
  overlay: ReactNode;
  scrollTarget: string;
  scrollLabel: string;
}

export default function PublicPageHero({
  title,
  subtitle,
  image,
  imageAlt,
  imageClassName,
  overlay,
  scrollTarget,
  scrollLabel,
}: PublicPageHeroProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative min-h-[50vh] sm:min-h-[54vh] lg:min-h-[58vh] flex flex-col justify-between overflow-hidden bg-stone-950 text-white select-none">
      <div className="absolute inset-0 z-0">
        <Image src={image} alt={imageAlt} fill priority sizes="100vw" className={imageClassName} />
        {overlay}
      </div>

      <div className="w-full h-16 sm:h-20 shrink-0 pointer-events-none" aria-hidden="true" />

      <motion.div
        initial={shouldReduceMotion ? false : 'hidden'}
        animate="visible"
        variants={publicPageFadeUp}
        className="relative z-20 mt-auto pb-8 sm:pb-12 pt-6 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center"
      >
        <div className="relative mx-auto max-w-4xl w-full">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-snug drop-shadow-md max-w-3xl mx-auto font-heading">
            <span className="block">{title}</span>
            <span aria-hidden={!subtitle || undefined} className="block text-[#EAD08A] font-semibold text-xl sm:text-3xl lg:text-[34px] mt-1.5">
              {subtitle || '\u00a0'}
            </span>
          </h1>

          <a
            href={scrollTarget}
            aria-label={scrollLabel}
            className="group mx-auto mt-8 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white shadow-sm backdrop-blur-sm transition-colors duration-200 hover:border-white/60 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <ChevronDown aria-hidden="true" className="block h-5 w-5 shrink-0 transition-transform duration-200 motion-safe:group-hover:translate-y-0.5" />
          </a>
        </div>
      </motion.div>

      <div className="relative z-20 pb-2" aria-hidden="true" />
    </section>
  );
}
