import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that apply when using the Ilmbit education platform.',
};

const bulletClass = 'list-disc space-y-2 pl-5 marker:text-[#095F46]';

const sections = [
  {
    title: 'Agreement to these terms',
    content: (
      <p>
        These Terms of Service (“Terms”) are an agreement between you and Ilmbit (“Ilmbit”, “we”, “us”, or “our”). They govern your access to our website, accounts, live lessons, messaging, learning materials, subscriptions, and related services (together, the “Service”). By creating an account, purchasing a plan, or using the Service, you agree to these Terms and our Privacy Policy.
      </p>
    ),
  },
  {
    title: 'Who may use Ilmbit',
    content: (
      <>
        <p>
          You must be legally able to enter into this agreement. If the learner is under 18, a parent or legal guardian must create or authorise the account, agree to these Terms on the learner’s behalf, supervise use of the Service, and be responsible for payments and account activity.
        </p>
        <p>
          You must provide accurate information and promptly update it. We may request reasonable information to verify an account, a guardian’s authority, or a scholar’s qualifications.
        </p>
      </>
    ),
  },
  {
    title: 'Accounts and security',
    content: (
      <ul className={bulletClass}>
        <li>Keep your password and access links confidential and do not share an account except with an authorised parent or guardian.</li>
        <li>Tell us immediately if you suspect unauthorised use or a security incident.</li>
        <li>You are responsible for activity carried out through your account unless caused by Ilmbit’s failure to use reasonable security.</li>
        <li>Do not impersonate another person, create misleading accounts, or bypass access restrictions.</li>
      </ul>
    ),
  },
  {
    title: 'The education service',
    content: (
      <>
        <p>
          Ilmbit provides a platform for one-to-one Islamic education, course materials, scholar matching, scheduling, progress tracking, support, and related features. Course content, scholar availability, lesson times, and features may change as the Service develops.
        </p>
        <p>
          We aim to match learners appropriately, but we do not guarantee a particular scholar, learning outcome, examination result, certification, or uninterrupted availability. Educational and religious explanations may reflect recognised scholarly differences. The Service is educational and does not provide legal, medical, financial, or individually binding religious rulings.
        </p>
      </>
    ),
  },
  {
    title: 'Bookings, attendance, and rescheduling',
    content: (
      <>
        <ul className={bulletClass}>
          <li>Lesson length, frequency, and included features are shown in the selected plan or booking confirmation.</li>
          <li>Unless a different rule is shown when booking, a lesson may be rescheduled without charge at least 12 hours before its start time.</li>
          <li>Late cancellations, missed lessons, or late arrival may count as a used session. If a scholar or Ilmbit cancels, we will offer a reasonable replacement or account credit.</li>
          <li>You are responsible for a suitable device, internet connection, camera or microphone permissions, and a safe learning environment.</li>
        </ul>
        <p>
          Any specific terms displayed with a plan, trial, promotion, or booking form part of these Terms and control if they conflict with this general section.
        </p>
      </>
    ),
  },
  {
    title: 'Plans, payments, and cancellation',
    content: (
      <>
        <p>
          Prices, currency, taxes, billing frequency, trial conditions, and included sessions are shown before purchase. By starting a paid subscription, you authorise the applicable payment provider to charge the stated recurring amount until cancellation. Exchange rates or bank fees may affect the final amount charged by your provider.
        </p>
        <p>
          You may cancel a subscription through the available account or support process. Unless the offer says otherwise, cancellation stops future renewal and access continues until the end of the paid billing period. Fees already paid are non-refundable except where the purchase terms state otherwise, Ilmbit cannot provide the paid Service, or applicable law requires a refund. Cancelling a subscription does not automatically delete your account.
        </p>
        <p>
          We may change prices or plan features with advance notice. A change will apply from a future renewal date, and you may cancel before it takes effect.
        </p>
      </>
    ),
  },
  {
    title: 'Free trials and promotions',
    content: (
      <p>
        A free trial or promotion is subject to the eligibility, duration, and plan terms shown with the offer. We may limit one trial per learner or household and may withdraw or correct an offer where it is misused or published in error. We will not charge for a trial unless you are clearly told that it converts to a paid plan and you provide the required payment authorisation.
      </p>
    ),
  },
  {
    title: 'Acceptable use and safeguarding',
    content: (
      <>
        <p>You must not:</p>
        <ul className={bulletClass}>
          <li>harass, threaten, exploit, discriminate against, or share inappropriate content with a learner, scholar, staff member, or other user;</li>
          <li>seek unnecessary personal contact with a child or move child-related communications outside approved channels without the parent’s or guardian’s knowledge and Ilmbit’s permission;</li>
          <li>record, photograph, copy, or distribute a lesson or another person’s information without proper notice and permission;</li>
          <li>upload malware, interfere with the Service, probe security, scrape content, or use the Service for unlawful, fraudulent, or commercial solicitation purposes; or</li>
          <li>misuse learning materials or another person’s intellectual property.</li>
        </ul>
        <p>
          Report urgent safeguarding or conduct concerns to <a className="font-bold text-[#095F46] underline-offset-4 hover:underline" href="mailto:support@ilmbit.com">support@ilmbit.com</a>. If someone is in immediate danger, contact the appropriate local emergency or child-protection authority first.
        </p>
      </>
    ),
  },
  {
    title: 'Lesson recordings and communications',
    content: (
      <p>
        Some plans may include lesson recordings. Where recording applies, Ilmbit will provide notice and use recordings for learner access, quality, safety, support, or dispute handling as described in our Privacy Policy. You may not independently record or distribute lessons without the consent of all affected adults and, for a child, the parent or guardian. Messages and support communications may be retained for service, safety, and record-keeping purposes.
      </p>
    ),
  },
  {
    title: 'Content and intellectual property',
    content: (
      <>
        <p>
          Ilmbit and its licensors own the Service, brand, software, page design, and Ilmbit-provided course materials. We give you a limited, personal, non-exclusive, non-transferable right to use them for your own learning while your account is permitted to access the Service. You may not sell, publish, reproduce, or create a competing resource from them without written permission.
        </p>
        <p>
          You retain ownership of original content you upload or submit. You give Ilmbit a limited licence to host, copy, display, and share that content only as needed to operate, secure, and improve the Service and fulfil your requests. You confirm that you have the rights needed to submit it.
        </p>
      </>
    ),
  },
  {
    title: 'Third-party services',
    content: (
      <p>
        The Service may depend on third parties for payments, live video, file storage, email, WhatsApp, hosting, or other functions. Their separate terms may apply when you use their services. Ilmbit is not responsible for a third-party service outside our reasonable control, but this does not limit any responsibility that cannot lawfully be excluded.
      </p>
    ),
  },
  {
    title: 'Suspension and termination',
    content: (
      <p>
        You may stop using Ilmbit at any time. We may restrict or suspend access where reasonably necessary to protect a child or another person, investigate misuse, secure the Service, address non-payment, comply with law, or enforce these Terms. We may terminate an account for serious or repeated breaches. Where appropriate, we will give notice and an opportunity to respond. Provisions intended to survive termination, including payment obligations, intellectual property, disclaimers, and dispute terms, will continue to apply.
      </p>
    ),
  },
  {
    title: 'Service availability and disclaimers',
    content: (
      <p>
        We use reasonable care and skill in providing the Service. However, internet and live-video services may experience delays, interruptions, or errors, and we cannot promise that every feature will always be available or completely secure. To the maximum extent permitted by law, the Service is otherwise provided on an “as available” basis. Nothing in these Terms excludes warranties, remedies, or consumer rights that applicable law does not allow us to exclude.
      </p>
    ),
  },
  {
    title: 'Liability',
    content: (
      <>
        <p>
          Nothing in these Terms limits liability for fraud, wilful misconduct, death or personal injury caused by negligence, safeguarding duties that cannot be excluded, or any other liability that the law does not permit us to limit.
        </p>
        <p>
          Subject to that rule, Ilmbit is not responsible for indirect or unforeseeable loss, loss caused by your device or internet connection, or loss caused by conduct outside our reasonable control. For paid Services, our total liability arising from the Service will not exceed the amount you paid to Ilmbit for the affected Service during the 12 months before the event giving rise to the claim, unless applicable law requires a greater remedy.
        </p>
      </>
    ),
  },
  {
    title: 'Governing law and disputes',
    content: (
      <p>
        These Terms are governed by the laws of Sri Lanka. Please contact us first so we can try to resolve a concern informally. If a dispute cannot be resolved, the courts of Sri Lanka will have jurisdiction, subject to any mandatory consumer right you have to bring a claim in another country or under another applicable law.
      </p>
    ),
  },
  {
    title: 'Changes to these terms',
    content: (
      <p>
        We may update these Terms to reflect changes to the Service, law, safety requirements, or business practices. We will post the updated version and change the “Last updated” date. If a change materially affects current paid use, we will provide reasonable advance notice where practicable. Continuing to use the Service after the effective date means you accept the updated Terms; if you do not agree, you should stop using the Service and cancel future renewals.
      </p>
    ),
  },
  {
    title: 'Contact us',
    content: (
      <p>
        Questions about these Terms may be sent to <a className="font-bold text-[#095F46] underline-offset-4 hover:underline" href="mailto:support@ilmbit.com">support@ilmbit.com</a>. You may also write to Ilmbit in Colombo, Sri Lanka.
      </p>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPage
      eyebrow="Using Ilmbit"
      title="Terms of Service"
      summary="These terms set the ground rules for Ilmbit accounts, live lessons, subscriptions, family use, safeguarding, and learning materials."
      updatedAt="23 September 2026"
      sections={sections}
    />
  );
}
