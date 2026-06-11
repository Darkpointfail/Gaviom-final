import { FadeIn } from '../FadeIn';

const LOGO_PLACEHOLDERS = [
  'Northwind',
  'Meridian',
  'Harbor Co.',
  'Summit HR',
  'Bolt Freight',
  'Cedar Works',
];

export function SocialProof() {
  return (
    <section className="border-y border-white/[0.06] bg-card/40 py-10">
      <FadeIn className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="mb-8 text-center text-sm text-white/45">
          Trusted by forward-thinking companies across the US
        </p>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {LOGO_PLACEHOLDERS.map((name) => (
            <li key={name}>
              <div
                className="flex h-14 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] px-3"
                aria-label={`${name} logo placeholder`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-white/25">
                  {name}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </FadeIn>
    </section>
  );
}
