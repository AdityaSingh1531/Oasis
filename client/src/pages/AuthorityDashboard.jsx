import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Building2, MapPin, AlertCircle, FileText, Activity, Share2, Filter } from 'lucide-react';
import { useMissions } from '../contexts/MissionContext';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#181818" }] },
    { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] }
  ]
};

const AuthorityDashboard = () => {
  const { missions } = useMissions();
  const [activeTab, setActiveTab] = useState('medical');
  const [selectedMission, setSelectedMission] = useState(null);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const filteredRequests = missions.filter(m => m.category === activeTab);

  const TABS = [
    { id: 'medical', label: 'Hospitals' },
    { id: 'logistics', label: 'Logistics' },
    { id: 'shelter', label: 'Shelter' },
    { id: 'food', label: 'Food Aid' }
  ];

  const getMarkerColor = (priority) => {
    switch (priority) {
      case 'critical': return '#FF3B3B';
      case 'high': return '#F97316';
      default: return '#22C55E';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 lg:p-12 text-[var(--text-primary)] overflow-x-hidden relative">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 glass-panel rounded-2xl flex items-center justify-center">
            <Building2 strokeWidth={1.5} className="w-6 h-6 text-oasis-blue" />
          </div>
          <div>
            <p className="text-[10px] font-black text-[var(--text-secondary)] tracking-widest uppercase">Authority Command</p>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tighter uppercase">Institutional <span className="text-[var(--text-secondary)]">Portal</span></h1>
          </div>
        </div>
        
        <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] rounded-2xl glass-panel w-full lg:w-auto overflow-x-auto no-scrollbar">
            {TABS.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-6 py-3 text-[10px] font-black tracking-[0.2em] uppercase rounded-xl transition-all active:scale-95 cursor-pointer ${activeTab === tab.id ? 'bg-white/10 text-[var(--text-primary)] shadow-2xl scale-[1.02]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {tab.label}
              </button>
            ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 mb-12">
        <aside className="lg:col-span-3 space-y-6">
            <div className="glass-panel p-8 rounded-[2.5rem] depth-glow-blue">
                <Activity strokeWidth={1.5} className="w-10 h-10 text-oasis-blue mb-6" />
                <h3 className="text-4xl font-black tracking-tighter text-[var(--text-primary)]">{missions.length}</h3>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-2">Active Incidents</p>
            </div>

            <div className="glass-panel p-8 rounded-[2.5rem]">
                <Shield strokeWidth={1.5} className="w-10 h-10 text-[var(--text-secondary)] mb-6 opacity-20" />
                <h3 className="text-xs font-black tracking-widest uppercase mb-4 text-[var(--text-secondary)]">Database Sync</h3>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-oasis-green animate-pulse" />
                    <p className="text-[8px] font-bold text-oasis-green uppercase tracking-widest">Real-time Link Active</p>
                </div>
            </div>
        </aside>

        <main className="lg:col-span-9">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredRequests.length === 0 ? (
                    <div className="col-span-full py-20 text-center opacity-30">
                        <p className="text-sm font-bold uppercase tracking-widest">No active requests in this sector</p>
                    </div>
                ) : filteredRequests.map((req, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={req.id}
                        className="glass-panel p-6 rounded-3xl group hover:border-oasis-blue/30 transition-all flex flex-col"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-2 rounded-lg ${req.priority === 'critical' ? 'bg-oasis-red text-white' : req.priority === 'high' ? 'bg-orange-500 text-white' : 'bg-oasis-green text-white'} shadow-lg shadow-black/20`}>
                                <AlertCircle strokeWidth={1.5} className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">#{req.id.slice(-6)}</span>
                        </div>
                        
                        <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase mb-4 tracking-tight leading-tight flex-1">
                            {req.raw_text}
                        </h4>
                        
                        <div className="mb-4">
                            <p className="text-[10px] font-black text-oasis-blue uppercase tracking-widest mb-1">AI Intel</p>
                            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                                Road: {req.road_conditions} • Vehicle: {req.vehicle_match} • Qty: {req.quantity}
                            </p>
                        </div>
                        
                        <div className="pt-4 border-t border-white/[var(--border-alpha)] flex justify-between items-center">
                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                <MapPin strokeWidth={1.5} className="w-3 h-3" />
                                <span className="text-[10px] font-black uppercase">
                                    {req.location?.lat.toFixed(3)}, {req.location?.lng.toFixed(3)}
                                </span>
                            </div>
                            <button 
                              onClick={() => setSelectedMission(req)}
                              className="text-[8px] font-black text-oasis-blue tracking-[0.2em] uppercase px-3 py-2 hover:bg-oasis-blue/10 rounded-lg transition-all active:scale-95 cursor-pointer"
                            >
                                Track
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </main>
      </div>

      <section className="relative z-10 w-full h-[500px] rounded-[3rem] overflow-hidden glass-panel border border-white/5 bg-[#111]">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={[30.3165, 78.0322]}
            zoom={12}
            options={mapOptions}
          >
            {missions.map(m => (
              <Marker 
                key={m.id} 
                position={m.location}
                onClick={() => setSelectedMission(m)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: getMarkerColor(m.priority),
                  fillOpacity: 1,
                  strokeColor: 'white',
                  strokeWeight: 2,
                  scale: 6
                }}
              />
            ))}

            {selectedMission && (
              <InfoWindow
                position={selectedMission.location}
                onCloseClick={() => setSelectedMission(null)}
              >
                <div className="p-2 min-w-[200px] bg-[#1a1a1a] text-white rounded-lg">
                  <p className="text-[10px] font-black uppercase text-oasis-blue mb-1">{selectedMission.category}</p>
                  <p className="text-[11px] font-bold text-white leading-tight italic">"{selectedMission.raw_text}"</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-white/20 font-black uppercase tracking-widest animate-pulse">Establishing Command Grid...</p>
          </div>
        )}
      </section>

      <div className="fixed bottom-8 left-8 hidden lg:flex items-center gap-4 z-20">
          <div className="w-2 h-2 bg-oasis-green rounded-full animate-pulse" />
          <p className="text-[8px] font-black text-[var(--text-secondary)] tracking-[0.3em] uppercase">Cloud Sync: Synchronized</p>
      </div>
    </div>
  );
};

export default AuthorityDashboard;
