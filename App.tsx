
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

// Auth Pages
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const App = () => {
  return (
    <AuthProvider>
      <ScoringProvider>
        <Router>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Public Broadcast View (No Auth Required) */}
            <Route path="/broadcast/:id" element={<BroadcastView />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/teams" element={<Layout><TeamManagement /></Layout>} />
              <Route path="/new-match" element={<Layout><MatchSetup /></Layout>} />
              <Route path="/tournaments" element={<Layout><TournamentDashboard /></Layout>} />
              <Route path="/match/:id" element={<Layout><LiveScoring /></Layout>} />
              <Route path="/summary/:id" element={<Layout><MatchSummary /></Layout>} />
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
