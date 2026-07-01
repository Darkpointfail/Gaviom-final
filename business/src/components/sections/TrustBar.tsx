import { TRUST_BAR_ITEMS } from '@/lib/content';
import { Icon } from '../Icon';

export function TrustBar() {
  return (
    <section aria-label="Trust signals" className="border-b border-line bg-ink py-5">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {TRUST_BAR_ITEMS.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 text-sm font-medium text-paper sm:text-[0.9rem]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/35 bg-gold/15 text-gold-light">
                <Icon name="check" className="h-4 w-4" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
