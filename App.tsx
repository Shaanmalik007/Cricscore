
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ScoringProvider } from './context/ScoringContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Home } from './components/Home';
import { MatchSetup } from './components/MatchSetup';
import { LiveScoring } from './components/LiveScoring';
import { TeamManagement } from './components/TeamManagement';
import { MatchSummary } from './components/MatchSummary';
import { TournamentDashboard } from './components/TournamentDashboard';
import { BroadcastView } from './components/BroadcastView';
import { SpectatorLive } from './components/SpectatorLive'; // New Import

// Auth Pages & Components
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MemberRoute } from './components/auth/MemberRoute';
import { UpgradeModal } from './components/common/UpgradeModal';

const App = () => {
  return (
    <AuthProvider>
      <ScoringProvider>
        <Router>
          <UpgradeModal />
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Public Spectator Routes (No Auth Required) */}
            <Route path="/spectate/:gameId" element={<SpectatorLive />} />
            <Route path="/broadcast/:id" element={<BroadcastView />} />

            {/* Basic Protected Routes (Free & Member) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/teams" element={<Layout><TeamManagement /></Layout>} />
              <Route path="/tournaments" element={<Layout><TournamentDashboard /></Layout>} />
              <Route path="/summary/:id" element={<Layout><MatchSummary /></Layout>} />
            </Route>

            {/* Member Only Routes */}
            <Route element={<MemberRoute><Layout><MatchSetup /></Layout></MemberRoute>}>
               <Route path="/new-match" element={<MatchSetup />} />
            </Route>
            
            <Route element={<MemberRoute><Layout><LiveScoring /></Layout></MemberRoute>}>
               <Route path="/match/:id" element={<LiveScoring />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ScoringProvider>
    </AuthProvider>
  );
};

export default App;
