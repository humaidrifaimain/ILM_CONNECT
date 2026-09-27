'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useInView, useReducedMotion } from 'framer-motion';
import styles from './how-it-works.module.css';

const howItWorksSteps = [
  {
    num: '1',
    title: 'Create Your Account',
    desc: 'Register in under 2 minutes, personalize your student profile, and begin your Islamic learning journey.',
    image: '/images/how-it-works-step-1-v7.jpg',
    imageAlt: 'Ilmbit student account registration on laptop screen',
    buttonText: 'Get Started',
    buttonLink: '/about#waitlist',
  },
  {
    num: '2',
    title: 'Choose Course Plan',
    desc: 'Select your learning path from beginner Qaida to Tajweed, with flexible Standard or Fast Track 1:1 plans.',
    image: '/images/how-it-works-step-2-v7.jpg',
    imageAlt: 'Ilmbit course plans and pricing on laptop screen',
    buttonText: 'View Plans',
    buttonLink: '#courses',
  },
  {
    num: '3',
    title: 'Get Matched With Scholar',
    desc: 'Our academic team reviews your goals to pair you with an ideal verified, Sanad-certified Islamic scholar.',
    image: '/images/how-it-works-step-3-v7.jpg',
    imageAlt: 'Academic team matches student with verified Islamic scholar on Ilmbit laptop screen',
    buttonText: 'How Matching Works',
    buttonLink: '/about',
  },
  {
    num: '4',
    title: 'Start 1:1 Learning',
    desc: 'Attend interactive 1:1 online sessions with your scholar, practicing Quran recitation with Tajweed correction.',
    image: '/images/how-it-works-step-4-v4.jpg',
    imageAlt: 'Student actively learning Quran 1:1 online with certified scholar on laptop screen',
    buttonText: 'Join Classroom',
    buttonLink: '/about#waitlist',
  },
];

const STEP_DURATION = 5000;

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { amount: 0.25 });
  const reducedMotion = useReducedMotion();
  const playing = inView && !paused && !keyboardFocused && !reducedMotion;
  const currentStep = howItWorksSteps[activeStep];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setActiveStep((current) => (current + 1) % howItWorksSteps.length);
    }, STEP_DURATION);
    return () => window.clearTimeout(timer);
  }, [activeStep, playing]);

  return (
    <div
      ref={containerRef}
      className={styles.guide}
      role="region"
      aria-label="Four steps to start learning"
      aria-roledescription="carousel"
      onFocusCapture={(event) => {
        if (event.target.matches(':focus-visible')) setKeyboardFocused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocused(false);
      }}
    >
      <div className={styles.layout}>
        {howItWorksSteps.map((step, index) => (
          <button
            key={step.num}
            type="button"
            className={styles.step}
            data-active={activeStep === index}
            aria-pressed={activeStep === index}
            aria-controls="how-it-works-picture"
            onClick={() => setActiveStep(index)}
          >
            <span className={styles.stepTop}>
              <span className={styles.number}>{step.num}</span>
              <span className={styles.activeLabel}>{activeStep === index ? 'Active step' : 'Step ' + step.num}</span>
            </span>
            <span className={styles.title}>{step.title}</span>
            <span className={styles.description}>{step.desc}</span>
          </button>
        ))}
        <div id="how-it-works-picture" className={styles.picture}>
          {howItWorksSteps.map((step, index) => (
            <Image
              key={step.num}
              src={step.image}
              alt={activeStep === index ? step.imageAlt : ''}
              aria-hidden={activeStep !== index}
              fill
              sizes="(max-width: 767px) 92vw, (max-width: 1023px) 45vw, 480px"
              className={styles.image}
              data-active={activeStep === index}
            />
          ))}
          <div className={styles.caption} aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
            <div key={currentStep.num} className={styles.captionContent}>
              <span className={styles.counter}>Step {currentStep.num} of 4</span>
              <Link href={currentStep.buttonLink} className={styles.link}>
                {currentStep.buttonText}<span aria-hidden="true"> →</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.controls}>
        <span>{reducedMotion ? 'Select a step to explore' : 'Steps advance automatically'}</span>
        {!reducedMotion && (
          <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
            {paused ? 'Resume autoplay' : 'Pause autoplay'}
          </button>
        )}
      </div>
    </div>
  );
}
