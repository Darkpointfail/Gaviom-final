import { COMPARISON_ROWS } from '@/lib/content';
import { FadeIn } from '../FadeIn';

function GaviomCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return <span className="text-gold font-medium">✅ We handle it</span>;
  }
  return <span className="text-white/85">{value}</span>;
}

export function Comparison() {
  return (
    <section className="bg-card/30 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="section-badge">Compare</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Why companies choose Gaviom over doing it in-house
          </h2>
        </FadeIn>

        <FadeIn className="mt-12 overflow-hidden rounded-2xl border border-white/[0.08]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                  <th className="px-5 py-4 font-medium text-white/40" />
                  <th className="px-5 py-4 font-display font-semibold text-white/70">
                    DIY
                  </th>
                  <th className="px-5 py-4 font-display font-semibold text-gold">
                    With Gaviom
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row.label}
                    className={
                      i < COMPARISON_ROWS.length - 1
                        ? 'border-b border-white/[0.06]'
                        : ''
                    }
                  >
                    <td className="px-5 py-4 font-medium text-white/80">
                      {row.label}
                    </td>
                    <td className="px-5 py-4 text-white/45">{row.diy}</td>
                    <td className="px-5 py-4">
                      <GaviomCell value={row.gaviom} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
