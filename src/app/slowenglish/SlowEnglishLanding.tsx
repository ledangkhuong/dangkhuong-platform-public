"use client";

import { useRef } from "react";
import HeroSection from "./sections/HeroSection";
import ProofSection from "./sections/ProofSection";
import PainPointsSection from "./sections/PainPointsSection";
import CourseContentSection from "./sections/CourseContentSection";
import ResourcesSection from "./sections/ResourcesSection";
import PricingSection from "./sections/PricingSection";
import ComparisonSection from "./sections/ComparisonSection";
import AudienceSection from "./sections/AudienceSection";
import FAQSection from "./sections/FAQSection";
import FinalCTASection from "./sections/FinalCTASection";

export default function SlowEnglishLanding() {
  const pricingRef = useRef<HTMLDivElement>(null);

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#f5f5f5" }}>
      <HeroSection onScrollToPricing={scrollToPricing} />
      <ProofSection />
      <PainPointsSection />
      <CourseContentSection />
      <ResourcesSection />
      <div ref={pricingRef}>
        <PricingSection />
      </div>
      <ComparisonSection />
      <AudienceSection />
      <FAQSection />
      <FinalCTASection />
    </div>
  );
}
