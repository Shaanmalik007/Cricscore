import React, { useEffect, useState } from 'react';
import { useScoring } from '../context/ScoringContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, Plus, ChevronRight, Users, FileText, Trophy, Lock, Globe, Radio, TrendingUp, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { MatchSearch } from './MatchSearch';
import * as FirestoreService from '../services/firestoreService';
import { Match } from '../types';

export const Home = () => {
  const { state } = useScoring();
  const { user, membership, setShowUpgradeModal } = useAuth();
  const navigate = useNavigate();

  // Public Live Matches State
  const [publicLiveMatches, setPublicLiveMatches] = useState<Match[]>([]);
  const [historyMatches, setHistoryMatches] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ show: boolean, matchId: string | null, matchName: string }>({
    show: false, matchId: null, matchName: ''
  });
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const fetchHistory = async () => {
    if (user) {
        setLoadingHistory(true);
        const history = await FirestoreService.getUserMatchHistory(user.uid);
        setHistoryMatches(history);
        setLoadingHistory(false);
    }
  };

  useEffect(() => {
      // Fetch public live matches
      FirestoreService.getLiveMatches().then(matches => {
          setPublicLiveMatches(matches?.slice(0, 3) || []);
      });
      fetchHistory();
  }, [user]);

  const activeMatch = state.matches.find(m => m.id === state.activeMatchId);

  const getWinnerDescription = (match: Match) => {
    if (!match) return '';
    if (!match.winnerTeamId) return 'Match Tied';
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
    if (!user || !deleteModal.matchId || deleteConfirmText !== 'DELETE') return;
    
    try {
        await FirestoreService.deleteMatchHistorySnapshot(user.uid, deleteModal.matchId);
        setDeleteModal({ show: false, matchId: null, matchName: '' });
        fetchHistory(); // Refresh list
    } catch (error) {
        alert("Failed to delete match history.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="mb-4">
        <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
        <p className="text-gray-600">Manage your tournaments and score matches in real-time.</p>
      </header>

      {/* --- SPECTATOR SEARCH SECTION --- */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl text-white">
          <div className="flex items-center gap-2 mb-4">
              <Globe className="text-emerald-400" />
              <h3 className="text-xl font-bold">Find Live Matches</h3>
          </div>
          <MatchSearch />
          
          {(publicLiveMatches || []).length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-700">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <TrendingUp size={14} className="text-red-500" /> Top Live Matches
                  </h4>
                  <div className="grid gap-3">
                      {publicLiveMatches.map((m: Match) => {
                          const currentInn = m.innings[m.currentInningIndex];
                          const battingTeam = m.teams.find(t => currentInn && t.id === currentInn.battingTeamId);
                          
                          return (
                            <Link key={m.id} to={`/spectate/${m.gameId || m.id}`} className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700 transition-colors group">
                                <div>
                                    <div className="font-bold text-sm text-slate-200 group-hover:text-emerald-400 transition-colors">{m.name}</div>
                                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                                        {m.gameId && <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-400 font-bold border border-slate-600">{m.gameId}</span>}
                                        <span>{m.teams[0]?.shortName || 'T1'} vs {m.teams[1]?.shortName || 'T2'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right hidden sm:block">
                                        <div className="text-xs font-bold text-white">
                                            {currentInn?.totalRuns || 0}/{currentInn?.totalWickets || 0}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            {battingTeam?.shortName || 'BAT'}
                                        </div>
                                    </div>
                                    <Radio className="text-red-500 animate-pulse" size={18} />
                                </div>
                            </Link>
                          );
                      })}
                  </div>
              </div>
          )}
      </section>

      {/* Active Match Card */}
      {activeMatch && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              {isLive ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Your Live Match
                </>
              ) : (
                <>
                  <Trophy className="text-yellow-500" size={18} />
                  Last Match Result
                </>
              )}
            </h3>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg border-l-4 border-emerald-500 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">{activeMatch.name}</h4>
                  <p className="text-sm text-gray-700 font-medium">{activeMatch.type} • {activeMatch.oversPerInning} Overs</p>
                </div>
                {isLive ? (
                  <span className="px-3 py-1 text-xs bg-emerald-100 text-emerald-800 font-bold rounded-full">IN PROGRESS</span>
                ) : (
                  <span className="px-3 py-1 text-xs bg-blue-100 text-blue-800 font-bold rounded-full">{getWinnerDescription(activeMatch)}</span>
                )}
              </div>
              
              <div className="flex justify-between items-center py-4 border-t border-b border-gray-100 mb-4">
                <div className="text-center w-1/3">
                  <div className="font-black text-xl text-gray-900">{activeMatch.teams?.[0]?.shortName || 'T1'}</div>
                  <div className="text-sm text-gray-600">{activeMatch.teams?.[0]?.name || 'Team 1'}</div>
                </div>
                <div className="text-center font-bold text-xl text-gray-400">VS</div>
                <div className="text-center w-1/3">
                  <div className="font-black text-xl text-gray-900">{activeMatch.teams?.[1]?.shortName || 'T2'}</div>
                  <div className="text-sm text-gray-600">{activeMatch.teams?.[1]?.name || 'Team 2'}</div>
                </div>
              </div>

              <div className="flex gap-3">
                  <button 
                    onClick={(e) => {
                        if(isLive) handleRestrictedAction(e, `/match/${activeMatch.id}`);
                        else navigate(`/summary/${activeMatch.id}`);
                    }}
                    className={`flex-1 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      isLive 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                        : 'bg-gray-800 hover:bg-gray-900 text-white'
                    }`}
                  >
                    {isLive ? (
                      <>
                        {membership === 'member' ? <PlayCircle size={18} /> : <Lock size={18} />} 
                        Continue Scoring
                      </>
                    ) : (
                      <><FileText size={18} /> View Scorecard</>
                    )}
                  </button>
                  {isLive && activeMatch.isPublic && (
                      <button 
                        onClick={() => navigate(`/spectate/${activeMatch.id}`)}
                        className="px-4 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200"
                        title="View Spectator Mode"
                      >
                          <Globe size={20} />
                      </button>
                  )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
            onClick={(e) => handleRestrictedAction(e, '/new-match')}
            className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
        >
          {membership !== 'member' && <div className="absolute top-3 right-3 bg-black/20 p-2 rounded-full"><Lock size={16}/></div>}
          <div className="flex items-center justify-between mb-4">
            <Plus className="bg-white/20 p-2 rounded-lg box-content" size={20} />
            <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-xl font-bold">Start New Match</h3>
          <p className="text-blue-100 text-sm mt-1">Set up teams, overs, and toss details.</p>
        </div>
        
        <Link to="/teams" className="group bg-white border border-gray-200 rounded-xl p-6 text-gray-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <Users className="bg-gray-100 p-2 rounded-lg box-content text-emerald-600" size={20} />
            <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
          </div>
          <h3 className="text-xl font-bold">Manage Teams</h3>
          <p className="text-gray-500 text-sm mt-1">Add players and create squads.</p>
        </Link>
      </div>

      {/* Cloud Saved History */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={16} /> Saved Scorecards
        </h3>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {loadingHistory ? (
              <div className="p-12 text-center text-gray-400 animate-pulse font-bold">Fetching cloud history...</div>
          ) : historyMatches.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No saved matches in your history yet.
            </div>
          ) : (
            historyMatches.map(match => (
              <div key={match.id} className="block hover:bg-gray-50 transition-colors relative group">
                <Link to={`/summary/${match.id}`} className="flex justify-between items-center p-4">
                  <div className="pr-12">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        {match.matchName}
                        {match.gameId && <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded">#{match.gameId}</span>}
                    </h4>
                    <div className="text-xs text-gray-600 mt-1">
                      {match.teams.teamA.shortName} vs {match.teams.teamB.shortName} • {match.finalScore?.[0]?.runs}/{match.finalScore?.[0]?.wickets} & {match.finalScore?.[1]?.runs}/{match.finalScore?.[1]?.wickets}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                        {match.startTime && new Date(match.startTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${match.result?.winnerTeamId ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                      {match.result?.winnerTeamId ? 'Result' : 'Tie/NR'}
                    </span>
                  </div>
                </Link>
                <button 
                  onClick={(e) => handleDeleteClick(e, match.id, match.matchName)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-gray-300 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-all bg-white shadow-sm rounded-lg"
                  title="Delete Scorecard"
                >
                    <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.show && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60 animate-fade-in">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-pop border-t-8 border-red-600">
                  <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mb-2">Delete Scorecard?</h3>
                      <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                          This action is permanent and will remove <span className="font-bold text-slate-800">"{deleteModal.matchName}"</span> from your history.
                      </p>
                      
                      <div className="space-y-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Type DELETE to confirm</label>
                              <input 
                                type="text"
                                value={deleteConfirmText}
                                onChange={e => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-center font-black tracking-widest text-slate-900 outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all"
                                autoFocus
                              />
                          </div>
                          
                          <div className="flex flex-col gap-2">
                              <button 
                                onClick={confirmDeleteMatch}
                                disabled={deleteConfirmText !== 'DELETE'}
                                className="w-full py-4 bg-red-600 text-white rounded-xl font-black shadow-lg disabled:opacity-20 hover:bg-red-700 transition-all transform active:scale-95"
                              >
                                  Permanently Delete
                              </button>
                              <button 
                                onClick={() => setDeleteModal({ show: false, matchId: null, matchName: '' })}
                                className="w-full py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-xl transition-all"
                              >
                                  Keep Scorecard
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