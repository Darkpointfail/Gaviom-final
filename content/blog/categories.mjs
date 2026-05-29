/** Blog category taxonomy for Gaviom premium giveaway platform */
export const BLOG_CATEGORIES = {
  TRAVEL: 'Travel Giveaways',
  TECH: 'Tech Giveaways',
  CARS: 'Car Giveaways',
  REAL_ESTATE: 'Real Estate Giveaways',
  GUIDES: 'Giveaway Guides',
};

/** @type {Record<string, string>} Filter key for blog index UI */
export const CATEGORY_FILTER_KEY = {
  [BLOG_CATEGORIES.TRAVEL]: 'travel',
  [BLOG_CATEGORIES.TECH]: 'tech',
  [BLOG_CATEGORIES.CARS]: 'cars',
  [BLOG_CATEGORIES.REAL_ESTATE]: 'realestate',
  [BLOG_CATEGORIES.GUIDES]: 'guides',
};

export const CATEGORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'travel', label: 'Travel' },
  { key: 'tech', label: 'Tech' },
  { key: 'cars', label: 'Cars' },
  { key: 'realestate', label: 'Real Estate' },
  { key: 'guides', label: 'Guides' },
];
