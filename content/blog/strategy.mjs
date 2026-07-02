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
