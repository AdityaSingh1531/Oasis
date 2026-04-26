import React, { createContext, useContext, useState, useEffect } from 'react';

const MissionContext = createContext();

export const MissionProvider = ({ children }) => {
  const [missions, setMissions] = useState([]);
  const [activeMission, setActiveMission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const response = await fetch('/api/active-needs');
        const data = await response.json();
        setMissions(data.needs || []);
      } catch (error) {
        console.error('Error fetching missions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMissions();
    const interval = setInterval(fetchMissions, 5000); // Poll every 5 seconds

    const savedMission = localStorage.getItem('oasis_active_mission');
    if (savedMission) {
      setActiveMission(JSON.parse(savedMission));
    }

    return () => clearInterval(interval);
  }, []);

  const acceptMission = (missionId) => {
    const mission = missions.find(m => m.id === missionId);
    if (mission) {
      const updatedMission = { ...mission, status: 'Active' };
      setActiveMission(updatedMission);
      localStorage.setItem('oasis_active_mission', JSON.stringify(updatedMission));
    }
  };

  const abortMission = () => {
    setActiveMission(null);
    localStorage.removeItem('oasis_active_mission');
  };

  return (
    <MissionContext.Provider value={{ missions, activeMission, acceptMission, abortMission, loading }}>
      {children}
    </MissionContext.Provider>
  );
};

export const useMissions = () => useContext(MissionContext);
