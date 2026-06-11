import { FadeIn } from '../FadeIn';

const OFFER_ITEMS = [
  {
    icon: '📋',
    title: 'Official rules & AMOE',
    description:
      'Written rules per draw, alternate method of entry where required, and jurisdiction review — not a Slack poll with a gift card.',
  },
  {
    icon: '🔒',
    title: 'Private employee portal',
    description:
      'Closed enrollment via HRIS or CSV on your branded subdomain. No consumer traffic, no public sign-up page.',
  },
  {
    icon: '📺',
    title: 'Live TikTok draw',
    description:
      'Verifiable random selection streamed live. Unlisted link for your team. Recording and audit note archived after every draw.',
  },
  {
    icon: '💰',
    title: 'Payroll-ready exports',
    description:
      'Winner verification, TIN workflow, and 1099-MISC documentation within 48 hours of draw night.',
  },
  {
    icon: '📣',
    title: 'Comms kit',
    description:
      "Email templates, FAQ for managers, and launch timeline so People Ops isn't writing copy from scratch.",
  },
  {
    icon: '🤝',
    title: 'Senior support',
    description:
      '4-hour response on business days. Sandbox in 48 hours. Written pricing by end of week one — no surprise SOWs.',
  },
] as const;

export function OurOffer() {
  return (
    <section id="our-offer" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <p className="section-badge">Our offer</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to run a fair draw — nothing you don&apos;t.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-3">
            You bring the audience and prize budget. Gaviom delivers the
            compliance stack, private entry portal, live draw, and post-win
            paperwork. Three ways to partner: Standard enrollment, a fully
            custom program, or a year-round Enterprise subscription.
          </p>
        </FadeIn>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {OFFER_ITEMS.map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.05} as="article">
              <div className="glass-card card-hover h-full p-7">
                <span className="text-3xl" aria-hidden>
                  {item.icon}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
