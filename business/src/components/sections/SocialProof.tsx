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
    <section className="border-y border-line bg-canvas/80 py-10">
      <FadeIn className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="mb-8 text-center text-sm text-muted">
          Trusted by forward-thinking companies across the US
        </p>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {LOGO_PLACEHOLDERS.map((name) => (
            <li key={name}>
              <div
                className="flex h-14 items-center justify-center rounded-xl border border-line bg-paper px-3"
                aria-label={`${name} logo placeholder`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-2">
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
