import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import AIAssistantInput from '../components/AIAssistantInput';

const LandingPage = () => {
  return (
    <main className="relative min-h-screen bg-oasis-dark overflow-hidden">
      <Navbar />
      <Hero />
      <AIAssistantInput />
      
      {/* Global Ambient Glows */}
      <div className="fixed top-0 left-0 w-1/3 h-1/3 bg-oasis-red/5 blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed top-0 right-0 w-1/3 h-1/3 bg-oasis-green/5 blur-[120px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
    </main>
  );
};

export default LandingPage;
