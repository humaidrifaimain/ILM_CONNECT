import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Ilmbit collects, uses, shares, and protects personal information.',
};

const bulletClass = 'list-disc space-y-2 pl-5 marker:text-[#095F46]';

const sections = [
  {
    title: 'Who we are',
    content: (
      <>
        <p>
          Ilmbit (“Ilmbit”, “we”, “us”, or “our”) is an online Islamic education platform based in Colombo, Sri Lanka. We connect students and families with scholars for live one-to-one lessons, learning support, and related platform services.
        </p>
        <p>
          This Privacy Policy explains how we handle personal information when you visit our website, create an account, attend lessons, communicate through Ilmbit, or otherwise use our services.
        </p>
      </>
    ),
  },
  {
    title: 'Information we collect',
    content: (
      <>
        <p>Depending on how you use Ilmbit, we may collect:</p>
        <ul className={bulletClass}>
          <li><strong className="text-stone-800">Account and contact details:</strong> name, email address, telephone or WhatsApp number, country, time zone, language, password in hashed form, account role, and verification or account status.</li>
          <li><strong className="text-stone-800">Learning information:</strong> learning goals, selected courses, bookings, attendance, lesson notes, homework, progress, assessments, feedback, ratings, certificates, and uploaded learning materials.</li>
          <li><strong className="text-stone-800">Live lesson information:</strong> audio, video, chat, technical connection data, and a recording where the plan or lesson includes recording and you have been informed.</li>
          <li><strong className="text-stone-800">Communications:</strong> direct messages, support requests, notification preferences, and correspondence sent by email, WhatsApp, or through the platform.</li>
          <li><strong className="text-stone-800">Payments:</strong> subscription, invoice, transaction, currency, and payment-status information. When a third-party payment provider handles a payment, it processes the full card or bank details and Ilmbit does not receive or store your complete card number.</li>
          <li><strong className="text-stone-800">Scholar information:</strong> biography, qualifications, specialisations, languages, availability, ratings, payout method, and payout details.</li>
          <li><strong className="text-stone-800">Technical and security information:</strong> device and browser information, IP address, login and activity records, authentication tokens, and information used to prevent fraud or keep the service secure.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'How we collect information',
    content: (
      <p>
        We collect information directly from you, from a parent or guardian, through scholars and administrators who use the platform, automatically when you use Ilmbit, and from service providers involved in payments, communications, video lessons, hosting, or security.
      </p>
    ),
  },
  {
    title: 'How and why we use information',
    content: (
      <>
        <p>We use personal information to:</p>
        <ul className={bulletClass}>
          <li>create and secure accounts, verify access, and provide the service you request;</li>
          <li>match students with scholars, schedule and run lessons, and track learning progress;</li>
          <li>process subscriptions, payments, refunds, invoices, and scholar payouts;</li>
          <li>send booking, account, safety, support, and service notifications;</li>
          <li>respond to questions, investigate complaints, and enforce our Terms of Service;</li>
          <li>maintain platform reliability, prevent misuse or fraud, and keep audit records;</li>
          <li>improve courses, support, and platform features using appropriately limited information; and</li>
          <li>meet legal, regulatory, accounting, safeguarding, and dispute-resolution obligations.</li>
        </ul>
        <p>
          Where applicable law requires a legal basis, we rely on performance of our contract with you, our legitimate interests in operating and securing Ilmbit, compliance with legal obligations, and consent where consent is required. You may withdraw consent at any time, but this does not affect processing already carried out lawfully.
        </p>
      </>
    ),
  },
  {
    title: 'When we share information',
    content: (
      <>
        <p>We share only what is reasonably needed with:</p>
        <ul className={bulletClass}>
          <li>the student, their parent or guardian, and the scholar assigned to provide the lesson;</li>
          <li>vendors supporting hosting, database infrastructure, file storage, live video (including LiveKit), payments, email, WhatsApp notifications, customer support, and security;</li>
          <li>professional advisers, regulators, courts, law enforcement, or other parties where required to protect rights, safety, users, or the public; and</li>
          <li>a successor or transaction partner if Ilmbit is involved in a merger, financing, reorganisation, or sale, subject to appropriate confidentiality protections.</li>
        </ul>
        <p>
          We do not sell personal information and do not use student information for third-party targeted advertising.
        </p>
      </>
    ),
  },
  {
    title: 'International data transfers',
    content: (
      <p>
        Ilmbit serves users in multiple countries, and some service providers or scholars may be located outside your country. Where personal information is transferred internationally, we use contracts and other safeguards required by applicable law and limit access to what is necessary for the service.
      </p>
    ),
  },
  {
    title: 'How long we keep information',
    content: (
      <p>
        We keep information only for as long as needed to provide Ilmbit, maintain learning and transaction records, resolve disputes, protect users, and meet legal or accounting obligations. Retention periods vary by record type. When information is no longer required, we delete it or de-identify it, unless the law allows or requires us to keep it longer. You may ask us to close your account or delete eligible information by contacting us.
      </p>
    ),
  },
  {
    title: 'Children and family accounts',
    content: (
      <>
        <p>
          Ilmbit may provide lessons to children. A parent or legal guardian must create or authorise an account for anyone under 18 and supervise their use of the service. Parents and guardians should explain this policy in age-appropriate language and help the child make privacy choices.
        </p>
        <p>
          We aim to collect only the information needed for learning and safeguarding, use high-privacy defaults, and avoid targeted advertising or unnecessary profiling. A parent or guardian may contact us to review, correct, or request deletion of a child’s information, subject to legal, safeguarding, and record-keeping requirements. Please tell us promptly if you believe a child is using Ilmbit without appropriate permission.
        </p>
      </>
    ),
  },
  {
    title: 'Cookies and device storage',
    content: (
      <p>
        Ilmbit uses cookies, browser storage, and similar technologies that are necessary for authentication, session continuity, security, and user preferences. For example, an authentication token and basic account details may be stored in your browser so you remain signed in. If we introduce optional analytics or advertising technologies, we will update this policy and provide any notice or choice required by law.
      </p>
    ),
  },
  {
    title: 'Security',
    content: (
      <p>
        We use administrative, technical, and organisational measures designed to protect personal information, including access controls, password hashing, and restricted account roles. No online system is completely secure, so please use a strong, unique password, keep login details private, and contact us immediately if you suspect unauthorised access.
      </p>
    ),
  },
  {
    title: 'Your privacy rights',
    content: (
      <>
        <p>
          Depending on where you live, you may have rights to access, correct, delete, restrict, or object to the use of your personal information; receive a portable copy; withdraw consent; and complain to a data-protection authority. These rights may be subject to lawful exceptions.
        </p>
        <p>
          Send a request to <a className="font-bold text-[#095F46] underline-offset-4 hover:underline" href="mailto:support@ilmbit.com">support@ilmbit.com</a>. We may need to verify your identity or authority as a parent or guardian before responding. You may also contact the Data Protection Authority of Sri Lanka or the regulator in your country.
        </p>
      </>
    ),
  },
  {
    title: 'Third-party services and links',
    content: (
      <p>
        Ilmbit may link to or integrate with third-party services. Their privacy practices are governed by their own notices. We encourage you to review those notices before providing information directly to a third party.
      </p>
    ),
  },
  {
    title: 'Changes to this policy',
    content: (
      <p>
        We may update this Privacy Policy as Ilmbit or the law changes. We will post the revised version here, change the “Last updated” date, and provide additional notice where a change materially affects your rights or where required by law.
      </p>
    ),
  },
  {
    title: 'Contact us',
    content: (
      <p>
        For privacy questions or requests, email <a className="font-bold text-[#095F46] underline-offset-4 hover:underline" href="mailto:support@ilmbit.com">support@ilmbit.com</a>. You may also write to Ilmbit in Colombo, Sri Lanka.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Your information"
      title="Privacy Policy"
      summary="This policy describes what information Ilmbit handles, why we use it, who may receive it, and the choices available to students, families, and scholars."
      updatedAt="23 September 2026"
      sections={sections}
    />
  );
}
