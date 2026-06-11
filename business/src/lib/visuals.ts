/** Site-root prize photography (served from /images/, not under /business). */
export const PRIZE_PHOTOS = {
  iphone: {
    src: '/images/iphone-quote-hero-800w.webp',
    thumb: '/images/iphone-quote-hero-480w.webp',
    alt: 'iPhone prize from a Gaviom employee contest',
  },
  vegas: {
    src: '/images/vegas-quote-hero-800w.webp',
    thumb: '/images/vegas-quote-hero-800w.webp',
    alt: 'Las Vegas travel prize from a Gaviom employee contest',
  },
  cruise: {
    src: '/images/cruise-mobile-hero.webp',
    thumb: '/images/cruise-mobile-hero.webp',
    alt: 'Cruise experience prize from a Gaviom employee contest',
  },
} as const;

export const HERO_PHOTO_STACK = [
  { ...PRIZE_PHOTOS.vegas, rotate: '-rotate-3', offset: 'translate-y-0 z-30' },
  { ...PRIZE_PHOTOS.iphone, rotate: 'rotate-2', offset: 'translate-y-8 z-20 scale-[0.96]' },
  { ...PRIZE_PHOTOS.cruise, rotate: '-rotate-1', offset: 'translate-y-16 z-10 scale-[0.92]' },
] as const;

export const PRIZE_STRIP = [
  { ...PRIZE_PHOTOS.iphone, label: 'Tech' },
  { ...PRIZE_PHOTOS.vegas, label: 'Travel' },
  { ...PRIZE_PHOTOS.cruise, label: 'Experiences' },
] as const;
