import { Comparison } from '@/components/sections/Comparison';
import { FAQ } from '@/components/sections/FAQ';
import { FinalCTA } from '@/components/sections/FinalCTA';
import { Hero } from '@/components/sections/Hero';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Packages } from '@/components/sections/Packages';
import { PrizeCatalog } from '@/components/sections/PrizeCatalog';
import { ROI } from '@/components/sections/ROI';
import { SocialProof } from '@/components/sections/SocialProof';
import { Testimonials } from '@/components/sections/Testimonials';
import { WhatWeHandle } from '@/components/sections/WhatWeHandle';
import { WhoThisIsFor } from '@/components/sections/WhoThisIsFor';

export default function BusinessPage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <HowItWorks />
      <Packages />
      <WhatWeHandle />
      <PrizeCatalog />
      <Comparison />
      <WhoThisIsFor />
      <ROI />
      <Testimonials />
      <FAQ />
      <FinalCTA />
    </>
  );
}
