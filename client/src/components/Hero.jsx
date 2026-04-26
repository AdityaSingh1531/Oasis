import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Heart, ShieldAlert, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background/Outer Wrapper */}
      <div className="flex flex-col lg:flex-row min-h-screen w-full">
        {/* Left Panel - Victims/Seekers (Larger/Asymmetric) */}
        <motion.div 
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => navigate('/seeker')}
          className="relative flex-[1.4] h-[50vh] lg:h-screen group cursor-pointer overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10"
        >
          <div className="absolute inset-0 bg-oasis-red/5 group-hover:bg-oasis-red/10 transition-colors duration-700" />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 lg:p-12 text-center">
            <motion.div 
              animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="mb-4 lg:mb-8"
            >
              <AlertCircle strokeWidth={1.5} className="w-16 h-16 lg:w-24 lg:h-24 text-oasis-red drop-shadow-[0_0_20px_rgba(255,59,59,0.5)]" />
            </motion.div>
            <h2 className="text-4xl lg:text-8xl font-black text-[var(--text-primary)] mb-4 lg:mb-6 tracking-tight uppercase leading-[0.85]">
              I Need <br/> <span className="text-oasis-red">Assistance</span>
            </h2>
            <p className="text-[var(--text-secondary)] text-sm lg:text-lg max-w-xs lg:max-w-sm font-medium leading-relaxed hidden sm:block">
              Immediate AI-triaged response for individuals in crisis zones. Secure, redundant, and prioritized.
            </p>
            
            <div className="mt-8 lg:mt-12 px-8 lg:px-10 py-3 lg:py-4 bg-oasis-red text-white font-black tracking-[0.25em] rounded-full animate-heartbeat btn-premium-glow active:scale-[0.98] transition-all uppercase text-xs lg:text-base cursor-pointer hover:shadow-[0_0_50px_rgba(255,59,59,0.6)]">
              Initialize SOS
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oasis-red/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        </motion.div>

        {/* Right Panel - Volunteers (Smaller/Asymmetric) */}
        <motion.div 
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => navigate('/signup')}
          className="relative flex-1 h-[50vh] lg:h-screen group cursor-pointer overflow-hidden"
        >
          <div className="absolute inset-0 bg-oasis-green/5 group-hover:bg-oasis-green/10 transition-colors duration-700" />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 lg:p-12 text-center">
            <motion.div className="mb-4 lg:mb-8 group-hover:scale-110 transition-transform duration-700">
              <Heart strokeWidth={1.5} className="w-12 h-12 lg:w-20 lg:h-20 text-oasis-green drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
            </motion.div>
            <h2 className="text-3xl lg:text-6xl font-black text-[var(--text-primary)] mb-4 lg:mb-6 tracking-tight uppercase leading-[0.85]">
              I Want To <br/> <span className="text-oasis-green">Aid Others</span>
            </h2>
            <p className="text-[var(--text-secondary)] text-sm lg:text-base max-w-xs font-medium hidden sm:block">
              Join the elite responder network. Coordinate aid and manage field logistics.
            </p>
            
            <div className="mt-8 lg:mt-12 px-8 lg:px-10 py-3 lg:py-4 bg-[var(--bg-secondary)] text-[var(--text-primary)] font-black tracking-[0.25em] rounded-full border border-white/5 group-hover:bg-oasis-green group-hover:text-white group-hover:border-transparent group-hover:btn-premium-glow-green active:scale-[0.98] transition-all uppercase text-xs lg:text-base cursor-pointer">
              Active Overwatch
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oasis-green/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        </motion.div>
      </div>

      {/* Floating Shortcuts Overlay */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-4 w-fit h-fit pointer-events-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); navigate('/authority'); }}
            className="flex items-center gap-2 px-4 py-2 glass-panel border border-white/10 rounded-full transition-all group hover:bg-oasis-blue/20 hover:border-oasis-blue/40 active:scale-[0.98]"
          >
            <ShieldAlert strokeWidth={1.5} className="w-3.5 h-3.5 text-oasis-blue" />
            <span className="text-[9px] font-black tracking-[0.25em] uppercase text-[var(--text-primary)]">Authority Node</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); navigate('/missions'); }}
            className="flex items-center gap-2 px-4 py-2 glass-panel border border-white/10 rounded-full transition-all group hover:bg-oasis-green/20 hover:border-oasis-green/40 active:scale-[0.98]"
          >
             <Users strokeWidth={1.5} className="w-3.5 h-3.5 text-oasis-green" />
             <span className="text-[9px] font-black tracking-[0.25em] uppercase text-[var(--text-primary)]">Field Missions</span>
          </button>
      </div>
    </div>
  );
};

export default Hero;
