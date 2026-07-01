import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { QuoteModalProvider } from '@/components/QuoteModalProvider';
import { siteIcons, siteManifest } from '@/lib/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

const siteUrl = 'https://gaviom.com/business';

const title = 'Gaviom for Business | Employee Prize Draw Platform';
const description =
  'Fully managed employee reward draws for companies. Buy ticket packs or build a custom draw. Gaviom handles compliance, communication, certification, and fulfillment.';

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL('https://gaviom.com'),
  icons: siteIcons,
  manifest: siteManifest,
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: 'Gaviom',
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/business/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/business/opengraph-image'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="font-sans">
        <QuoteModalProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </QuoteModalProvider>
      </body>
    </html>
  );
}
