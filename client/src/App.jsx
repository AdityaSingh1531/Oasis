import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MissionProvider } from './contexts/MissionContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Pages
import LandingPage from './pages/LandingPage';
import SeekerPortal from './pages/SeekerPortal';
import VolunteerSignup from './pages/VolunteerSignup';
import MissionControl from './pages/MissionControl';
import ResponseView from './pages/ResponseView';
import AuthorityDashboard from './pages/AuthorityDashboard';
import Leaderboard from './pages/Leaderboard';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <MissionProvider>
            <div className="App selection:bg-oasis-red/30 selection:text-white">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/seeker" element={<SeekerPortal />} />
                <Route path="/signup" element={<VolunteerSignup />} />
                <Route path="/missions" element={<MissionControl />} />
                <Route path="/response/:id" element={<ResponseView />} />
                <Route path="/authority" element={<AuthorityDashboard />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
              </Routes>
            </div>
          </MissionProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
