/** Single source of truth for Gaviom launch & first draw dates (ET). */
export const LAUNCH_AT_ISO = '2026-09-01T16:00:00.000Z'; /* Sep 1, 2026 · 12:00 ET */
export const FIRST_DRAW_AT_ISO = '2026-09-07T00:00:00.000Z'; /* Sep 6, 2026 · 8:00 PM ET */

export const LAUNCH_DATE_LABEL = 'September 1, 2026';
export const LAUNCH_DATE_SHORT = 'September 1';
export const LAUNCH_MONTH_LABEL = 'September';

export const FIRST_DRAW_DATE_LABEL = 'Sunday, September 6 · 8pm ET';
export const FIRST_DRAW_DATE_SHORT = 'September 6, 8pm ET';
export const FIRST_DRAW_DATE_FULL = 'Sunday, September 6, 2026 at 8pm ET';
export const FIRST_DRAW_CART_LABEL = 'Draw September 6, 2026';

export const TOPBAR_FIRST_DRAW_EXTRA =
  '· Pre-sale open · First draw September 6, 8pm ET';

/** Ordered replacements for static copy (longest match first). */
export const LAUNCH_COPY_REPLACEMENTS = [
  ['Sunday, July 5, 2026 at 8pm ET', FIRST_DRAW_DATE_FULL],
  ['Sunday, July 5 · 8pm ET', FIRST_DRAW_DATE_LABEL],
  ['Sunday, July 5 at 8pm ET', 'Sunday, September 6 at 8pm ET'],
  ['First draw July 5, 8pm ET', 'First draw September 6, 8pm ET'],
  ['first live draws July 5', 'first live draws September 6'],
  ['first live draw Sunday, July 5', 'first live draw Sunday, September 6'],
  ['Founding draw July 5', 'Founding draw September 6'],
  ['Founding draw July 5, 8pm ET', 'Founding draw September 6, 8pm ET'],
  ['Draw July 5, 2026', FIRST_DRAW_CART_LABEL],
  ['July 5, 8pm ET', FIRST_DRAW_DATE_SHORT],
  ['Official launch · July 1, 2026', `Official launch · ${LAUNCH_DATE_LABEL}`],
  ['Launching July 1 · Pre-sale open', `Launching ${LAUNCH_DATE_SHORT} · Pre-sale open`],
  ['a July 1 launch', `a ${LAUNCH_DATE_SHORT} launch`],
  ['July 1 launch', `${LAUNCH_DATE_SHORT} launch`],
  ['launching July 2026', `launching ${LAUNCH_MONTH_LABEL} 2026`],
  ['Launching July', `Launching ${LAUNCH_MONTH_LABEL}`],
  ['early July 2026', `${LAUNCH_MONTH_LABEL} 2026`],
  ['Jul 1, 2026 · 12:00 ET', 'Sep 1, 2026 · 12:00 ET'],
  ['starting July 5, 2026', 'starting September 6, 2026'],
  ['starting July 5, 2026 at 8pm ET', 'starting September 6, 2026 at 8pm ET'],
  ['Sundays 8pm ET starting July 5, 2026', 'Sundays 8pm ET starting September 6, 2026'],
  ['Sundays 8pm ET on TikTok starting July 5, 2026', 'Sundays 8pm ET on TikTok starting September 6, 2026'],
  ['Founding Sunday draws begin July 5, 2026', 'Founding Sunday draws begin September 6, 2026'],
  ['streams starting July 5, 2026', 'streams starting September 6, 2026'],
  ['founding draws begin July 5, 2026', 'founding draws begin September 6, 2026'],
  ['with first live draws July 5', 'with first live draws September 6'],
  ['begin July 5, 2026,', 'begin September 6, 2026,'],
  ['July 5, 2026 at 8pm ET on TikTok', 'September 6, 2026 at 8pm ET on TikTok'],
  ['starting July 5, 2026.', 'starting September 6, 2026.'],
  ['July 2026 founding', 'September 2026 founding'],
  ['July 2026 prizes', 'September 2026 prizes'],
  ['founding July 2026', 'founding September 2026'],
  ['July 2026 launch', 'September 2026 launch'],
  ['July 2026 ·', 'September 2026 ·'],
  ['July 5, 2026 · 8pm ET', 'September 6, 2026 · 8pm ET'],
  ['First live draw Sunday, July 5', 'First live draw Sunday, September 6'],
  ['Founding draw July 5, 2026', 'Founding draw September 6, 2026'],
  ['Founding draw July 5, 2026 with', 'Founding draw September 6, 2026 with'],
  ['Jul 5, 2026 · 8:00 PM ET', 'Sep 6, 2026 · 8:00 PM ET'],
];
