/** Premium workplace & experience photography, no casino or promo imagery. */
const unsplash = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?w=${w}&auto=format&fit=crop&q=80`;

export const HERO_VISUAL = {
  src: unsplash('photo-1566073771259-6a8506099945', 960),
  alt: 'Luxury resort pool and lounge at golden hour',
};

export const STANDARD_VISUAL = {
  src: unsplash('photo-1556761175-5973dc0f32e7', 960),
  alt: 'Professional team in a bright modern office',
};

export const CUSTOM_VISUAL = {
  src: unsplash('photo-1414235077428-338989a2e8c0', 960),
  alt: 'Fine dining table setting in an upscale restaurant',
};

export const WHY_VISUAL = {
  src: '/images/cruise-balcony.webp',
  alt: 'Balcony view from a luxury cruise at golden hour',
};
