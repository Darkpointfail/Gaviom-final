/** SEO content clusters — metadata, link rules, and trust pools */

/** @typedef {{
  key: string,
  label: string,
  section: string,
  tags: string[],
  linkRules: {
    prizeHrefs: string[],
    minPrizeLinks: number,
    howToWinSlugs: string[],
    minHowToLinks: number,
    gaviomCtaHref: string,
  },
  trustSlugs: string[],
  relatedPool: string[],
}} ClusterConfig */

/** @type {Record<string, ClusterConfig>} */
export const CLUSTERS = {
  'pch-intent': {
    key: 'pch-intent',
    label: 'PCH Intent Capture Cluster',
    section: 'sweepstakes',
    tags: ['pch-intent', 'pch-alternatives', 'big-prizes', 'trusted-sweepstakes'],
    linkRules: {
      prizeHrefs: [
        '/prizes.html',
        '/prize.html',
        '/prize-vegas.html',
        '/prize-iphone.html',
        '/prize-diving.html',
      ],
      minPrizeLinks: 3,
      howToWinSlugs: [
        'improve-chances-winning-sweepstakes',
        'how-to-win-giveaways-tips',
        'enter-sweepstakes-daily-routine',
        'beginners-guide-sweepstakes-usa',
      ],
      minHowToLinks: 2,
      gaviomCtaHref: '/prizes.html',
    },
    trustSlugs: [
      'is-gaviom-legit',
      'sweepstakes-scams-how-to-avoid',
      'legitimate-sweepstakes-companies',
      'how-sweepstakes-winners-selected',
      'can-you-really-win-online-giveaways',
    ],
    relatedPool: [
      'best-sweepstakes-like-pch',
      'alternatives-to-pch-sweepstakes',
      'legit-sweepstakes-big-prizes',
      'win-big-cash-sweepstakes-online',
      'trusted-sweepstakes-platforms-2026',
      'pch-sweepstakes-explained',
      'publishers-clearing-house-alternatives',
      'are-sweepstakes-legit-today',
      'what-happened-to-pch-sweepstakes',
      'is-publishers-clearing-house-still-active',
      'no-purchase-necessary-big-prize-sweepstakes',
      'how-to-win-sweepstakes-more-often',
    ],
  },
};

/** @param {string} key */
export function getCluster(key) {
  return CLUSTERS[key] || null;
}

/** @param {import('./posts.mjs').Post} post */
export function isClusterPost(post) {
  return Boolean(post.cluster && CLUSTERS[post.cluster]);
}
