import { FadeIn } from '../FadeIn';

const STEPS = [
  {
    num: '01',
    title: 'You enroll your team',
    description:
      'You choose your package, we set up your company account, employees are activated automatically.',
  },
  {
    num: '02',
    title: 'Your employees enter and play',
    description:
      'Every enrolled employee receives contest entries. They can win prizes from our rotating catalog — no purchase required beyond their enrollment.',
  },
  {
    num: '03',
    title: 'We handle everything else',
    description:
      'Prize sourcing, certified live draws, winner communication, fulfillment. Zero workload for your HR team.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="section-badge">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps. Zero HR headaches.
          </h2>
        </FadeIn>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <FadeIn key={step.num} delay={i * 0.1} as="article">
              <div className="glass-card card-hover h-full p-8">
                <span className="font-display text-4xl font-bold text-gold/80">
                  {step.num}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/60">
                  {step.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
