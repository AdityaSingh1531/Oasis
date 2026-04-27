import React from 'react';
import { Shield, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-6 pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto group cursor-pointer" onClick={() => window.location.href = '/'}>
        <div className="p-2 bg-oasis-red rounded-lg transition-transform group-hover:scale-110 shadow-lg shadow-oasis-red/20">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-black tracking-tighter text-[var(--text-primary)]">OASIS</span>
      </div>
      
      <div className="flex gap-4 pointer-events-auto items-center">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="p-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-full border border-white/[var(--border-alpha)] shadow-xl flex items-center justify-center"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-oasis-blue" />}
        </motion.button>
      </div>
    </nav>
  );
};

export default Navbar;
