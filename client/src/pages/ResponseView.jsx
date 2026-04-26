import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, PhoneCall, AlertTriangle, ArrowLeft, Navigation, MessageSquare, Terminal, Eye, Phone, CheckCircle, MapPin, Truck, Clock } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMissions } from '../contexts/MissionContext';
import { useAuth } from '../contexts/AuthContext';
import { GoogleMap, useJsApiLoader, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';

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

const ResponseView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { missions, abortMission } = useMissions();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('intel');
  const [safetyBuddyActive, setSafetyBuddyActive] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [response, setResponse] = useState(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [mapCenter, setMapCenter] = useState({ lat: 30.3165, lng: 78.0322 });
  const [hasCentered, setHasCentered] = useState(false);

  // Safety Buddy State
  const [safetySession, setSafetySession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [buddyInfo, setBuddyInfo] = useState({ name: '', phone: '', mins: 15 });
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const mission = missions.find(m => m.id === id);

  useEffect(() => {
    if (navigator.geolocation) {
      const wid = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(newLoc);
          if (!hasCentered) {
            setMapCenter(newLoc);
            setHasCentered(true);
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(wid);
    }
  }, [hasCentered]);

  // Timer logic for Dead-Man's Switch
  useEffect(() => {
    let interval;
    if (safetySession?.expiryTime) {
      interval = setInterval(() => {
        const remaining = new Date(safetySession.expiryTime) - new Date();
        if (remaining <= 0) {
          setTimeLeft("EXPIRED - ALERT SENT");
          clearInterval(interval);
        } else {
          const m = Math.floor(remaining / 60000);
          const s = Math.floor((remaining % 60000) / 1000);
          setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [safetySession]);

  const directionsCallback = useCallback((res) => {
    if (res !== null) {
      if (res.status === 'OK') {
        setResponse(res);
        setDistance(res.routes[0].legs[0].distance.text);
        setDuration(res.routes[0].legs[0].duration.text);
      } else {
        console.log('Directions failed: ', res.status);
      }
    }
  }, []);

  const handleActivateSafety = async () => {
    if (!buddyInfo.name || !buddyInfo.phone) return alert("Please provide Buddy details");
    try {
      const res = await fetch('/api/safety/activate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.sessionToken}`
        },
        body: JSON.stringify({
          buddy_name: buddyInfo.name,
          buddy_phone: buddyInfo.phone,
          duration_mins: buddyInfo.mins
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSafetySession(data);
        setSafetyBuddyActive(true);
        setShowSafetyModal(false);
      } else {
        alert("Activation Failed: " + (data.error || "Unknown server error"));
      }
    } catch (e) {
      console.error("Safety activation error:", e);
      alert("Network Error: Could not connect to the Oasis Command Center.");
    }
  };

  const handleCheckIn = async () => {
    if (!safetySession?.id) return;
    try {
      const res = await fetch('/api/safety/checkin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.sessionToken}`
        },
        body: JSON.stringify({ session_id: safetySession.id, status: 'safe' })
      });
      if (res.ok) {
        setSafetySession(null);
        setSafetyBuddyActive(false);
        setTimeLeft(null);
        alert("Safety Protocol Deactivated. You are safe.");
      }
    } catch (e) {
      alert("Failed to deactivate");
    }
  };

  const handleResolve = async () => {
    const otp = window.prompt("Enter verification OTP provided by Seeker (Demo: 1234):");
    if (!otp) return;
    setIsResolving(true);
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.sessionToken}`
        },
        body: JSON.stringify({ request_id: id, otp })
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message);
        abortMission();
        navigate('/missions');
      } else {
        alert(result.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Resolution error:', error);
      alert('Failed to connect to server');
    } finally {
      setIsResolving(false);
    }
  };

  if (!mission) return <div className="text-[var(--text-primary)] p-20 font-black uppercase tracking-widest text-center">Mission Data Link Expired</div>;

  const isVehicleMatch = user?.vehicle === mission.vehicle_match;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col lg:flex-row overflow-x-hidden relative">
      <div className="fixed inset-0 border-[4px] lg:border-[6px] border-oasis-blue/10 pointer-events-none z-50 animate-pulse" />

      <main className="flex-1 relative flex flex-col p-4 lg:p-8 z-10 mb-24 lg:mb-0">
        <header className="flex flex-col lg:flex-row justify-between lg:items-start mb-6 lg:mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 bg-oasis-red text-white text-[8px] font-black uppercase tracking-widest rounded">LIVE MISSION</span>
              <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">ID: {mission.id}</p>
            </div>
            <h1 className="text-3xl lg:text-5xl font-black text-[var(--text-primary)] tracking-tighter uppercase leading-tight">{mission.category} Support</h1>
          </div>
          
          <div className="flex gap-4">
             <div className="glass-panel p-4 rounded-2xl flex items-center gap-4 border border-white/5">
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase opacity-40">Tactical Range</p>
                  <p className="text-sm font-black text-oasis-blue">{distance || "---"}</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-left">
                  <p className="text-[8px] font-black uppercase opacity-40">Time to Target</p>
                  <p className="text-sm font-black text-oasis-green">{duration || "---"}</p>
                </div>
             </div>
          </div>
        </header>

        <div className="flex-1 glass-panel rounded-[2rem] lg:rounded-[3rem] relative overflow-hidden border border-white/5 bg-[#111]">
             {isLoaded ? (
               <GoogleMap
                 mapContainerStyle={mapContainerStyle}
                 center={mapCenter}
                 zoom={13}
                 options={mapOptions}
               >
                 {userLocation && mission.location && (
                   <DirectionsService
                     options={{
                       destination: mission.location,
                       origin: userLocation,
                       travelMode: 'DRIVING'
                     }}
                     callback={directionsCallback}
                   />
                 )}

                 {response && (
                   <DirectionsRenderer
                     options={{
                       directions: response,
                       suppressMarkers: true,
                       polylineOptions: {
                         strokeColor: "#3B82F6",
                         strokeWeight: 6,
                         strokeOpacity: 0.8
                       }
                     }}
                   />
                 )}

                 {userLocation && (
                   <Marker 
                     position={userLocation} 
                     icon={{
                       path: google.maps.SymbolPath.CIRCLE,
                       fillColor: '#3B82F6',
                       fillOpacity: 1,
                       strokeColor: 'white',
                       strokeWeight: 2,
                       scale: 7
                     }}
                   />
                 )}

                 {mission.location && (
                   <Marker 
                     position={mission.location} 
                     icon={{
                       path: google.maps.SymbolPath.CIRCLE,
                       fillColor: '#FF3B3B',
                       fillOpacity: 1,
                       strokeColor: 'white',
                       strokeWeight: 2,
                       scale: 7
                     }}
                   />
                 )}
               </GoogleMap>
             ) : (
               <div className="w-full h-full flex items-center justify-center">
                 <p className="text-white/20 font-black uppercase tracking-widest animate-pulse">Initializing Tactical Link...</p>
               </div>
             )}

             <div className="absolute top-6 left-6 z-[1000] pointer-events-none">
                <div className="glass-panel p-4 rounded-2xl border border-white/10 backdrop-blur-xl">
                   <div className="flex items-center gap-3">
                      <Navigation className="w-4 h-4 text-oasis-blue animate-pulse" />
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">
                        {response ? 'Direct Navigation Active' : 'Acquiring Target...'}
                      </p>
                   </div>
                </div>
             </div>

             {/* Safety Buddy Status Overlay */}
             {safetyBuddyActive && (
               <div className="absolute top-6 right-6 z-[1000] pointer-events-auto">
                 <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-panel p-4 rounded-2xl border border-oasis-red/30 bg-oasis-red/5 flex items-center gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-oasis-red animate-pulse" />
                      <div>
                        <p className="text-[8px] font-black uppercase text-oasis-red tracking-[0.2em]">Guard Timer</p>
                        <p className="text-sm font-black text-white">{timeLeft || "--:--"}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleCheckIn}
                      className="px-4 py-2 bg-oasis-red text-white text-[10px] font-black uppercase rounded-lg hover:bg-oasis-red/80 transition-all"
                    >
                      I'm Safe
                    </button>
                 </motion.div>
               </div>
             )}
        </div>

              <div className="absolute bottom-12 right-12 w-24 h-24 lg:w-32 lg:h-32 pointer-events-none">
                 <motion.div 
                    animate={safetyBuddyActive ? { scale: [1, 3], opacity: [0.5, 0] } : { opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2 border-oasis-blue/40"
                 />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`p-3 rounded-full ${safetyBuddyActive ? 'bg-oasis-red text-white shadow-[0_0_20px_rgba(255,59,59,0.5)]' : 'bg-white/5 text-white/20'} transition-all`}>
                        <Shield className="w-6 h-6" />
                    </div>
                 </div>
             </div>

        <footer className="hidden lg:grid grid-cols-4 gap-6 mt-8">
             <button 
                onClick={handleResolve}
                disabled={isResolving}
                className="flex flex-col items-center gap-2 p-4 glass-panel rounded-2xl hover:bg-oasis-green/20 border-oasis-green/30 transition-all group disabled:opacity-50"
             >
                <CheckCircle className="w-5 h-5 text-oasis-green" />
                <span className="text-[8px] font-black text-oasis-green uppercase tracking-widest">Resolve Mission</span>
             </button>
             <button 
                onClick={() => setShowSafetyModal(true)}
                className={`flex flex-col items-center gap-2 p-4 glass-panel rounded-2xl transition-all ${safetyBuddyActive ? 'bg-oasis-red/10 border-oasis-red/30' : ''}`}
             >
                <Shield className={`w-5 h-5 ${safetyBuddyActive ? 'text-oasis-red' : 'text-[var(--text-primary)]'}`} />
                <span className={`text-[8px] font-black uppercase tracking-widest ${safetyBuddyActive ? 'text-oasis-red' : 'text-[var(--text-primary)]'}`}>Safety Buddy</span>
             </button>
             <a href="tel:911" className="flex flex-col items-center gap-2 p-4 glass-panel rounded-2xl hover:bg-oasis-green/10 transition-all text-center">
                <Phone className="w-5 h-5 text-oasis-green" />
                <span className="text-[8px] font-black text-[var(--text-primary)] uppercase tracking-widest">Emergency Call</span>
             </a>
             <button 
                onClick={() => { abortMission(); navigate('/missions'); }}
                className="flex flex-col items-center gap-2 p-4 glass-panel rounded-2xl hover:bg-oasis-red/10 transition-all"
             >
                <AlertTriangle className="w-5 h-5 text-oasis-red" />
                <span className="text-[8px] font-black text-[var(--text-primary)] uppercase tracking-widest">Abort Mission</span>
             </button>
        </footer>

        <div className="fixed bottom-0 left-0 right-0 p-4 lg:hidden z-50">
            <div className="glass-panel p-2 rounded-3xl flex gap-2 shadow-2xl border-t border-white/[var(--border-alpha)]">
                <button 
                    onClick={handleResolve}
                    disabled={isResolving}
                    className="flex-1 py-4 flex flex-col items-center justify-center gap-1 bg-oasis-green/20 rounded-2xl disabled:opacity-50"
                >
                    <CheckCircle className="w-5 h-5 text-oasis-green" />
                    <span className="text-[8px] font-black uppercase text-oasis-green">Resolve</span>
                </button>
                <button 
                    onClick={() => setShowSafetyModal(true)}
                    className={`flex-1 py-4 flex flex-col items-center justify-center gap-1 rounded-2xl ${safetyBuddyActive ? 'bg-oasis-red text-white' : 'bg-[var(--bg-secondary)]'}`}
                >
                    <Shield className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase">Guard</span>
                </button>
                <a href="tel:911" className="flex-1 py-4 flex flex-col items-center justify-center gap-1 bg-oasis-green text-white rounded-2xl font-black">
                    <Phone className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase">Help</span>
                </a>
                <button 
                    onClick={() => { abortMission(); navigate('/missions'); }}
                    className="flex-1 py-4 flex flex-col items-center justify-center gap-1 bg-oasis-red text-white rounded-2xl font-black"
                >
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase">Quit</span>
                </button>
            </div>
        </div>
      </main>

      <aside className="w-full lg:w-96 bg-[var(--bg-secondary)] border-t lg:border-t-0 lg:border-l border-white/[var(--border-alpha)] flex flex-col p-6 lg:p-8 z-20">
         <div className="flex gap-4 p-1 bg-[var(--bg-primary)] rounded-2xl mb-8 border border-white/[var(--border-alpha)]">
            <button 
                onClick={() => setActiveTab('intel')}
                className={`flex-1 py-3 text-[10px] font-bold tracking-widest uppercase rounded-xl transition-all ${activeTab === 'intel' ? 'glass-panel text-white shadow-xl bg-white/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
                AI Intel
            </button>
            <button 
                onClick={() => setActiveTab('comms')}
                className={`flex-1 py-3 text-[10px] font-bold tracking-widest uppercase rounded-xl transition-all ${activeTab === 'comms' ? 'glass-panel text-white shadow-xl bg-white/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
                Protocol
            </button>
         </div>

         <div className="flex-1 rounded-[2rem] p-6 glass-panel overflow-y-auto no-scrollbar">
            <AnimatePresence mode="wait">
                {activeTab === 'intel' ? (
                    <motion.div key="intel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Terminal className="w-4 h-4 text-oasis-blue" />
                            <h3 className="text-xs font-black text-oasis-blue tracking-widest uppercase">Situational Report</h3>
                        </div>
                        <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed italic opacity-80">
                            "{mission.raw_text || "Field data synchronized. Awaiting mission updates."}"
                        </p>
                        <div className="pt-4 border-t border-white/5 space-y-4">
                           <div className="flex items-center gap-3">
                              <Truck className="w-4 h-4 text-white/30" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Target Asset: <span className="text-oasis-blue">{mission.vehicle_match}</span></p>
                           </div>
                           <div className="flex items-center gap-3">
                              <AlertTriangle className="w-4 h-4 text-white/30" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Terrain: <span className="text-oasis-red">{mission.road_conditions}</span></p>
                           </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="comms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center p-8">
                         <Shield className="w-12 h-12 text-oasis-blue mb-4 opacity-20" />
                         <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Deployment Guidelines Active</p>
                    </motion.div>
                )}
            </AnimatePresence>
         </div>
         
         <div className="mt-8 p-6 glass-panel rounded-[2rem] flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full animate-pulse ${mission.priority === 'critical' ? 'bg-oasis-red' : 'bg-oasis-blue'}`} />
                  <div>
                      <p className="text-[10px] font-black text-[var(--text-primary)] uppercase">{mission.priority} Status</p>
                      <p className="text-[8px] font-bold text-[var(--text-secondary)] uppercase">Field Category: {mission.category}</p>
                  </div>
              </div>
         </div>
      </aside>

      {/* Safety Buddy Setup Modal */}
      <AnimatePresence>
        {showSafetyModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md glass-panel p-8 rounded-[3rem] border border-oasis-red/20"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-oasis-red/20 rounded-2xl">
                  <ShieldAlert className="w-8 h-8 text-oasis-red" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Safety Protocol</h3>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Dead-Man's Switch System</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[8px] font-black uppercase text-white/40 tracking-[0.2em] mb-2 block">Buddy Contact Name</label>
                  <input 
                    type="text" 
                    value={buddyInfo.name}
                    onChange={(e) => setBuddyInfo({...buddyInfo, name: e.target.value})}
                    placeholder="e.g., Mom, Friend, Partner"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-oasis-red/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-white/40 tracking-[0.2em] mb-2 block">Buddy Phone Number</label>
                  <input 
                    type="tel" 
                    value={buddyInfo.phone}
                    onChange={(e) => setBuddyInfo({...buddyInfo, phone: e.target.value})}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-oasis-red/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-white/40 tracking-[0.2em] mb-2 block">Safety Timer (Minutes)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 15, 30].map(m => (
                      <button 
                        key={m}
                        onClick={() => setBuddyInfo({...buddyInfo, mins: m})}
                        className={`py-3 rounded-xl border text-[10px] font-black uppercase transition-all ${buddyInfo.mins === m ? 'bg-oasis-red border-oasis-red text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => setShowSafetyModal(false)}
                  className="flex-1 py-4 text-[10px] font-black uppercase text-white/40 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleActivateSafety}
                  className="flex-[2] py-4 bg-oasis-red text-white text-[10px] font-black uppercase rounded-2xl shadow-lg shadow-oasis-red/20 active:scale-95 transition-all"
                >
                  Initialize Guard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResponseView;
