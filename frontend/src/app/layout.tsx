import type { Metadata } from 'next';
import { Manrope, Amiri, Poppins } from 'next/font/google';
import './globals.css';
import './color-refresh.css';
import { Providers } from '@/lib/providers';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const amiri = Amiri({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-amiri',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Ilmbit — Online Islamic Education Platform',
    template: '%s | Ilmbit',
  },
  description:
    'Connect with qualified Islamic scholars for personalized 1:1 Quran, Hadith, Fiqh, and Arabic lessons. Structured learning from the comfort of your home.',
  keywords: [
    'Islamic education',
    'online Quran classes',
    'Quran teacher',
    'Hadith studies',
    'Fiqh',
    'Arabic language',
    'Islamic tutor',
    'Hifz program',
    'Tajweed',
    'Muslim education',
  ],
  authors: [{ name: 'Ilmbit' }],
  openGraph: {
    title: 'Ilmbit — Online Islamic Education Platform',
    description: 'Connect with qualified Islamic scholars for personalized 1:1 lessons.',
    siteName: 'Ilmbit',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${amiri.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-white text-stone-900 min-h-screen" suppressHydrationWarning>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
