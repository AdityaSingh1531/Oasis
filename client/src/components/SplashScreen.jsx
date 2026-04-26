import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.jpeg';

const SplashScreen = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[5000] bg-[#000000] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Tactical Scanning Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:40px_40px]" />
        <motion.div 
          animate={{ y: ["-100%", "100%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-b from-transparent via-oasis-red/20 to-transparent h-1 bg-opacity-50"
        />
      </div>

      {/* Faded Squarish Borders (Full Width) */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
        <div className="w-full flex justify-between">
          <div className="w-12 h-12 border-t-2 border-l-2 border-white/10" />
          <div className="w-12 h-12 border-t-2 border-r-2 border-white/10" />
        </div>
        <div className="w-full flex justify-between">
          <div className="w-12 h-12 border-b-2 border-l-2 border-white/10" />
          <div className="w-12 h-12 border-b-2 border-r-2 border-white/10" />
        </div>
      </div>

      {/* Background Neural Pulse */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute w-[800px] h-[800px] bg-oasis-red/20 rounded-full blur-[120px] pointer-events-none"
      />

      <div className="relative flex flex-col items-center">
        {/* The Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="w-80 h-80 relative mb-8"
        >
          <img 
            src={logo} 
            alt="Oasis Logo" 
            className="w-full h-full object-contain mix-blend-screen" 
            style={{
              maskImage: 'radial-gradient(circle, black 40%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 80%)'
            }}
          />
          
          {/* Outer Glow Ring */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 2 }}
            className="absolute inset-0 rounded-full shadow-[0_0_100px_rgba(255,255,255,0.05)] pointer-events-none"
          />
        </motion.div>

        {/* Text Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="text-center"
        >
          <h1 className="text-2xl font-black text-white tracking-[0.4em] uppercase mb-2">OASIS</h1>
          <div className="h-[1px] w-12 bg-oasis-red mx-auto mb-4" />
          <p className="text-[10px] font-bold text-white/40 tracking-[0.5em] uppercase">Emergency Response Intelligence</p>
        </motion.div>
      </div>

      {/* Loading Progress Bar */}
      <div className="absolute bottom-20 w-48 h-[2px] bg-white/5 overflow-hidden rounded-full">
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: 4, ease: "easeInOut" }}
          className="w-full h-full bg-oasis-red shadow-[0_0_10px_#FF3B3B]"
        />
      </div>
    </motion.div>
  );
};

export default SplashScreen;
