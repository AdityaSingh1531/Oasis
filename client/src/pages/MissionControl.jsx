import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Map as MapIcon, AlertTriangle, Shield, List, Search, MapPin, ChevronRight, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMissions } from '../contexts/MissionContext';
import { useAuth } from '../contexts/AuthContext';
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

const MissionControl = () => {
  const navigate = useNavigate();
  const { missions, acceptMission } = useMissions();
  const { user } = useAuth();
  const [filter, setFilter] = useState('All');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedMission, setSelectedMission] = useState(null);
  const [nearbyVolunteers, setNearbyVolunteers] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 30.3165, lng: 78.0322 });
  const [hasCentered, setHasCentered] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  // Track current user location for the map
  React.useEffect(() => {
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
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
      return () => navigator.geolocation.clearWatch(id);
    }
  }, [hasCentered]);

  const fetchNearbyVolunteers = async (loc) => {
    try {
      const res = await fetch(`/api/volunteers/nearby?lat=${loc.lat}&lng=${loc.lng}&radius=2`);
      const data = await res.json();
      if (res.ok) setNearbyVolunteers(data.volunteers.filter(v => v.id !== user?.id));
    } catch (e) {
      console.error("Proximity fetch error:", e);
    }
  };

  const filteredMissions = filter === 'All' ? missions : missions.filter(m => m.priority === filter.toLowerCase());

  const handleSelectMission = (m) => {
    setSelectedMission(m);
    setMapCenter(m.location);
    fetchNearbyVolunteers(m.location);
  };

  const handleAccept = (id) => {
    acceptMission(id);
    navigate(`/response/${id}`);
  };

  const getMarkerColor = (priority) => {
    switch (priority) {
      case 'critical': return '#FF3B3B';
      case 'high': return '#F97316';
      default: return '#22C55E';
    }
  };

  return (
    <div className="flex h-screen bg-oasis-dark overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/5 bg-white/[0.02] flex flex-col z-20">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-oasis-blue/20 flex items-center justify-center">
              <Shield strokeWidth={1.5} className="w-5 h-5 text-oasis-blue" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/30 tracking-widest uppercase">Operator</p>
              <h2 className="text-sm font-bold text-white uppercase">{user?.name || "GUEST"}</h2>
            </div>
          </div>
          
          <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
            {['All', 'Critical', 'High'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase rounded-lg transition-all ${filter === f ? 'bg-white/10 text-white shadow-xl' : 'text-white/30 hover:text-white/60'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          <p className="px-2 text-[10px] font-black text-white/20 tracking-[0.2em] uppercase">Live Intelligence Feed</p>
          {filteredMissions.length === 0 ? (
             <p className="p-4 text-[10px] text-white/20 uppercase text-center italic">No active missions found</p>
          ) : filteredMissions.map(m => (
            <motion.div 
              layoutId={m.id}
              key={m.id}
              onClick={() => handleSelectMission(m)}
              className={`p-5 glass-panel rounded-2xl hover:bg-white/[0.06] transition-colors cursor-pointer group relative overflow-hidden ${selectedMission?.id === m.id ? 'border-oasis-blue/50 bg-oasis-blue/5' : ''}`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${m.priority === 'critical' ? 'bg-oasis-red text-white' : 'bg-orange-500 text-white'}`}>
                  {m.priority}
                </span>
                <p className="text-[10px] font-bold text-white/30 uppercase">{m.category}</p>
              </div>
              <h3 className="text-white font-bold leading-snug group-hover:text-oasis-blue transition-colors truncate">{m.raw_text}</h3>
              <p className="text-white/30 text-[10px] mt-2 flex items-center gap-1 uppercase tracking-wider">
                <MapPin strokeWidth={1.5} className="w-3 h-3" /> Location: {m.location?.lat.toFixed(2)}, {m.location?.lng.toFixed(2)}
              </p>
              
              <div className="absolute right-4 bottom-5 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                <ChevronRight strokeWidth={1.5} className="w-5 h-5 text-oasis-blue" />
              </div>
            </motion.div>
          ))}
        </div>
      </aside>

      {/* Main Map View */}
      <main className="flex-1 relative bg-[#0d0d0d]">
        <div className="absolute inset-0 z-0">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={14}
              options={mapOptions}
            >
              {/* Current User Marker */}
              {userLocation && (
                <Marker 
                  position={userLocation} 
                  icon={{
                    path: 0, // Circle
                    fillColor: '#3B82F6',
                    fillOpacity: 1,
                    strokeColor: 'white',
                    strokeWeight: 2,
                    scale: 8
                  }}
                />
              )}

              {/* Nearby Volunteers */}
              {nearbyVolunteers.map(v => (
                <Marker 
                  key={v.id}
                  position={v.currentLocation}
                  icon={{
                    path: 0,
                    fillColor: '#00D1FF',
                    fillOpacity: 0.6,
                    strokeColor: '#00D1FF',
                    strokeWeight: 1,
                    scale: 5
                  }}
                />
              ))}

              {/* Emergency Markers */}
              {filteredMissions.map(m => (
                <Marker 
                  key={m.id}
                  position={m.location}
                  onClick={() => handleSelectMission(m)}
                />
              ))}

              {selectedMission && (
                <InfoWindow 
                  position={selectedMission.location} 
                  onCloseClick={() => setSelectedMission(null)}
                >
                  <div className="p-3 min-w-[200px]">
                    <p className="text-[8px] font-black text-oasis-blue uppercase tracking-widest mb-1">Target Intel</p>
                    <h4 className="text-black font-black uppercase text-sm mb-2">{selectedMission.category}</h4>
                    <p className="text-[10px] text-gray-600 mb-4">{selectedMission.location_name}</p>
                    
                    <div className="bg-oasis-blue/10 p-2 rounded-lg mb-4">
                      <p className="text-[10px] font-bold text-oasis-blue flex items-center gap-2">
                        <Shield className="w-3 h-3" />
                        {nearbyVolunteers.length} Volunteers Nearby (2km)
                      </p>
                    </div>

                    <button 
                      onClick={() => handleAccept(selectedMission.id)}
                      className="w-full py-3 bg-oasis-blue text-white text-[10px] font-black uppercase rounded-xl hover:bg-oasis-blue/90 transition-all"
                    >
                      Accept Mission
                    </button>
                  </div>
                </InfoWindow>
              )}

            </GoogleMap>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-white/20 font-black uppercase tracking-widest animate-pulse">Initializing Global Grid...</p>
            </div>
          )}
        </div>
        
        <div className="absolute inset-0 p-12 pointer-events-none z-10">
          <div className="flex justify-between items-start">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Mission <br/> <span className="text-white/20 italic">Control</span>
            </h1>
            
            <div className="flex gap-4 pointer-events-auto">
              <div className="glass-panel p-4 rounded-2xl flex items-center gap-6 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-oasis-red animate-ping" />
                  <p className="text-[10px] font-black text-white/40 tracking-widest uppercase">
                    {missions.filter(m => m.priority === 'critical').length} Critical
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-oasis-green" />
                  <p className="text-[10px] font-black text-white/40 tracking-widest uppercase">
                    {missions.length} Total Needs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global UI Elements */}
        <div className="absolute bottom-8 right-8 flex gap-4 z-10">
            <button 
              onClick={() => {
                if (userLocation) {
                   // Center logic is handled by GoogleMap's 'center' prop being bound to userLocation
                }
              }}
              className="w-12 h-12 rounded-xl bg-oasis-blue/20 hover:bg-oasis-blue/40 text-oasis-blue flex items-center justify-center transition-all border border-oasis-blue/30 active:scale-95 cursor-pointer shadow-2xl backdrop-blur-xl"
            >
                <MapPin strokeWidth={1.5} className="w-5 h-5" />
            </button>
            <button className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all border border-white/5 active:scale-95 cursor-pointer shadow-2xl backdrop-blur-xl">
                <Activity strokeWidth={1.5} className="w-5 h-5" />
            </button>
        </div>
      </main>
    </div>
  );
};

export default MissionControl;
