
import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ScoringProvider } from './context/ScoringContext';
import { Layout } from './components/Layout';
import { Home } from './components/Home';
import { MatchSetup } from './components/MatchSetup';
import { LiveScoring } from './components/LiveScoring';
import { TeamManagement } from './components/TeamManagement';
import { MatchSummary } from './components/MatchSummary';
import { TournamentDashboard } from './components/TournamentDashboard';

const App = () => {
  return (
    <ScoringProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/teams" element={<TeamManagement />} />
            <Route path="/new-match" element={<MatchSetup />} />
            <Route path="/tournaments" element={<TournamentDashboard />} />
            <Route path="/match/:id" element={<LiveScoring />} />
            <Route path="/summary/:id" element={<MatchSummary />} />
          </Routes>
        </Layout>
      </Router>
    </ScoringProvider>
  );
};

export default App;
