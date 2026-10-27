'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, ShieldAlert, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { brand } from '@/lib/marketing-content';
import { Logo } from '@/components/brand/logo';
import { Footer } from '@/components/marketing/sections/footer';

export default function DeleteAccountPage() {
  const [mobileOrEmail, setMobileOrEmail] = useState('');
  const [kilnName, setKilnName] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileOrEmail) return;
    setSubmitted(true);
  };

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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 mb-4">
            <Trash2 className="h-3.5 w-3.5" /> Google Play Account Deletion Policy
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Request {brand.name} Account & Data Deletion
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Learn how to request deletion of your <strong>{brand.name}</strong> account (operated by{' '}
            <strong>{brand.company}</strong>, Package:{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-emerald-800 font-semibold">
              com.bricks.user
            </code>
            ) and understand how your data is handled.
          </p>
        </div>

        {/* Steps to request deletion */}
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-600" /> How to Request Deletion
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              You can initiate an account deletion request through either method below:
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="font-bold text-sm text-slate-900">Method 1: Online Request Form</span>
                <p className="mt-1 text-xs text-slate-600">
                  Fill out the form below. Our administrative team will verify ownership and process the removal within
                  30 days.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="font-bold text-sm text-slate-900">Method 2: Direct Email</span>
                <p className="mt-1 text-xs text-slate-600">
                  Send an email from your registered email address to{' '}
                  <a href="mailto:privacy@tvamkey.com" className="font-semibold text-emerald-700 underline">
                    privacy@tvamkey.com
                  </a>{' '}
                  with the subject <em>&ldquo;BRICS Account Deletion Request&rdquo;</em>.
                </p>
              </div>
            </div>
          </section>

          {/* Form */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Online Deletion Request Form</h2>

            {submitted ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 mb-2" />
                <h3 className="text-base font-bold text-emerald-950">Deletion Request Received</h3>
                <p className="mt-1 text-sm text-emerald-800">
                  We have received your request for <strong>{mobileOrEmail}</strong>. Our security team will contact you
                  to verify authorization and process deletion within 30 days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="mobileOrEmail"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Registered Mobile Number or Email *
                  </label>
                  <input
                    id="mobileOrEmail"
                    type="text"
                    required
                    value={mobileOrEmail}
                    onChange={(e) => setMobileOrEmail(e.target.value)}
                    placeholder="e.g. 9876543210 or supervisor@example.com"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="kilnName"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Brick Kiln / Company Name
                  </label>
                  <input
                    id="kilnName"
                    type="text"
                    value={kilnName}
                    onChange={(e) => setKilnName(e.target.value)}
                    placeholder="e.g. Shriram Bhatta Company"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reason"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Reason for Deletion (Optional)
                  </label>
                  <textarea
                    id="reason"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Let us know why you wish to delete your account"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                >
                  Submit Account Deletion Request
                </button>
              </form>
            )}
          </section>

          {/* Data Deleted vs Retained */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" /> Data Handling & Retention Policy
            </h2>

            <div className="space-y-4 text-sm text-slate-700">
              <div className="rounded-lg bg-slate-50 p-4 border-l-4 border-emerald-500">
                <h3 className="font-bold text-slate-900 text-sm">Data that will be permanently deleted:</h3>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-slate-600">
                  <li>User account profile (name, mobile number, email, encrypted password hash).</li>
                  <li>Active session tokens, push notification tokens, and mobile device identifiers.</li>
                  <li>Local on-device database caches on your phone.</li>
                  <li>Draft un-synced operational entries.</li>
                </ul>
              </div>

              <div className="rounded-lg bg-slate-50 p-4 border-l-4 border-amber-500">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> Data that may be retained:
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Because BRICS is a legal ERP and double-entry accounting platform, certain financial vouchers, GST
                  sales invoices, finalized labour settlement payments, and statutory audit logs are retained by the
                  tenant company in accordance with Indian tax laws (Companies Act and GST statutory requirements) for
                  up to 7 years. These records are anonymized where applicable and cannot be altered or deleted
                  unilaterally by field staff.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
