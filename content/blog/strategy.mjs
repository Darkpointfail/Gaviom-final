import { getCluster, isClusterPost } from './clusters.mjs';
import { BLOG_CATEGORIES } from './categories.mjs';

/** @typedef {import('./posts.mjs').Post} Post */

export const STRATEGY = {
  consumerCtaLabel: 'Enter in Draw',
  consumerCtaHref: '/prizes.html',
  businessCtaLabel: 'Request a Demo',
  businessCtaHref: '/business/',
  maxTitleLength: 60,
  maxDescriptionLength: 155,
};

/** @param {Post} post */
export function isBusinessPost(post) {
  if (post.category === BLOG_CATEGORIES.BUSINESS) return true;
  if (post.ctaType === 'b2b') return true;
  const b2bSlugs = new Set([
    'employee-sweepstakes-companies',
    'how-hr-teams-run-compliant-employee-sweepstakes',
  ]);
  return b2bSlugs.has(post.slug);
}

/** @param {Post} post */
export function categoryPageHref(post) {
  return isBusinessPost(post) ? '/business/' : '/prizes.html';
}

/** @param {Post} post */
export function seoTitle(post) {
  const raw = post.title.trim();
  if (raw.length <= STRATEGY.maxTitleLength) return raw;
  const trimmed = raw.slice(0, STRATEGY.maxTitleLength - 1).replace(/\s+\S*$/, '');
  return trimmed.endsWith('…') ? trimmed : `${trimmed}…`;
}

/** @param {Post} post */
export function seoDescription(post) {
  const raw = post.description.trim();
  if (raw.length <= STRATEGY.maxDescriptionLength) return raw;
  const trimmed = raw.slice(0, STRATEGY.maxDescriptionLength - 1).replace(/\s+\S*$/, '');
  return trimmed.endsWith('…') ? trimmed : `${trimmed}…`;
}

/**
 * Normalize in-body CTAs and absolute gaviom.com links.
 * @param {string} html
 * @param {Post} post
 */
export function normalizeBodyHtml(html, post) {
  let body = html;
  const b2b = isBusinessPost(post);

  body = body.replace(/https:\/\/gaviom\.com/g, '');

  if (b2b) {
    body = body.replace(
      /(<a[^>]*class="btn btn-primary"[^>]*href=")[^"]*("[^>]*>)Browse sweepstakes/gi,
      `$1${STRATEGY.businessCtaHref}$2${STRATEGY.businessCtaLabel}`
    );
    body = body.replace(
      /(<a[^>]*class="btn btn-primary"[^>]*>)Browse sweepstakes/gi,
      `$1${STRATEGY.businessCtaLabel}`
    );
    body = body.replace(
      /(<a[^>]*class="btn btn-primary"[^>]*>)Request a proposal/gi,
      `$1${STRATEGY.businessCtaLabel}`
    );
    body = body.replace(
      /(<a[^>]*class="btn btn-primary"[^>]*href=")[^"]*("[^>]*>)Request a proposal/gi,
      `$1${STRATEGY.businessCtaHref}$2${STRATEGY.businessCtaLabel}`
    );
    body = body.replace(
      /(<a[^>]*class="btn btn-primary"[^>]*>)Contact Us/gi,
      `$1${STRATEGY.businessCtaLabel}`
    );
  } else {
    body = body.replace(
      /(<a[^>]*class="btn btn-primary"[^>]*href=")[^"]*("[^>]*>)Browse sweepstakes/gi,
      `$1${STRATEGY.consumerCtaHref}$2${STRATEGY.consumerCtaLabel}`
    );
    body = body.replace(
      /(<a[^>]*class="btn btn-primary"[^>]*>)Browse sweepstakes/gi,
      `$1${STRATEGY.consumerCtaLabel}`
    );
    body = body.replace(
      /(<a[^>]*class="btn btn-ghost"[^>]*href=")\/business\/?("[^>]*>)[^<]*/gi,
      `$1/how.html$2How it works`
    );
  }

  return body;
}

/**
 * Append strategy compliance block when required links or CTA band are missing.
 * @param {string} html
 * @param {Post} post
 */
export function injectStrategyBlocks(html, post) {
  const b2b = isBusinessPost(post);
  const hasRules = /\/rules\.html/.test(html);
  const hasFreeEntry = /\/free-entry\.html/.test(html);
  const hasCtaBand = /blog-cta-band/.test(html);
  const categoryHref = categoryPageHref(post);
  let out = html;

  if (!hasRules || !hasFreeEntry) {
    if (b2b) {
      out += `
<section class="rules-section blog-strategy-compliance">
<h2>Compliance resources for HR teams</h2>
<p>Gaviom employee programs follow US sweepstakes law with documented <a href="/rules.html">Official Rules</a>, published odds on capped pools, and reserved prize value. Explore <a href="/business/">Gaviom for Business</a>.</p>
</section>`;
    } else {
      const canadaNote =
        /canada/i.test(post.slug) || /canada/i.test(post.title)
          ? '<p><em>Gaviom founding sweepstakes serve US residents. This guide covers general principles—confirm eligibility in the Official Rules.</em></p>'
          : '';
      out += `
<section class="rules-section blog-strategy-compliance">
<h2>Enter lawfully on Gaviom</h2>
<p>US residents 18+. Read the <a href="/rules.html">Official Rules</a>, use <a href="/free-entry.html">free entry by mail</a>, and browse <a href="${categoryHref}">active sweepstakes</a> with published odds on capped pools. Gaviom donates 5% of net profits to charity — see <a href="/impact.html">Impact</a>.</p>
${canadaNote}
</section>`;
    }
  }

  if (!hasCtaBand) {
    if (b2b) {
      out += `
<section class="rules-section blog-cta-band">
<h2>Launch a compliant employee program</h2>
<p>Custom sweepstakes, documented rules, and operations managed end-to-end.</p>
<p><a href="${STRATEGY.businessCtaHref}" class="btn btn-primary">${STRATEGY.businessCtaLabel}</a> · <a href="/rules.html" class="btn btn-ghost">Official Rules</a></p>
</section>`;
    } else {
      out += `
<section class="rules-section blog-cta-band">
<h2>Ready to enter?</h2>
<p>Published odds, free mail-in entry, and live draws on founding US sweepstakes.</p>
<p><a href="${STRATEGY.consumerCtaHref}" class="btn btn-primary">${STRATEGY.consumerCtaLabel}</a> · <a href="/free-entry.html" class="btn btn-ghost">Free entry by mail</a></p>
</section>`;
    }
  }

  return out;
}

/**
 * Ensure PCH Intent cluster posts meet internal link quotas and trust layer.
 * @param {string} html
 * @param {Post} post
 */
export function injectClusterBlocks(html, post) {
  if (!isClusterPost(post)) return html;
  const cluster = getCluster(post.cluster);
  if (!cluster) return html;

  let out = html;
  const { linkRules, trustSlugs } = cluster;

  const prizeCount = linkRules.prizeHrefs.filter((href) => out.includes(`href="${href}"`)).length;
  if (prizeCount < linkRules.minPrizeLinks) {
    out += `
<section class="rules-section blog-cluster-links">
<h2>Active big-prize sweepstakes on Gaviom</h2>
<p>Explore current founding draws with published caps and free mail-in entry:</p>
<ul>
<li><a href="/prizes.html">Browse all active sweepstakes</a></li>
<li><a href="/prize.html">MSC cruise grand prize</a></li>
<li><a href="/prize-vegas.html">Las Vegas weekend package</a></li>
<li><a href="/prize-iphone.html">iPhone 16 Pro Max sweepstakes</a></li>
</ul>
</section>`;
  }

  const howToCount = linkRules.howToWinSlugs.filter((slug) =>
    new RegExp(`/blog/${slug}(?:\\.html)?`).test(out)
  ).length;
  if (howToCount < linkRules.minHowToLinks) {
    out += `
<section class="rules-section blog-cluster-links">
<h2>How-to guides for smarter entries</h2>
<p>Improve your approach with strategy articles from the Gaviom blog:</p>
<ul>
<li><a href="/blog/improve-chances-winning-sweepstakes.html">How to improve your sweepstakes odds</a></li>
<li><a href="/blog/how-to-win-giveaways-tips.html">Tips to win giveaways lawfully</a></li>
</ul>
</section>`;
  }

  const hasTrustLink = trustSlugs.some((slug) => new RegExp(`/blog/${slug}(?:\\.html)?`).test(out));
  if (!hasTrustLink) {
    out += `
<section class="rules-section blog-cluster-trust">
<h2>Trust and scam prevention</h2>
<p>Before entering any big-prize promotion, read <a href="/blog/is-gaviom-legit.html">is Gaviom legit</a>, <a href="/blog/sweepstakes-scams-how-to-avoid.html">how to avoid sweepstakes scams</a>, and <a href="/blog/how-sweepstakes-winners-selected.html">how winners are selected</a>.</p>
</section>`;
  }

  return out;
}

/** @param {Post} post */
export function asideBlock(post) {
  const b2b = isBusinessPost(post);
  if (b2b) {
    return `<aside class="blog-article-aside">
        <p class="eyebrow"><span class="bar"></span> Gaviom for Business</p>
        <p style="font-size:15px;line-height:1.55;color:var(--ink-2);margin-bottom:16px;">Compliant employee sweepstakes with documented <a href="/rules.html">Official Rules</a>, capped pools, and reserved prize value.</p>
        <a href="${STRATEGY.businessCtaHref}" class="btn btn-primary">${STRATEGY.businessCtaLabel}</a>
      </aside>`;
  }
  return `<aside class="blog-article-aside">
        <p class="eyebrow"><span class="bar"></span> Enter on Gaviom</p>
        <p style="font-size:15px;line-height:1.55;color:var(--ink-2);margin-bottom:16px;">Published odds, <a href="/free-entry.html">free mail-in entry</a>, and live Sunday draws. See <a href="/rules.html">Official Rules</a> for each promotion.</p>
        <a href="${STRATEGY.consumerCtaHref}" class="btn btn-primary">${STRATEGY.consumerCtaLabel}</a>
      </aside>`;
}
