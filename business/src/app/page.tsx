import { CustomAccount } from '@/components/sections/CustomAccount';
import { FAQ } from '@/components/sections/FAQ';
import { FinalCTA } from '@/components/sections/FinalCTA';
import { ForPartners } from '@/components/sections/ForPartners';
import { Hero } from '@/components/sections/Hero';
import { StandardAccount } from '@/components/sections/StandardAccount';
import { TrustBar } from '@/components/sections/TrustBar';
import { TwoOptionFork } from '@/components/sections/TwoOptionFork';
import { WhatWeHandle } from '@/components/sections/WhatWeHandle';
import { WhyGaviom } from '@/components/sections/WhyGaviom';

export default function BusinessPage() {
  return (
    <>
      <Hero />
      <TwoOptionFork />
      <TrustBar />
      <StandardAccount />
      <CustomAccount />
      <WhatWeHandle />
      <WhyGaviom />
      <ForPartners />
      <FAQ />
      <FinalCTA />
    </>
  );
}
