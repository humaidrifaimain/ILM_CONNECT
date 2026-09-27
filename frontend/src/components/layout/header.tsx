'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/pricing', label: 'Pricing' },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isDarkHero = pathname === '/' || pathname === '/about';

  useEffect(() => {
    const handleScroll = () => {
      // Smooth transition to floating pill navbar when scrolling past 30px
      setScrolled(window.scrollY > 30);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const shouldHideHeader =
    pathname.startsWith('/student') ||
    pathname.startsWith('/lecturer') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth');

  if (shouldHideHeader) return null;

  // When not scrolled, pages with dark hero (Home & About) use white text/logo, while light pages use green/dark styling
  const showWhiteNav = !scrolled && isDarkHero;

  return (
    <div className="fixed top-4 sm:top-5 inset-x-0 z-50 flex flex-col items-center px-4 sm:px-6 lg:px-12 pointer-events-none">
      {/* Floating Liquid Glass Pill Navbar (Transparent at top, rounded white pill on scroll across all pages) */}
      <header
        style={
          scrolled
            ? {
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
              }
            : {
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                backgroundColor: 'transparent',
              }
        }
        className={`pointer-events-auto grid w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center rounded-full px-5 transition-all duration-300 sm:px-7 ${
          scrolled
            ? 'min-h-[62px] border border-white/90 shadow-[0_12px_36px_rgba(0,0,0,0.10),0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_1.5px_rgba(255,255,255,1)] sm:min-h-[64px]'
            : 'min-h-[66px] border border-transparent shadow-none sm:min-h-[68px]'
        }`}
      >
        <Link href="/" className="col-start-1 row-start-1 flex items-center justify-self-start" aria-label="ILMBIT home">
          <Image
            src={showWhiteNav ? '/images/ilmbit-logo-white.png' : '/images/ilmbit-logo-green.png'}
            alt="ILMBIT"
            width={56}
            height={74}
            className={`w-auto object-contain transition-all duration-300 ${
              scrolled ? 'h-[44px] sm:h-[48px]' : 'h-[52px] sm:h-[56px]'
            }`}
            priority
          />
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="col-start-2 row-start-1 hidden h-11 items-center gap-8 justify-self-center md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            let linkColorClass = '';
            if (showWhiteNav) {
              linkColorClass = isActive
                ? 'font-bold text-[#10BF8D]'
                : 'font-semibold text-white/80 hover:text-white';
            } else if (scrolled) {
              linkColorClass = isActive
                ? 'font-bold text-[#095F46]'
                : 'font-semibold text-stone-600 hover:text-stone-950';
            } else {
              // Transparent on light page
              linkColorClass = isActive
                ? 'font-bold text-[#095F46]'
                : 'font-semibold text-stone-700 hover:text-stone-950';
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex h-11 items-center text-sm tracking-[-0.01em] transition-colors ${linkColorClass}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="col-start-3 row-start-1 hidden items-center justify-self-end md:flex">
          <Link
            href="/about#waitlist"
            className="brand-button brand-button-primary min-h-10 px-5 text-[13px]"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className={`brand-icon-button col-start-3 row-start-1 justify-self-end transition-colors md:hidden ${
            showWhiteNav
              ? 'text-white/80 hover:bg-white/10 hover:text-white'
              : 'text-stone-800 hover:bg-stone-100/80'
          }`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Dropdown Menu with Glass Effect */}
      {mobileOpen && (
        <div
          style={
            showWhiteNav
              ? {
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  backgroundColor: 'rgba(12, 16, 15, 0.95)',
                }
              : {
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  backgroundColor: 'rgba(255, 255, 255, 0.96)',
                }
          }
          className={`pointer-events-auto w-full max-w-7xl mt-2 rounded-2xl border shadow-xl p-4 md:hidden animate-fade-in ${
            showWhiteNav ? 'border-stone-800 text-white' : 'border-white/90 text-stone-900'
          }`}
        >
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              let itemClass = '';
              if (showWhiteNav) {
                itemClass = isActive
                  ? 'text-emerald-400 bg-emerald-950/80 font-bold'
                  : 'text-stone-300 hover:text-white hover:bg-white/10';
              } else {
                itemClass = isActive
                  ? 'text-stone-950 bg-stone-200/60 font-bold'
                  : 'text-stone-700 hover:bg-stone-100/70';
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${itemClass}`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div
              className={`pt-3 mt-2 border-t ${
                showWhiteNav ? 'border-stone-800' : 'border-stone-200/60'
              }`}
            >
              <Link
                href="/about#waitlist"
                onClick={() => setMobileOpen(false)}
                className="brand-button brand-button-primary w-full"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
