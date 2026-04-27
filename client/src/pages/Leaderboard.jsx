import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Star, TrendingUp, Users, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

const Leaderboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ leaderboard: [], month: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/leaderboard`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Leaderboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankColor = (rank) => {
    switch(rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-amber-600';
      default: return 'text-white/40';
    }
  };

  const getRankBg = (rank) => {
    switch(rank) {
      case 1: return 'bg-yellow-400/10 border-yellow-400/20';
      case 2: return 'bg-gray-300/10 border-gray-300/20';
      case 3: return 'bg-amber-600/10 border-amber-600/20';
      default: return 'bg-white/[0.02] border-white/5';
    }
  };

  return (
    <div className="min-h-screen bg-oasis-dark p-6 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex items-center gap-8">
          <button 
            onClick={() => navigate('/')}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group"
          >
            <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white" />
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-oasis-blue/20 rounded-2xl">
              <Trophy className="w-8 h-8 text-oasis-blue" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Oasis Vanguard</h1>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">Operational Honors • 2026-27 Cycle</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid gap-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 bg-white/5 rounded-[2rem] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {data.leaderboard.map((vol) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={vol.rank}
                className={`flex items-center gap-6 p-6 rounded-[2.5rem] border transition-all ${getRankBg(vol.rank)}`}
              >
                <div className={`text-2xl font-black italic min-w-[40px] ${getRankColor(vol.rank)}`}>
                  #{vol.rank}
                </div>

                <div className="flex-1">
                  <h3 className="text-white font-bold uppercase tracking-wide">{vol.name}</h3>
                  <div className="flex gap-4 mt-1">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest flex items-center gap-1">
                      <Star className="w-2 h-2" /> Tier 1 Responder
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-black text-white tracking-tighter">{vol.monthlyPoints}</p>
                  <p className="text-[8px] font-black text-oasis-blue uppercase tracking-widest">Cycle Points</p>
                </div>

                <div className="hidden sm:block border-l border-white/5 pl-6 ml-2">
                   <p className="text-sm font-bold text-white/60">{vol.totalPoints}</p>
                   <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Lifetime</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
