import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Truck, Clock, ArrowRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const VolunteerSignup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    expertise: 'First Aid',
    vehicle: 'None (Foot)',
    startTime: '08:00',
    endTime: '18:00'
  });

  const EXPERTISE_OPTIONS = ['First Aid', 'Search & Rescue', 'Logistics', 'Psychological Support', 'Technical/IT'];
  const VEHICLE_OPTIONS = ['None (Foot)', 'Two-Wheeler (Scooty/Bike)', 'Four-Wheeler (Car/Jeep)', 'Heavy Vehicle (Truck/Boat)'];
  const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  const handleComplete = async () => {
    let vehicleKey = 'scooty'; // Default
    if (formData.vehicle.includes('Heavy')) vehicleKey = 'truck';
    else if (formData.vehicle.includes('Four')) vehicleKey = '4x4';

    try {
      const response = await fetch('/api/volunteers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: formData.name, 
          phone: formData.phone,
          vehicle: vehicleKey
        })
      });
      const result = await response.json();
      if (response.ok) {
        // Merge the API result (token, id) with local form data
        login({ ...formData, ...result.volunteer });
        navigate('/missions');
      } else {
        alert(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Connection to server failed');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 lg:p-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl glass-panel p-6 lg:p-12 rounded-[2rem] depth-glow-blue relative z-10"
      >
        <div className="mb-10 lg:mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-oasis-blue rounded-xl shadow-lg shadow-oasis-blue/20">
              <Shield strokeWidth={1.5} className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase">Volunteer <span className="text-oasis-blue">Deployment</span></h1>
          </div>
          <p className="text-[var(--text-secondary)] font-medium text-sm lg:text-base">Elite crisis network registration. Define your operational parameters.</p>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-secondary)] tracking-[0.25em] uppercase px-1">Full Name</label>
              <div className="relative">
                <User strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input 
                  type="text" 
                  placeholder="OPERATOR_NAME"
                  className="w-full py-4 pl-12 pr-4 rounded-xl outline-none font-mono text-sm lg:text-base border border-transparent focus:border-oasis-blue transition-colors"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-secondary)] tracking-[0.25em] uppercase px-1">Phone Number</label>
              <div className="relative">
                <Clock strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input 
                  type="text" 
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full py-4 pl-12 pr-4 rounded-xl outline-none font-mono text-sm lg:text-base border border-transparent focus:border-oasis-blue transition-colors"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-[var(--text-secondary)] tracking-[0.25em] uppercase px-1">Core Expertise</label>
              <div className="relative">
                <Shield strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <select 
                  className="w-full py-4 pl-12 pr-10 rounded-xl appearance-none outline-none font-mono text-sm cursor-pointer border border-transparent focus:border-oasis-blue transition-colors"
                  value={formData.expertise}
                  onChange={(e) => setFormData({...formData, expertise: e.target.value})}
                >
                  {EXPERTISE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown strokeWidth={1.5} className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-secondary)] tracking-[0.25em] uppercase px-1">Vehicle Class</label>
              <div className="relative">
                <Truck strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <select 
                  className="w-full py-4 pl-12 pr-10 rounded-xl appearance-none outline-none font-mono text-sm cursor-pointer border border-transparent focus:border-oasis-blue transition-colors"
                  value={formData.vehicle}
                  onChange={(e) => setFormData({...formData, vehicle: e.target.value})}
                >
                  {VEHICLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown strokeWidth={1.5} className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--text-secondary)] tracking-[0.25em] uppercase px-1">Duty Availability</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Clock strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <select 
                  className="w-full py-4 pl-12 pr-4 rounded-xl appearance-none outline-none font-mono text-sm cursor-pointer border border-transparent focus:border-oasis-blue transition-colors"
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                >
                  {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="relative">
                <select 
                  className="w-full py-4 pr-10 pl-4 rounded-xl appearance-none outline-none font-mono text-sm cursor-pointer border border-transparent focus:border-oasis-blue transition-colors"
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                >
                  {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown strokeWidth={1.5} className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
              </div>
            </div>
          </div>

          <button 
            onClick={handleComplete}
            disabled={!formData.name || !formData.phone}
            className="w-full mt-12 py-5 bg-oasis-blue text-white font-black tracking-widest uppercase rounded-xl btn-premium-glow-blue flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.98]"
          >
            Authorize Deployment
            <ArrowRight strokeWidth={1.5} className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VolunteerSignup;
