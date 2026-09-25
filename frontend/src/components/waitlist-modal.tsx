'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Check, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Portal } from '@/components/ui/portal';
import CountryPhoneInput from '@/components/country-phone-input';
import {
  formatInternationalPhone,
  getCountryCallingCode,
  type CountryCallingCode,
} from '@/lib/country-calling-codes';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCourse?: string;
}

export default function WaitlistModal({
  isOpen,
  onClose,
  defaultCourse = 'Tajweed Quran Recitation',
}: WaitlistModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<CountryCallingCode>(() => getCountryCallingCode('LK'));
  const [course, setCourse] = useState(defaultCourse);
  const [pace, setPace] = useState<'standard' | 'fast-track'>('standard');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;

    setIsSubmitting(true);
    const formattedPhone = formatInternationalPhone(phone, phoneCountry);

    // Simulate connection / store locally until backend email provider is connected
    try {
      const waitlistEntry = {
        fullName,
        email,
        phone: formattedPhone,
        rawPhone: phone,
        phoneCountry: phoneCountry.name,
        phoneCountryCode: phoneCountry.iso2,
        phoneDialCode: phoneCountry.dialCode,
        course,
        pace,
        notes,
        submittedAt: new Date().toISOString(),
      };
      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        const existing = JSON.parse(localStorage.getItem('ilm_waitlist_entries') || '[]');
        existing.push(waitlistEntry);
        localStorage.setItem('ilm_waitlist_entries', JSON.stringify(existing));
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    onClose();
    setTimeout(() => {
      setIsSubmitted(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setPhoneCountry(getCountryCallingCode('LK'));
      setNotes('');
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleResetAndClose}
          className="fixed inset-0 bg-stone-950/70 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-200/90"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleResetAndClose}
            className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Close waitlist modal"
          >
            <X className="w-5 h-5" />
          </button>

          {!isSubmitted ? (
            <div>
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <Image
                  src="/images/ilmbit-logo-green.png"
                  alt="ILMBIT"
                  width={40}
                  height={52}
                  className="h-[52px] w-auto flex-shrink-0 object-contain"
                />
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-950 tracking-tight">
                    Join Priority Waitlist
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Reserve your spot for 1:1 online sessions
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-stone-600 mb-6 leading-relaxed">
                Be the first to get matched with qualified scholars when new schedule slots open. Includes complimentary 30-min trial access.
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Ahmed"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#095F46]"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#095F46]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Phone / WhatsApp
                    </label>
                    <CountryPhoneInput
                      value={phone}
                      onChange={setPhone}
                      selectedIso={phoneCountry.iso2}
                      onCountryChange={setPhoneCountry}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Learning Discipline
                    </label>
                    <select
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#095F46]"
                    >
                      <option value="Noorani Qaida">Noorani Qaida (Beginner)</option>
                      <option value="Tajweed Quran Recitation">Tajweed Quran Recitation</option>
                      <option value="Hifz Memorization">Hifz Memorization (Advanced)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Preferred Pace
                    </label>
                    <select
                      value={pace}
                      onChange={(e) => setPace(e.target.value as 'standard' | 'fast-track')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#095F46]"
                    >
                      <option value="standard">Standard (2 sessions / wk)</option>
                      <option value="fast-track">Fast Track (3 sessions / wk)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Notes / Preferred Schedule (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Learning for an 8-year-old, prefer weekend mornings EST"
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 bg-stone-50/50 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#095F46]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="brand-button brand-button-primary h-12 w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Joining Priority Waitlist...</span>
                      </>
                    ) : (
                      <>
                        <span>Join Priority Waitlist</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <div className="text-[11px] text-stone-400 text-center mt-2.5">
                    No payment required. We will never share your email address.
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* Success State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 sm:py-8"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-[#095F46] shadow-inner">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              <h3 className="text-2xl font-black text-stone-950 mb-2">
                Alhamdulillah, You&apos;re on the Waitlist!
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto leading-relaxed mb-6">
                We have registered <span className="font-bold text-stone-900">{fullName}</span> for{' '}
                <span className="font-bold text-[#095F46]">{course}</span>. We will email you at{' '}
                <span className="font-semibold text-stone-900">{email}</span> as soon as your dedicated scholar match is ready.
              </p>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="brand-button bg-stone-900 px-7 text-white hover:bg-stone-800"
              >
                Close Window
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </Portal>
  );
}
