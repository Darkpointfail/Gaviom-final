import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { QuoteModalProvider } from '@/components/QuoteModalProvider';
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

export const metadata: Metadata = {
  title: 'Gaviom for Business | Employee Contest Benefits',
  description:
    'Give your employees the chance to win luxury prizes. Gaviom handles everything — prize sourcing, draws, and fulfillment. Zero HR workload.',
  metadataBase: new URL('https://gaviom.com'),
  openGraph: {
    title: 'Gaviom for Business | Employee Contest Benefits',
    description:
      'Give your employees the chance to win luxury prizes. Gaviom handles everything — prize sourcing, draws, and fulfillment. Zero HR workload.',
    url: siteUrl,
    siteName: 'Gaviom',
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/business/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaviom for Business | Employee Contest Benefits',
    description:
      'Give your employees the chance to win luxury prizes. Gaviom handles everything.',
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
