import type { IconName } from '@/components/Icon';

export const TRUST_BAR_ITEMS = [
  'Fully funded by your company',
  'Certified, audited draws',
  'Zero operational lift',
  'Compliant across all 50 states',
] as const;

export const PATH_OPTIONS = [
  {
    id: 'standard',
    anchor: '#ticket-packs',
    label: 'Buy ticket packs for your employees',
    tagline: 'Standard Account',
    shortLine:
      'Fast to launch. Employees get entries automatically, no setup required.',
    cta: 'Learn more',
  },
  {
    id: 'custom',
    anchor: '#custom-draw',
    label: 'Build a custom draw for your company',
    tagline: 'Custom Account',
    shortLine:
      'Fully tailored to your company and your budget, with a guaranteed winner.',
    cta: 'Learn more',
  },
] as const;

export const STANDARD_BULLETS = [
  'Zero friction for the company',
  'Entry value varies by prize',
  'Employees can become Gaviom B2C customers over time',
] as const;

export const CUSTOM_BULLETS = [
  'Prizes selected together from our B2B catalog',
  'Entry pricing defined around your budget',
  'Internal communication fully handled by us',
  'Draw organized and certified by us',
  'Guarantee that an employee walks away with a meaningful prize',
] as const;

export const SHARED_HANDLE_ITEMS = [
  {
    icon: 'award' as IconName,
    title: 'Prize funding & management',
    description:
      'Your company funds the program. We source, reserve, and deliver premium prizes end-to-end.',
  },
  {
    icon: 'broadcast' as IconName,
    title: 'Draw organization',
    description:
      'Independent certification, documented selection, and an audit trail your leadership can review.',
  },
  {
    icon: 'messages' as IconName,
    title: 'Communication',
    description:
      'Launch emails, reminders, and winner outreach, professionally written and managed for you.',
  },
  {
    icon: 'chart' as IconName,
    title: 'Visibility & reporting',
    description:
      'Participation metrics and cycle summaries HR and executives can use in reviews and planning.',
  },
] as const;

export const WHY_GAVIOM_POINTS = [
  {
    icon: 'sparkles' as IconName,
    title: 'Premium prize catalog',
    description:
      'Luxury travel, fine dining, and top-tier tech, curated for employee reward draws, not generic gift cards.',
  },
  {
    icon: 'shield' as IconName,
    title: 'Independent draw certification',
    description:
      'Auditable process with documented selection. Your team watches a verified event, not an opaque announcement.',
  },
  {
    icon: 'clipboard' as IconName,
    title: 'Legal & compliance, handled',
    description:
      'We carry the regulatory responsibility. Rules, alternate entry, and jurisdiction review are built in.',
  },
  {
    icon: 'headset' as IconName,
    title: 'Full-service delivery',
    description:
      'Funding, sourcing, comms, and draw execution. Nothing left for HR to coordinate or chase.',
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: 'Is this legal?',
    answer:
      'Yes. Every Gaviom corporate program is structured as a lawful US prize promotion with published rules, alternate entry methods where required, and jurisdiction review. We handle compliance documentation so your legal team is not building this from scratch.',
  },
  {
    question: 'What does it cost my company?',
    answer:
      'Pricing depends on headcount, path (ticket packs vs. custom draw), and prize scope. Ticket packs scale per employee; custom draws are scoped to your budget with transparent entry pricing. We provide written pricing before you commit.',
  },
  {
    question: 'Do employees have to pay anything?',
    answer:
      'Under the Standard Account, each employee receives company-funded entries at enrollment. Employees may optionally purchase additional entries for prizes that interest them, at their own expense. Custom draws are fully company-funded unless you choose otherwise.',
  },
  {
    question: 'Who manages the draw?',
    answer:
      'Gaviom manages the entire program: portal setup, communications, draw organization, certification, and prize fulfillment. HR receives reporting; we operate the program day to day.',
  },
  {
    question: 'What happens to employee data?',
    answer:
      'Employee data stays within your private company portal. We use roster information only to administer the program, communicate with participants, and fulfill prizes. We do not sell employee data or mix corporate programs with public consumer marketing.',
  },
] as const;

export const EMPLOYEE_OPTIONS = [
  { value: '50-100', label: '50–100' },
  { value: '100-250', label: '100–250' },
  { value: '250-500', label: '250–500' },
  { value: '500+', label: '500+' },
] as const;

export const PACKAGE_OPTIONS = [
  { value: 'Discovery call', label: 'Discovery call' },
  { value: 'Ticket Packs (Standard)', label: 'Ticket Packs (Standard)' },
  { value: 'Custom Draw', label: 'Custom Draw' },
  { value: 'Partner / Broker', label: 'Partner / Broker' },
  { value: 'Not sure yet', label: 'Not sure yet' },
] as const;

export const CALENDLY_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/getgaviom/discovery';
