import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, ArrowLeft, Loader2, ShieldCheck, AlertTriangle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

const SeekerPortal = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [textInput, setTextInput] = useState('');

  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 30.3165, lng: 78.0322 }), // Default: Dehradun
        { timeout: 5000 }
      );
    });
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    setIsAnalyzing(true);
    
    const user_location = await getCurrentLocation();

    try {
      const response = await fetch(`${API_BASE_URL}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          raw_text: textInput,
          user_location 
        })
      });
      const result = await response.json();
      if (response.ok) {
        setTriageResult({
          severity: result.data.priority,
          message: result.data.raw_text,
          routing: `Request logged (ID: ${result.data.id}). Dispatching ${result.data.vehicle_match}...`
        });
        setTextInput('');
      } else {
        console.error('Report failed:', result.error);
        alert('Report failed: ' + (result.error || 'Server error. Please try again.'));
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Network error connecting to the server. Please check your connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  const navigate = useNavigate();

  const handleStartTriage = () => {
    setIsRecording(true);
    setTimeout(async () => {
      setIsRecording(false);
      setIsAnalyzing(true);
      
      const user_location = await getCurrentLocation();
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            raw_text: "Distress detected. Flash flood imminent in Sector 7.",
            user_location
          })
        });
        const result = await response.json();
        
        if (response.ok) {
          setTriageResult({
            severity: result.data?.priority || 'Critical',
            message: result.data?.raw_text || 'Distress signal received.',
            routing: result.message || 'Redirecting to rescue network...'
          });
        } else {
          console.error('AI Analysis failed:', result.error);
          alert('AI Analysis failed: ' + (result.error || 'Server error. Please try again.'));
        }
      } catch (error) {
        console.error('AI Analysis failed:', error);
        alert('Network error connecting to the server. Please check your connection.');
      } finally {
        setIsAnalyzing(false);
      }
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-oasis-dark relative flex flex-col items-center justify-center p-6 overflow-hidden">
      <header className="absolute top-12 left-8 flex items-center gap-6">
        <button 
          onClick={() => navigate('/')}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group"
        >
          <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Seeker Portal</h1>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Emergency Intelligence Network</p>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!isAnalyzing && !triageResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center"
          >
            <motion.div 
              animate={isRecording ? { scale: [1, 1.2, 1], boxShadow: ["0 0 0px rgba(255,59,59,0)", "0 0 40px rgba(255,59,59,0.4)", "0 0 0px rgba(255,59,59,0)"] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
              onClick={handleStartTriage}
              className={`w-32 h-32 rounded-full flex items-center justify-center cursor-pointer transition-all duration-500 active:scale-95 ${isRecording ? 'bg-oasis-red' : 'bg-white/5 hover:bg-white/10'}`}
            >
              <Mic strokeWidth={1.5} className={`w-12 h-12 ${isRecording ? 'text-white' : 'text-white/40'}`} />
            </motion.div>
            
            <h1 className="mt-12 text-4xl font-black text-white tracking-tighter uppercase text-center">
              {isRecording ? "Listening to your situation..." : "Tap to Speak"}
            </h1>
            <p className="mt-4 text-white/40 text-sm font-medium tracking-wide uppercase">
              {isRecording ? "Oasis AI is filtering for keywords" : "Describe the emergency clearly"}
            </p>

            {isRecording ? (
              <div className="mt-12 flex gap-1 h-8 items-center">
                {[...Array(12)].map((_, i) => (
                  <motion.div 
                    key={i}
                    animate={{ height: [8, Math.random() * 32, 8] }}
                    transition={{ repeat: Infinity, duration: 0.5 + Math.random(), ease: "easeInOut" }}
                    className="w-1 bg-oasis-red rounded-full"
                  />
                ))}
              </div>
            ) : (
              <div className="w-full max-w-md mt-12 flex flex-col items-center gap-4 relative z-10 pointer-events-auto">
                <div className="w-full h-px bg-white/10 relative">
                  <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-oasis-dark px-4 text-xs font-bold text-white/40 uppercase tracking-widest">OR</span>
                </div>
                <form onSubmit={handleTextSubmit} className="w-full flex gap-2 mt-4 relative z-10 pointer-events-auto">
                  <input 
                    type="text" 
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your emergency here..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-oasis-red/50 transition-colors"
                  />
                  <button 
                    type="submit"
                    className="bg-oasis-red/20 text-oasis-red border border-oasis-red/30 px-6 rounded-xl font-bold uppercase tracking-widest hover:bg-oasis-red hover:text-white transition-all cursor-pointer active:scale-95"
                  >
                    <Send strokeWidth={1.5} className="w-5 h-5 mx-auto" />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}

        {isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <Loader2 strokeWidth={1.5} className="w-16 h-16 text-oasis-red animate-spin mb-8" />
            <h2 className="text-2xl font-bold text-white tracking-tight uppercase">AI Segregating Request...</h2>
            <div className="mt-6 flex flex-col gap-3 w-64">
              <div className="h-1 bg-white/5 overflow-hidden rounded-full">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-1/2 h-full bg-oasis-red shadow-[0_0_15px_rgba(255,59,59,0.8)]"
                />
              </div>
              <p className="text-[10px] text-white/30 font-bold tracking-[0.2em] uppercase text-center">Triage Intensity: High</p>
            </div>
          </motion.div>
        )}

        {triageResult && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center max-w-md w-full"
          >
            <div className="w-full glass-panel p-8 rounded-3xl depth-glow-red border border-oasis-red/20">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-oasis-red/20 rounded-xl">
                  <AlertTriangle strokeWidth={1.5} className="w-6 h-6 text-oasis-red" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-oasis-red tracking-widest uppercase">Classification: {triageResult.severity}</h3>
                  <p className="text-white text-lg font-bold">Rescue Operation Required</p>
                </div>
              </div>
              
              <p className="text-white/60 mb-8 leading-relaxed">
                "{triageResult.message}"
              </p>
              
              <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-oasis-green animate-pulse" />
                <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">
                  {triageResult.routing}
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setTriageResult(null)}
              className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold tracking-widest uppercase rounded-full transition-all active:scale-95 cursor-pointer"
            >
              NEW REQUEST
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background radial glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-oasis-red/5 blur-[120px] opacity-20" />
      </div>
    </div>
  );
};

export default SeekerPortal;
