import { BLOG_CATEGORIES } from './categories.mjs';

/** @typedef {import('./posts.mjs').Post} Post */

/** SEO hub sections — URL paths under /blog */
export const BLOG_SECTIONS = {
  giveaways: {
    key: 'giveaways',
    label: 'Giveaways',
    path: '/blog/giveaways',
    description: 'Travel, tech, car, and home giveaway guides for US players.',
  },
  sweepstakes: {
    key: 'sweepstakes',
    label: 'Sweepstakes',
    path: '/blog/sweepstakes',
    description: 'How US sweepstakes work, odds, compliance, and legitimacy.',
  },
  contests: {
    key: 'contests',
    label: 'Contests',
    path: '/blog/contests',
    description: 'Sweepstakes vs contests, skill-based games, and entry rules.',
  },
  'how-to': {
    key: 'how-to',
    label: 'How-To',
    path: '/blog/how-to',
    description: 'Step-by-step guides to enter giveaways and improve your odds.',
  },
  news: {
    key: 'news',
    label: 'News',
    path: '/blog/news',
    description: 'Gaviom updates, draw announcements, and industry news.',
  },
  winners: {
    key: 'winners',
    label: 'Winners',
    path: '/blog/winners',
    description: 'Winner stories, prize fulfillment, and what happens after you win.',
  },
  business: {
    key: 'business',
    label: 'Business',
    path: '/blog/business',
    description: 'HR engagement, employee sweepstakes, and B2B compliance.',
  },
};

export const SECTION_NAV = Object.values(BLOG_SECTIONS);

export const POSTS_PER_PAGE = 24;

export const DEFAULT_AUTHOR = 'Gaviom Editorial';

export const DEFAULT_OG_IMAGE = '/images/cruise-hero-800w.webp';

/** @type {Record<string, string>} */
export const CATEGORY_IMAGES = {
  [BLOG_CATEGORIES.TRAVEL]: '/images/cruise-hero-800w.webp',
  [BLOG_CATEGORIES.TECH]: '/images/iphone-hero-550w.webp',
  [BLOG_CATEGORIES.CARS]: '/images/vegas-quote-hero-800w.webp',
  [BLOG_CATEGORIES.REAL_ESTATE]: '/images/home-eight-oclock-villa-800w.webp',
  [BLOG_CATEGORIES.GUIDES]: '/images/diving-turtle-800w.webp',
  [BLOG_CATEGORIES.BUSINESS]: '/images/gaviom-logo.webp',
};

const SWEEPSTAKES_KW =
  /sweepstakes|odds|amoe|no-purchase|legit|legal|compliance|tax|scam|trust|gaviom|pch|publishers-clearing|big-prize|big-cash|trusted-sweepstakes/i;
const CONTEST_KW = /contest|skill|lottery|difference|vs-/i;
const WINNER_KW = /winner|won|win-a|when-you-win|prize-fulfill|taxes/i;
const NEWS_KW = /launch|announce|2026|news|update|live-draw/i;

/** @param {Post} post */
export function inferSection(post) {
  if (post.section && BLOG_SECTIONS[post.section]) return post.section;
  if (post.category === BLOG_CATEGORIES.BUSINESS) return 'business';

  if (
    post.category === BLOG_CATEGORIES.TRAVEL ||
    post.category === BLOG_CATEGORIES.TECH ||
    post.category === BLOG_CATEGORIES.CARS ||
    post.category === BLOG_CATEGORIES.REAL_ESTATE
  ) {
    return 'giveaways';
  }

  const hay = `${post.slug} ${post.title} ${post.description}`;

  if (post.category === BLOG_CATEGORIES.GUIDES) {
    if (/how-to|step-by-step|beginner|tips|improve|strategy|enter-|guide-/i.test(hay)) return 'how-to';
    if (WINNER_KW.test(hay)) return 'winners';
    if (CONTEST_KW.test(hay)) return 'contests';
    if (NEWS_KW.test(hay)) return 'news';
    if (SWEEPSTAKES_KW.test(hay)) return 'sweepstakes';
    return 'how-to';
  }

  if (WINNER_KW.test(hay)) return 'winners';
  if (NEWS_KW.test(hay)) return 'news';
  if (CONTEST_KW.test(hay)) return 'contests';
  if (SWEEPSTAKES_KW.test(hay)) return 'sweepstakes';

  return 'how-to';
}

/** @param {Post} post */
export function inferTags(post) {
  if (post.tags?.length) return post.tags;
  const tags = new Set();
  const slugParts = post.slug.split('-').filter((w) => w.length > 3);
  slugParts.slice(0, 4).forEach((t) => tags.add(t));

  if (post.category === BLOG_CATEGORIES.TRAVEL) tags.add('travel');
  if (post.category === BLOG_CATEGORIES.TECH) tags.add('tech');
  if (post.category === BLOG_CATEGORIES.CARS) tags.add('cars');
  if (post.category === BLOG_CATEGORIES.BUSINESS) tags.add('hr');
  if (/iphone|apple/i.test(post.slug)) tags.add('iphone');
  if (/cruise|vacation|travel/i.test(post.slug)) tags.add('vacation');
  if (/tax/i.test(post.slug)) tags.add('taxes');
  if (/canada|canadian/i.test(post.slug)) tags.add('canada');
  if (/usa|us-|united-states/i.test(post.slug)) tags.add('usa');
  if (/pch|publishers-clearing|like-pch/i.test(post.slug)) tags.add('pch-alternatives');
  if (post.cluster === 'pch-intent') {
    tags.add('pch-intent');
    tags.add('trusted-sweepstakes');
  }

  tags.add(inferSection(post));
  return [...tags].slice(0, 8);
}

/** @param {Post} post */
export function enrichPost(post) {
  const section = inferSection(post);
  const tags = inferTags(post);
  return {
    ...post,
    section,
    tags,
    author: post.author || DEFAULT_AUTHOR,
    updated: post.updated || post.date,
    seoTitle: post.seoTitle || post.title,
    featuredImage: post.featuredImage || CATEGORY_IMAGES[post.category] || DEFAULT_OG_IMAGE,
  };
}

/** @param {Post} post */
export function postUrl(post) {
  return `/blog/${post.slug}`;
}

/** @param {string} sectionKey */
export function sectionUrl(sectionKey, page = 1) {
  const base = BLOG_SECTIONS[sectionKey]?.path || '/blog';
  return page > 1 ? `${base}/page/${page}` : base;
}

/** @param {string} tag */
export function tagUrl(tag, page = 1) {
  const base = `/blog/tag/${encodeURIComponent(tag.toLowerCase())}`;
  return page > 1 ? `${base}/page/${page}` : base;
}

/** @param {number} page */
export function blogIndexUrl(page = 1) {
  return page > 1 ? `/blog/page/${page}` : '/blog';
}
