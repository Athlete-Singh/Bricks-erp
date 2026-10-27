import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, Database, FileText, Bell } from 'lucide-react';
import { brand } from '@/lib/marketing-content';
import { Logo } from '@/components/brand/logo';
import { Footer } from '@/components/marketing/sections/footer';

export const metadata: Metadata = {
  title: `Privacy Policy — ${brand.name}`,
  description: `Privacy Policy for ${brand.fullName} and the BRICS mobile application.`,
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'October 28, 2026';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <Logo variant="horizontal" size="sm" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:py-14">
        {/* Header Hero */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 mb-4">
            <Shield className="h-3.5 w-3.5" /> Privacy & Security First
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-600">
            Effective Date & Last Updated: <strong>{lastUpdated}</strong>
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            This Privacy Policy describes how <strong>TVAM KEY SOFTWARE PRIVATE LIMITED</strong> (&ldquo;Company&rdquo;,
            &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) collects, uses, and safeguards information through
            the <strong>BRICS</strong> ERP platform, web portal, and the <strong>BRICS mobile application</strong>{' '}
            (Package:{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-emerald-800 font-semibold">
              com.bricks.user
            </code>
            ).
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-slate-700">
          {/* Section 1 */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <Eye className="h-5 w-5 text-emerald-600" /> 1. Information We Collect
            </h2>
            <p className="mb-3">
              BRICS is a business-to-business (B2B) enterprise resource planning (ERP) application for brick kiln owners
              and supervisors. We collect only data necessary to operate the service:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account & Profile Information:</strong> Authorized supervisor and staff names, mobile phone
                numbers, email addresses, assigned kiln locations, and encrypted login passwords.
              </li>
              <li>
                <strong>Field Operational Records:</strong> Daily brick production metrics (moulding, drying, firing
                chamber temperatures, unloading/sorting counts), labour attendance, piece-rate records, salary advances,
                dispatch challans, vehicle truck numbers, and goods receipt notes (GRN).
              </li>
              <li>
                <strong>Device & Network Information:</strong> Device model, OS version, network connectivity status (to
                manage the offline sync queue), and FCM registration tokens for push notifications.
              </li>
              <li>
                <strong>Offline Local Storage:</strong> Operating offline at remote kilns requires local caching of
                active batches, challans, and muster rolls using a secured on-device SQLite/Drift database.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <Database className="h-5 w-5 text-emerald-600" /> 2. How We Use Your Information
            </h2>
            <p className="mb-3">All collected information is used strictly to provide the ERP services:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Maintaining real-time production, stock, and double-entry accounting ledgers.</li>
              <li>Enabling seamless offline-to-online synchronization of kiln records.</li>
              <li>Generating GST sales invoices, transport passes, and delivery challans.</li>
              <li>Calculating accurate piece-rate wages and advance settlements for labour groups.</li>
              <li>Providing operational audit logs and anomaly alerts to kiln business owners.</li>
            </ul>
            <p className="mt-3 font-semibold text-slate-800">
              We DO NOT sell, rent, or trade your personal or operational data to third parties or advertisers.
            </p>
          </section>

          {/* Section 3 */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <Lock className="h-5 w-5 text-emerald-600" /> 3. App Permissions Used
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <span className="font-mono text-xs font-bold text-emerald-800">INTERNET</span>
                <p className="mt-1 text-xs text-slate-600">
                  Required to securely sync field records with central cloud servers via encrypted HTTPS.
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <span className="font-mono text-xs font-bold text-emerald-800">ACCESS_NETWORK_STATE</span>
                <p className="mt-1 text-xs text-slate-600">
                  Used by our offline engine to detect when internet returns and trigger automatic sync.
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <span className="font-mono text-xs font-bold text-emerald-800">POST_NOTIFICATIONS</span>
                <p className="mt-1 text-xs text-slate-600">
                  Used to deliver urgent operational alerts (e.g. advance approvals, gate-out passes).
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <span className="font-mono text-xs font-bold text-emerald-800">LOCAL SECURE STORAGE</span>
                <p className="mt-1 text-xs text-slate-600">
                  Stores encrypted JWT session tokens and local offline database securely on device.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <Shield className="h-5 w-5 text-emerald-600" /> 4. Security & Data Protection
            </h2>
            <p>
              We implement industry-standard administrative, physical, and technical safeguards to protect your business
              records:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5">
              <li>End-to-end transport layer security (TLS 1.3 / HTTPS) for all data in transit.</li>
              <li>
                Multi-tenant architecture isolating each brick kiln company&apos;s data strictly at the database level.
              </li>
              <li>Tamper-evident audit logging for all inventory adjustments and financial vouchers.</li>
              <li>Encrypted storage for user credentials and API access tokens.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <Bell className="h-5 w-5 text-emerald-600" /> 5. Third-Party Infrastructure
            </h2>
            <p>
              To deliver high availability and push notifications, we work with trusted enterprise cloud infrastructure
              providers:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5">
              <li>
                <strong>Cloud Hosting & DB:</strong> Enterprise cloud servers with SOC 2 compliance.
              </li>
              <li>
                <strong>Google Firebase:</strong> Firebase Cloud Messaging (FCM) used solely to transmit real-time
                device notifications.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <FileText className="h-5 w-5 text-emerald-600" /> 6. Data Retention & Account Deletion
            </h2>
            <p>
              Business records are retained for as long as your organization maintains an active subscription, and in
              accordance with statutory accounting and tax retention regulations.
            </p>
            <p className="mt-2">
              <strong>Account Deletion:</strong> Organizations or authorized users may request complete removal of their
              account, credentials, and associated personal data by emailing us at{' '}
              <a href="mailto:privacy@tvamkey.com" className="font-semibold text-emerald-700 underline">
                privacy@tvamkey.com
              </a>{' '}
              or by contacting your kiln administrator. Requests are fulfilled within 30 business days.
            </p>
          </section>

          {/* Section 7 */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-3">7. Contact Information</h2>
            <p>
              If you have any questions, inquiries, or feedback regarding this Privacy Policy or your data, please
              contact us at:
            </p>
            <div className="mt-3 rounded-lg bg-slate-50 p-4 border border-slate-200">
              <p className="font-bold text-slate-900">{brand.company}</p>
              <p className="text-xs text-slate-600 mt-1">Product: BRICS ERP & Mobile Supervisor App</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Email:{' '}
                <a href="mailto:privacy@tvamkey.com" className="text-emerald-700 font-medium">
                  privacy@tvamkey.com
                </a>
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Support:{' '}
                <a href="mailto:hello@tvamkey.com" className="text-emerald-700 font-medium">
                  hello@tvamkey.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
