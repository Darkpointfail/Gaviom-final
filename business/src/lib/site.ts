/** Keep in sync with scripts/favicon-links.mjs FAVICON_VERSION */
export const FAVICON_VERSION = '3';

export const siteIcons = {
  icon: [
    {
      url: `/favicon.ico?v=${FAVICON_VERSION}`,
      type: 'image/x-icon',
      sizes: '48x48',
    },
  ],
  shortcut: [`/favicon.ico?v=${FAVICON_VERSION}`],
};

export const siteManifest = '/site.webmanifest';
