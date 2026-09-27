'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Mail, MapPin } from 'lucide-react';

const footerLinks = {
  Platform: [
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Courses', href: '/#courses' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Free Trial', href: '/about#waitlist' },
  ],

  Support: [
    { label: 'About Us', href: '/about' },
    { label: 'Contact Us', href: 'mailto:support@ilmbit.com' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
};

export default function Footer() {
  const pathname = usePathname();
  const shouldHide =
    pathname.startsWith('/student') ||
    pathname.startsWith('/lecturer') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth');

  if (shouldHide) return null;
  return (
    <footer className="bg-gradient-to-br from-[#071412] via-[#0c211e] to-[#112f2a] border-t border-emerald-300/15 text-white select-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center mb-5 group" aria-label="ILMBIT home">
              <Image
                src="/images/ilmbit-logo-white.png"
                alt="ILMBIT"
                width={54}
                height={71}
                className="h-[66px] w-auto object-contain transition-transform group-hover:scale-[1.03]"
              />
            </Link>
            <p className="text-sm text-emerald-50/68 max-w-sm mb-6 leading-relaxed">
              Connecting qualified Islamic scholars with students worldwide. 
              Structured, professional, 1:1 Islamic education from the comfort of your home.
            </p>
            <div className="space-y-2 text-sm text-emerald-50/72">
              <a
                href="mailto:support@ilmbit.com"
                className="flex w-fit items-center gap-2 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 text-emerald-300/80" aria-hidden="true" />
                <span>support@ilmbit.com</span>
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-300/80" aria-hidden="true" />
                <span>Colombo, Sri Lanka</span>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-semibold text-sm mb-4 text-white">{title}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-emerald-50/62 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-emerald-50/45" suppressHydrationWarning>
            © {new Date().getFullYear()} Ilmbit. All rights reserved.
          </p>
          <p className="text-xs text-emerald-50/45 font-arabic">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
        </div>
      </div>
    </footer>
  );
}
