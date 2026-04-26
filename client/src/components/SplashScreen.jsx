import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';

const SplashScreen = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[5000] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
    >
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
          className="w-64 h-64 relative mb-8"
        >
          <img src={logo} alt="Oasis Logo" className="w-full h-full object-contain" />
          
          {/* Outer Glow Ring */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 2 }}
            className="absolute inset-0 rounded-full border-2 border-oasis-red/20 blur-sm"
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
