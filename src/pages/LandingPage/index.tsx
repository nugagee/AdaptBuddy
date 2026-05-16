import React from 'react';
import LandingNavbar from './components/LandingNavbar';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import AnalyticsSection from './components/AnalyticsSection';
import RoleSection from './components/RoleSection';
import LandingFooter from './components/LandingFooter';

const LandingPage: React.FC = () => (
  <>
    <span className="relative min-h-screen overflow-x-hidden font-sans text-adapt-navy block">
      {/* Ambient background blobs */}
      <span className="pointer-events-none fixed inset-0 -z-10 block" aria-hidden>
        <span className="absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-violet-300/30 blur-3xl" />
        <span className="absolute right-0 top-1/4 h-[32rem] w-[32rem] rounded-full bg-cyan-300/25 blur-3xl" />
        <span className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
      </span>

      <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AnalyticsSection />
        <RoleSection />
      </main>
      <LandingFooter />
    </span>
  </>
);

export default LandingPage;
