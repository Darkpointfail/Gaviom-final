'use client';

import { FormEvent, useEffect, useState } from 'react';
import { EMPLOYEE_OPTIONS, PACKAGE_OPTIONS } from '@/lib/content';

type QuoteFormProps = {
  presetPackage?: string;
  onSuccess?: () => void;
};

type FormState = {
  name: string;
  company: string;
  email: string;
  employees: string;
  packageInterest: string;
  message: string;
};

const INQUIRY_API = '/api/business-inquiry';

export function QuoteForm({ presetPackage, onSuccess }: QuoteFormProps) {
  const [form, setForm] = useState<FormState>({
    name: '',
    company: '',
    email: '',
    employees: '100-250',
    packageInterest: presetPackage || 'Not sure yet',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (presetPackage) {
      setForm((prev) => ({ ...prev, packageInterest: presetPackage }));
    }
  }, [presetPackage]);

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    const payload = {
      ...form,
      source: 'gaviom-business-landing',
      submittedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(INQUIRY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not send inquiry.');
      }

      setStatus('success');
      setTimeout(() => onSuccess?.(), 2500);
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not send inquiry.',
      );
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-xl border border-gold/30 bg-gold/10 p-6 text-center">
        <p className="font-display text-lg font-semibold text-gold">
          Request received
        </p>
        <p className="mt-2 text-sm text-ink-3">
          Check your inbox for a confirmation email. Our team will respond within one
          business day.
        </p>
      </div>
    );
  }

  const fieldClass =
    'w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-muted-2 outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/30';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Full Name
          </span>
          <input
            required
            type="text"
            className={fieldClass}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Jane Smith"
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Company Name
          </span>
          <input
            required
            type="text"
            className={fieldClass}
            value={form.company}
            onChange={(e) => update('company', e.target.value)}
            placeholder="Acme Inc."
            autoComplete="organization"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Work Email
          </span>
          <input
            required
            type="email"
            className={fieldClass}
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Number of Employees
          </span>
          <select
            required
            className={fieldClass}
            value={form.employees}
            onChange={(e) => update('employees', e.target.value)}
          >
            {EMPLOYEE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-canvas">
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Package Interest
          </span>
          <select
            required
            className={fieldClass}
            value={form.packageInterest}
            onChange={(e) => update('packageInterest', e.target.value)}
          >
            {PACKAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-canvas">
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Message <span className="normal-case text-muted-2">(optional)</span>
          </span>
          <textarea
            rows={3}
            className={fieldClass}
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
            placeholder="Tell us about your team, culture goals, and timeline…"
          />
        </label>
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-400">
          {errorMessage || 'Something went wrong.'} Email us at{' '}
          <a href="mailto:info@getgaviom.com" className="underline">
            info@getgaviom.com
          </a>{' '}
          or try again in a moment.
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="btn-primary w-full disabled:opacity-60"
      >
        {status === 'loading' ? 'Submitting…' : 'Send inquiry'}
      </button>
    </form>
  );
}
