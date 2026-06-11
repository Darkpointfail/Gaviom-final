export const PACKAGES = [
  {
    badge: 'Most Popular',
    badgeVariant: 'gold' as const,
    title: 'Standard',
    description:
      'The plug-and-play employee benefit. Every employee gets automatic contest entries upon activation.',
    features: [
      'Entries into active contests upon enrollment',
      'Access to rotating prize catalog (Tech, Travel, Experiences, Lifestyle)',
      'Employees can purchase additional tickets at their expense',
      'Scales with your headcount automatically',
      'Zero HR management required',
    ],
    packageValue: 'Standard',
  },
  {
    badge: 'Best Experience',
    badgeVariant: 'white' as const,
    title: 'Custom',
    description:
      'A fully tailored contest program built around your company culture and employee interests.',
    features: [
      'Prize selection from our premium B2B catalog',
      'Contest built exclusively for your employees',
      'Internal communication assets provided',
      'Certified live draw, fully transparent',
      'Guaranteed winner every cycle',
      'White-glove account management',
    ],
    packageValue: 'Custom',
  },
  {
    badge: 'Best Value',
    badgeVariant: 'gold' as const,
    title: 'Enterprise',
    description:
      'A recurring monthly benefit program that keeps employees engaged all year long.',
    features: [
      'Fresh contest entries credited every month',
      'Exclusive subscriber-only prizes',
      'Employees can upgrade and buy additional entries',
      'Scales as headcount changes',
      'Monthly participation reporting for HR',
      'Annual or monthly billing available',
    ],
    packageValue: 'Enterprise',
  },
] as const;

export const HANDLE_ITEMS = [
  {
    icon: '🏆',
    title: 'Prize Sourcing & Fulfillment',
    description: 'We source, purchase, and deliver every prize.',
  },
  {
    icon: '🎯',
    title: 'Contest Setup & Management',
    description: 'Full setup from enrollment to launch.',
  },
  {
    icon: '📺',
    title: 'Certified Live Draws',
    description: 'Transparent, documented, and verifiable by anyone.',
  },
  {
    icon: '📣',
    title: 'Winner Communication',
    description: 'We announce and coordinate with winners directly.',
  },
  {
    icon: '📊',
    title: 'HR Reporting Dashboard',
    description: 'Participation data and engagement metrics delivered to you.',
  },
  {
    icon: '🔒',
    title: 'Full Compliance',
    description: 'Every contest is legally structured and certified.',
  },
] as const;

export const PRIZE_CATEGORIES = [
  { icon: '📱', title: 'Tech', items: 'iPhone, MacBook, AirPods, PlayStation, DJI Drone' },
  { icon: '✈️', title: 'Travel', items: 'Luxury weekend getaways, hotel stays, all-inclusive trips' },
  { icon: '⌚', title: 'Watches & Jewelry', items: 'Premium timepieces and accessories' },
  { icon: '🚗', title: 'Automotive', items: 'Car giveaways, accessories, electric vehicles' },
  { icon: '🍽️', title: 'Experiences', items: 'Michelin-star dinners, spa days, exclusive events' },
  { icon: '🎯', title: 'Lifestyle', items: 'Premium subscriptions, fitness gear, curated boxes' },
] as const;

export const COMPARISON_ROWS = [
  { label: 'Legal review & compliance', diy: 'Your team', gaviom: true },
  { label: 'Prize procurement', diy: 'Your budget, your time', gaviom: true },
  { label: 'Draw certification', diy: 'Manual process', gaviom: 'Certified & live' },
  { label: 'Employee communication', diy: 'Your HR team', gaviom: true },
  { label: 'Ongoing management', diy: 'Recurring workload', gaviom: 'Zero workload' },
  { label: 'Time to launch', diy: 'Weeks', gaviom: 'Days' },
] as const;

export const AUDIENCE_CARDS = [
  {
    icon: '🏢',
    title: 'Companies 50–500 employees',
    description: 'Modernize your benefits without complexity',
  },
  {
    icon: '👥',
    title: 'HR & People Teams',
    description: 'High-impact perk, zero admin overhead',
  },
  {
    icon: '🤝',
    title: 'Employee Benefit Brokers',
    description: 'Add a differentiated offering to your book of clients',
  },
  {
    icon: '🏗️',
    title: 'PEO Brokers',
    description: 'Bundle Gaviom into your client packages seamlessly',
  },
] as const;

export const STATS = [
  { value: '1 contest', label: 'can engage your entire workforce at once' },
  { value: '0 hours', label: 'of HR time required after setup' },
  { value: '100%', label: 'managed and fulfilled by Gaviom' },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      'We wanted a benefit that felt premium without adding another platform for HR to manage. Gaviom delivered — our team still talks about the first draw.',
    name: 'Sarah Mitchell',
    title: 'VP of People',
    company: 'Northwind Logistics',
  },
  {
    quote:
      'Our clients ask for differentiation beyond standard medical and 401(k). Gaviom gives brokers a story that actually lands in executive meetings.',
    name: 'David Chen',
    title: 'Benefits Practice Lead',
    company: 'Summit HR Partners',
  },
  {
    quote:
      'Setup took days, not quarters. Employees understood it immediately, and we did not touch fulfillment once.',
    name: 'Rachel Torres',
    title: 'Chief People Officer',
    company: 'Harbor Capital',
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: 'How is pricing determined?',
    answer:
      'Pricing is custom-built based on your headcount, contest frequency, and prize tier. Contact us for a tailored quote.',
  },
  {
    question: 'How long does it take to get started?',
    answer: 'Most companies are up and running within a few days of signing.',
  },
  {
    question: 'Do employees need to pay anything?',
    answer:
      'Employees receive free entries as part of their company enrollment. They have the option to purchase additional tickets at their own expense.',
  },
  {
    question: 'Are the draws certified and transparent?',
    answer: 'Yes. Every draw is conducted live, recorded, and fully auditable.',
  },
  {
    question: 'Can we choose the prizes?',
    answer:
      'Yes — our Custom and Enterprise packages allow full prize customization from our B2B catalog.',
  },
  {
    question: 'Is this legal in all US states?',
    answer:
      'Yes. Our contest structure is fully compliant with US sweepstakes law across all states.',
  },
] as const;

export const EMPLOYEE_OPTIONS = [
  { value: '50-100', label: '50–100' },
  { value: '100-250', label: '100–250' },
  { value: '250-500', label: '250–500' },
  { value: '500+', label: '500+' },
] as const;

export const PACKAGE_OPTIONS = [
  { value: 'Standard', label: 'Standard' },
  { value: 'Custom', label: 'Custom' },
  { value: 'Enterprise', label: 'Enterprise' },
  { value: 'Not sure yet', label: 'Not sure yet' },
] as const;
