import React, { useEffect, useState } from 'react';
import { useScoring } from '../context/ScoringContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, Plus, ChevronRight, Users, FileText, Trophy, Lock, Globe, Radio, TrendingUp, Trash2, AlertTriangle, Loader2, Play } from 'lucide-react';
import { MatchSearch } from './MatchSearch';
import * as FirestoreService from '../services/firestoreService';
import * as StorageService from '../services/storageService';
import { Match } from '../types';

export const Home = () => {
  const { state } = useScoring();
  const { user, membership, setShowUpgradeModal } = useAuth();
  const navigate = useNavigate();

  const [publicLiveMatches, setPublicLiveMatches] = useState<Match[]>([]);
  const [historyMatches, setHistoryMatches] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{ show: boolean, matchId: string | null, matchName: string }>({
    show: false, matchId: null, matchName: ''
  });
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const fetchHistory = async () => {
    const localMatches = StorageService.getMatches().filter(m => m.status === 'COMPLETED');
    const localHistory = localMatches.map(m => ({
        id: m.id,
        matchName: m.name,
        teams: m.teams,
        startTime: m.date,
        gameId: m.gameId,
        finalScore: m.innings.map(inn => ({ runs: inn.totalRuns, wickets: inn.totalWickets })),
        result: { winnerTeamId: m.winnerTeamId }
    }));
    setHistoryMatches(localHistory);

    if (user) {
        setLoadingHistory(true);
        const cloudHistory = await FirestoreService.getUserMatchHistory(user.uid);
        if (cloudHistory && cloudHistory.length > 0) {
            setHistoryMatches(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const filteredCloud = cloudHistory.filter(m => !existingIds.has(m.id));
                return [...prev, ...filteredCloud].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
            });
        }
        setLoadingHistory(false);
    }
  };

  useEffect(() => {
      FirestoreService.getLiveMatches().then(matches => {
          setPublicLiveMatches(matches?.slice(0, 3) || []);
      });
      fetchHistory();
  }, [user]);

  const activeMatch = state.matches.find(m => m.id === state.activeMatchId);

  const getWinnerDescription = (match: Match) => {
    if (!match) return '';
    if (!match.winnerTeamId) return match.abandonmentReason || 'Match Tied';
    const winner = match.teams.find(t => t.id === match.winnerTeamId);
    return `${winner?.name || 'Winner'} Won`;
  };

  const isLive = activeMatch && activeMatch.status === 'LIVE';

  const handleRestrictedAction = (e: React.MouseEvent, path: string) => {
      e.preventDefault();
      if (membership !== 'member') {
          setShowUpgradeModal(true);
      } else {
          navigate(path);
      }
  };

  const handleDeleteClick = (e: React.MouseEvent, matchId: string, matchName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteModal({ show: true, matchId, matchName });
    setDeleteConfirmText('');
  };

  const confirmDeleteMatch = async () => {
    if (!deleteModal.matchId || deleteConfirmText !== 'DELETE') return;
    
    const existing = StorageService.getMatches();
    const filtered = existing.filter(m => m.id !== deleteModal.matchId);
    localStorage.setItem('cricscore_matches', JSON.stringify(filtered));

    if (user) {
        try {
            await FirestoreService.deleteMatchHistorySnapshot(user.uid, deleteModal.matchId);
        } catch (err) {}
    }

    setDeleteModal({ show: false, matchId: null, matchName: '' });
    fetchHistory();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: Main Dashboard */}
      <section className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-[2rem] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[22px] tracking-tight font-semibold text-white">Discover Matches</h2>
                  <div className="flex gap-2">
                      <button className="hover:bg-white/10 transition bg-white/5 rounded-full p-2">
                          <Globe size={18} className="text-white/80" />
                      </button>
                  </div>
              </div>

              {/* Search */}
              <div className="mb-6">
                  <MatchSearch />
              </div>

              {/* Public Live Feed */}
              {(publicLiveMatches || []).length > 0 && (
                  <div className="mt-6">
                      <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <TrendingUp size={14} className="text-emerald-400" /> Trending Now
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                          {publicLiveMatches.map((m: Match) => {
                              const currentInn = m.innings[m.currentInningIndex];
                              
                              return (
                                <Link key={m.id} to={`/spectate/${m.gameId || m.id}`} className="glass-card rounded-2xl p-4 hover:bg-white/5 transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-20">
                                        <Radio className="text-emerald-500 animate-pulse" size={24} />
                                    </div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="text-xs text-emerald-400 font-bold tracking-wide uppercase bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">Live</div>
                                        {m.gameId && <div className="text-[10px] font-mono text-white/40">#{m.gameId}</div>}
                                    </div>
                                    
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-sm font-bold text-white">{m.teams[0]?.shortName}</div>
                                        <div className="text-xs text-white/40">vs</div>
                                        <div className="text-sm font-bold text-white">{m.teams[1]?.shortName}</div>
                                    </div>
                                    
                                    <div className="text-center mt-2 pt-2 border-t border-white/10">
                                        <div className="text-xl font-bold text-white tracking-tight">{currentInn?.totalRuns || 0}/{currentInn?.totalWickets || 0}</div>
                                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Current Score</div>
                                    </div>
                                </Link>
                              );
                          })}
                      </div>
                  </div>
              )}
          </div>

          {/* Active Match Section */}
          {activeMatch && (
            <div className="glass-panel rounded-[2rem] p-6 border-l-4 border-l-emerald-500">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                        {isLive ? <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> : <Trophy size={14}/>}
                        {isLive ? 'Active Match' : 'Recent Result'}
                    </span>
                    <span className="text-xs text-white/40">{activeMatch.type}</span>
                </div>

                <div className="grid grid-cols-3 items-center mb-6">
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center text-blue-400 font-black border border-blue-500/30 mb-2">
                            {activeMatch.teams[0].shortName.substring(0,1)}
                        </div>
                        <div className="font-bold text-white">{activeMatch.teams[0].shortName}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-white/40 mb-1">VS</div>
                        <div className="text-2xl font-black text-white/90">
                            {isLive ? 'LIVE' : 'END'}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-full flex items-center justify-center text-purple-400 font-black border border-purple-500/30 mb-2">
                            {activeMatch.teams[1].shortName.substring(0,1)}
                        </div>
                        <div className="font-bold text-white">{activeMatch.teams[1].shortName}</div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={(e) => {
                            if(isLive) handleRestrictedAction(e, `/match/${activeMatch.id}`);
                            else navigate(`/summary/${activeMatch.id}`);
                        }}
                        className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        {isLive ? <><Play size={16} className="text-emerald-400" /> Continue Scoring</> : <><FileText size={16} /> View Scorecard</>}
                    </button>
                </div>
            </div>
          )}
      </section>

      {/* RIGHT COLUMN: Actions & History */}
      <section className="space-y-6">
          {/* Quick Actions */}
          <div className="glass-panel rounded-[2rem] p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                  <div 
                      onClick={(e) => handleRestrictedAction(e, '/new-match')}
                      className="group cursor-pointer rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-800 p-4 relative overflow-hidden shadow-lg shadow-emerald-900/50 hover:shadow-emerald-900/80 transition-all"
                  >
                      <div className="relative z-10 flex items-center justify-between">
                          <div>
                              <div className="font-bold text-white text-lg">Start Match</div>
                              <div className="text-emerald-200 text-xs">New game setup</div>
                          </div>
                          <div className="bg-white/20 p-2 rounded-lg text-white">
                              <Plus size={20} />
                          </div>
                      </div>
                      {membership !== 'member' && <div className="absolute top-2 right-2 text-emerald-900/40"><Lock size={14}/></div>}
                  </div>

                  <Link to="/teams" className="group block rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                              <Users size={18} />
                          </div>
                          <div>
                              <div className="font-bold text-white text-sm">Manage Teams</div>
                              <div className="text-white/40 text-xs">Squads & Players</div>
                          </div>
                      </div>
                      <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
                  </Link>
              </div>
          </div>

          {/* History */}
          <div className="glass-panel rounded-[2rem] p-6">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">History</h3>
                  <Clock size={16} className="text-white/40" />
              </div>
              
              <div className="space-y-3">
                  {historyMatches.length === 0 ? (
                      <div className="text-center py-8 text-white/30 text-xs italic">
                          {loadingHistory ? 'Syncing...' : 'No matches yet.'}
                      </div>
                  ) : (
                      historyMatches.slice(0, 5).map(match => (
                          <div key={match.id} className="group relative">
                              <Link to={`/summary/${match.id}`} className="block bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3 transition-colors">
                                  <div className="flex justify-between items-start mb-1">
                                      <div className="text-xs font-bold text-white/90">{match.matchName}</div>
                                      <div className="text-[10px] text-white/40">{new Date(match.startTime).toLocaleDateString()}</div>
                                  </div>
                                  <div className="text-[11px] text-white/50 flex justify-between">
                                      <span>{match.teams[0]?.shortName} vs {match.teams[1]?.shortName}</span>
                                      <span className="text-emerald-400/80">{match.result?.winMargin || 'Done'}</span>
                                  </div>
                              </Link>
                              <button 
                                  onClick={(e) => handleDeleteClick(e, match.id, match.matchName)}
                                  className="absolute -right-2 -top-2 bg-red-500/20 text-red-400 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                              >
                                  <Trash2 size={12} />
                              </button>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </section>

      {/* Delete Modal */}
      {deleteModal.show && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-fade-in">
              <div className="glass-panel rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-pop border-t-4 border-red-500">
                  <div className="p-6 text-center">
                      <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-red-500/40">
                          <AlertTriangle size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">Delete Record?</h3>
                      <p className="text-white/60 text-xs mb-6">
                          Permanently remove <span className="font-bold text-white">"{deleteModal.matchName}"</span>?
                      </p>
                      
                      <div className="space-y-3">
                          <input 
                            type="text"
                            value={deleteConfirmText}
                            onChange={e => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-center font-bold tracking-widest text-white outline-none focus:ring-1 focus:ring-red-500 text-sm placeholder-white/20"
                            autoFocus
                          />
                          
                          <div className="flex gap-2">
                              <button 
                                onClick={() => setDeleteModal({ show: false, matchId: null, matchName: '' })}
                                className="flex-1 py-2.5 text-white/60 font-bold hover:bg-white/10 rounded-xl transition-all text-xs"
                              >
                                  Cancel
                              </button>
                              <button 
                                onClick={confirmDeleteMatch}
                                disabled={deleteConfirmText !== 'DELETE'}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-900/40 disabled:opacity-50 hover:bg-red-500 transition-all text-xs"
                              >
                                  Delete
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};