import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Building2, MapPin, AlertCircle, FileText, Activity, Share2, Filter, Trash2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import { useMissions } from '../contexts/MissionContext';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  gestureHandling: "greedy",
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
  const navigate = useNavigate();
  const { missions } = useMissions();
  const [volunteers, setVolunteers] = useState([]);
  const [activeTab, setActiveTab] = useState('medical');
  const [selectedMission, setSelectedMission] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 30.3165, lng: 78.0322 });

  // Fetch volunteers for admin management
  const fetchVolunteers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/volunteers/nearby?lat=30.3&lng=78.0&radius=5000`);
      const data = await res.json();
      if (res.ok) setVolunteers(data.volunteers);
    } catch (err) { console.error("Volunteer fetch failed:", err); }
  };

  React.useEffect(() => {
    fetchVolunteers();
    const interval = setInterval(fetchVolunteers, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const deleteMission = async (id) => {
    if (!window.confirm("TERMINATE MISSION?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/missions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Mission Excised from Database.");
        window.location.reload();
      } else {
        const errData = await res.json();
        alert(`Deletion Failed: ${errData.error}`);
      }
    } catch (err) { 
      console.error(err); 
      alert("Network Error: Could not reach server.");
    }
  };

  const deleteVolunteer = async (id, isAdmin) => {
    if (isAdmin) {
      alert("PROTECTION ERROR: CANNOT EXCISE AN ADMINISTRATOR.");
      return;
    }
    if (!window.confirm("EXCISE VOLUNTEER?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/volunteers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVolunteers(v => v.filter(vol => vol.id !== id));
        alert("Personnel Record Purged.");
      }
    } catch (err) { console.error(err); }
  };
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const filteredRequests = missions.filter(m => m.category === activeTab);

  const TABS = [
    { id: 'medical', label: 'Hospitals' },
    { id: 'logistics', label: 'Logistics' },
    { id: 'shelter', label: 'Shelter' },
    { id: 'food', label: 'Food Aid' },
    { id: 'volunteers', label: 'Personnel' }
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
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/')}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group"
          >
            <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 glass-panel rounded-2xl flex items-center justify-center">
              <Building2 strokeWidth={1.5} className="w-6 h-6 text-oasis-blue" />
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--text-secondary)] tracking-widest uppercase">Authority Command</p>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tighter uppercase">Institutional <span className="text-[var(--text-secondary)]">Portal</span></h1>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => window.location.reload()}
            className="p-3 bg-oasis-blue/20 hover:bg-oasis-blue/40 rounded-2xl text-oasis-blue transition-all active:scale-95 flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Refresh Intelligence</span>
          </button>
          
          <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] rounded-2xl glass-panel overflow-x-auto no-scrollbar">
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
                             <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => deleteMission(req.id)}
                                  className="p-2 hover:bg-oasis-red/10 rounded-lg text-oasis-red/40 hover:text-oasis-red transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedMission(req);
                                    setMapCenter(req.location);
                                  }}
                                  className="text-[8px] font-black text-oasis-blue tracking-[0.2em] uppercase px-3 py-2 hover:bg-oasis-blue/10 rounded-lg transition-all active:scale-95 cursor-pointer"
                                >
                                    Track
                                </button>
                             </div>
                        </div>
                    </motion.div>
                ))}

                {activeTab === 'volunteers' && volunteers.map((vol, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={vol.id}
                        className="glass-panel p-6 rounded-3xl group hover:border-oasis-red/30 transition-all flex flex-col"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-2 bg-oasis-blue rounded-lg text-white">
                                <Shield className="w-4 h-4" />
                            </div>
                            <button 
                                onClick={() => deleteVolunteer(vol.id, vol.isAdmin)}
                                className={`p-2 rounded-lg transition-all ${vol.isAdmin ? 'opacity-20 cursor-not-allowed' : 'hover:bg-oasis-red/10 text-oasis-red/40 hover:text-oasis-red'}`}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <h4 className="text-sm font-bold text-white uppercase mb-2 tracking-tight">{vol.name}</h4>
                        <p className="text-[10px] text-white/40 font-mono mb-4">{vol.phone}</p>
                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[8px] font-black text-oasis-blue uppercase tracking-widest">{vol.vehicle} Deployment</span>
                            {vol.location && (
                                <button 
                                    onClick={() => setMapCenter(vol.location)}
                                    className="text-[8px] font-black text-white/40 hover:text-white uppercase tracking-widest"
                                >
                                    Locate
                                </button>
                            )}
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
            center={mapCenter}
            zoom={12}
            options={mapOptions}
          >
            {/* Mission Markers */}
            {activeTab !== 'volunteers' && missions.map(m => (
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

            {/* Volunteer Markers (Only in Personnel Tab) */}
            {activeTab === 'volunteers' && volunteers.map(v => (
              <Marker 
                key={v.id} 
                position={v.location || { lat: 30.3, lng: 78.0 }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: v.isAdmin ? '#FF3B3B' : '#3B82F6',
                  fillOpacity: 1,
                  strokeColor: 'white',
                  strokeWeight: 2,
                  scale: 8
                }}
                label={{
                  text: v.name.charAt(0),
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 'bold'
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
