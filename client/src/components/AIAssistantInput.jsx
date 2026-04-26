import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Terminal } from 'lucide-react';

const AIAssistantInput = () => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="fixed bottom-12 left-0 right-0 z-50 flex justify-center px-6">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="w-full max-w-2xl relative"
      >
        {/* Ambient Glow behind input */}
        <div className={`absolute inset-0 transition-opacity duration-700 blur-[40px] rounded-full ${isFocused ? 'bg-oasis-red/20 opacity-100' : 'bg-white/5 opacity-0'}`} />
        
        <div className={`relative flex items-center p-1.5 transition-all duration-500 rounded-2xl glass-panel ${isFocused ? 'shadow-[0_0_40px_rgba(255,255,255,0.05)]' : ''}`}>
          <div className={`p-3 rounded-xl transition-colors duration-500 ${isFocused ? 'bg-oasis-red text-white' : 'bg-white/5 text-white/40'}`}>
            <Terminal className="w-5 h-5" />
          </div>
          
          <input 
            type="text" 
            placeholder="Describe the situation..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-white placeholder:text-white/20 font-medium"
          />
          
          <div className="flex items-center gap-3 px-4">
            <AnimatePresence>
              {inputValue && (
                <motion.button 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
            <span className="text-[10px] font-bold text-white/20 tracking-widest uppercase hidden sm:block">AI INTEL</span>
          </div>
        </div>
        
        {/* Subtle status text below */}
        <motion.p 
          animate={{ opacity: isFocused ? 1 : 0, y: isFocused ? 10 : 0 }}
          className="absolute left-0 right-0 text-center text-[10px] text-white/30 font-bold tracking-[0.2em] uppercase pointer-events-none"
        >
          Neural Engine Listening • Awaiting Field Input
        </motion.p>
      </motion.div>
    </div>
  );
};

export default AIAssistantInput;
