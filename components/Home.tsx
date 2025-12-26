import React, { useEffect, useState } from 'react';
import { useScoring } from '../context/ScoringContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, Plus, ChevronRight, Users, FileText, Trophy, Lock, Globe, Radio, TrendingUp, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-500 text-xs">Track your matches and teams.</p>
      </header>

      {/* Live Search & Public Matches */}
      <section className="bg-slate-800 rounded-xl p-4 shadow-md text-white border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
              <Globe className="text-emerald-400" size={16} />
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">Public Matches</h3>
          </div>
          <MatchSearch />
          
          {(publicLiveMatches || []).length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-700">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <TrendingUp size={12} className="text-red-500" /> Trending
                  </h4>
                  <div className="grid gap-2">
                      {publicLiveMatches.map((m: Match) => {
                          const currentInn = m.innings[m.currentInningIndex];
                          const battingTeam = m.teams.find(t => currentInn && t.id === currentInn.battingTeamId);
                          
                          return (
                            <Link key={m.id} to={`/spectate/${m.gameId || m.id}`} className="bg-slate-700/40 p-2.5 rounded-lg flex justify-between items-center hover:bg-slate-700 transition-colors group border border-slate-600/50">
                                <div>
                                    <div className="font-bold text-xs text-slate-200 group-hover:text-emerald-400 transition-colors">{m.name}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                        {m.gameId && <span className="bg-slate-800 px-1 py-px rounded font-mono text-emerald-400 font-bold border border-slate-600">{m.gameId}</span>}
                                        <span>{m.teams[0]?.shortName || 'T1'} vs {m.teams[1]?.shortName || 'T2'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right hidden sm:block">
                                        <div className="text-xs font-bold text-white">
                                            {currentInn?.totalRuns || 0}/{currentInn?.totalWickets || 0}
                                        </div>
                                        <div className="text-[9px] text-slate-400">
                                            {battingTeam?.shortName || 'BAT'}
                                        </div>
                                    </div>
                                    <Radio className="text-red-500 animate-pulse" size={14} />
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
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              {isLive ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  Active Match
                </>
              ) : (
                <>
                  <Trophy className="text-yellow-500" size={16} />
                  Recently Finished
                </>
              )}
            </h3>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-emerald-500 overflow-hidden">
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 leading-tight">{activeMatch.name}</h4>
                  <p className="text-xs text-gray-500 font-medium">{activeMatch.type} • {activeMatch.oversPerInning} Overs</p>
                </div>
                {isLive ? (
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 font-bold rounded border border-emerald-200">IN PROGRESS</span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-800 font-bold rounded border border-blue-200">{getWinnerDescription(activeMatch)}</span>
                )}
              </div>
              
              <div className="flex justify-between items-center py-3 border-t border-b border-gray-100 mb-4 bg-gray-50/50 -mx-4 px-4">
                <div className="text-center w-1/3">
                  <div className="font-black text-lg text-gray-900">{activeMatch.teams?.[0]?.shortName || 'T1'}</div>
                  <div className="text-xs text-gray-500 truncate">{activeMatch.teams?.[0]?.name || 'Team 1'}</div>
                </div>
                <div className="text-center font-bold text-xs text-gray-400 bg-white px-2 py-1 rounded-full border">VS</div>
                <div className="text-center w-1/3">
                  <div className="font-black text-lg text-gray-900">{activeMatch.teams?.[1]?.shortName || 'T2'}</div>
                  <div className="text-xs text-gray-500 truncate">{activeMatch.teams?.[1]?.name || 'Team 2'}</div>
                </div>
              </div>

              <div className="flex gap-3">
                  <button 
                    onClick={(e) => {
                        if(isLive) handleRestrictedAction(e, `/match/${activeMatch.id}`);
                        else navigate(`/summary/${activeMatch.id}`);
                    }}
                    className={`flex-1 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm ${
                      isLive 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' 
                        : 'bg-gray-800 hover:bg-gray-900 text-white shadow-sm'
                    }`}
                  >
                    {isLive ? (
                      <>
                        {membership === 'member' ? <PlayCircle size={16} /> : <Lock size={16} />} 
                        Continue Scoring
                      </>
                    ) : (
                      <><FileText size={16} /> View Scorecard</>
                    )}
                  </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div 
            onClick={(e) => handleRestrictedAction(e, '/new-match')}
            className="group bg-blue-600 rounded-xl p-4 text-white shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex items-center justify-between"
        >
          {membership !== 'member' && <div className="absolute top-2 right-2 bg-black/20 p-1.5 rounded-full"><Lock size={12}/></div>}
          <div className="flex items-center gap-4">
              <div className="bg-white/20 p-2 rounded-lg">
                <Plus size={20} className="text-white" />
              </div>
              <div>
                  <h3 className="font-bold text-base">Start Match</h3>
                  <p className="text-blue-100 text-xs">Setup new game</p>
              </div>
          </div>
          <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" size={18} />
        </div>
        
        <Link to="/teams" className="group bg-white border border-gray-200 rounded-xl p-4 text-gray-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="flex items-center gap-4">
              <div className="bg-gray-100 p-2 rounded-lg text-emerald-600">
                <Users size={20} />
              </div>
              <div>
                  <h3 className="font-bold text-base">Teams</h3>
                  <p className="text-gray-500 text-xs">Manage squads</p>
              </div>
          </div>
          <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" size={18} />
        </Link>
      </div>

      {/* Match History List */}
      <section>
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Clock size={16} /> History
        </h3>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {historyMatches.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs italic">
              {loadingHistory ? 'Updating...' : 'No finished matches.'}
            </div>
          ) : (
            historyMatches.map(match => {
              const teamA = Array.isArray(match.teams) ? match.teams[0] : match.teams?.teamA;
              const teamB = Array.isArray(match.teams) ? match.teams[1] : match.teams?.teamB;
              
              return (
              <div key={match.id} className="block hover:bg-gray-50 transition-colors relative group">
                <Link to={`/summary/${match.id}`} className="flex justify-between items-center p-3">
                  <div className="pr-8">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        {match.matchName}
                        {match.gameId && <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-100">#{match.gameId}</span>}
                    </h4>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {teamA?.shortName || 'T1'} vs {teamB?.shortName || 'T2'} • <span className="font-medium text-gray-700">{match.finalScore?.[0]?.runs || '0'}/{match.finalScore?.[0]?.wickets || '0'}</span> & <span className="font-medium text-gray-700">{match.finalScore?.[1]?.runs || '0'}/{match.finalScore?.[1]?.wickets || '0'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-gray-400 uppercase tracking-wide">
                        {match.startTime && new Date(match.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </Link>
                <button 
                  onClick={(e) => handleDeleteClick(e, match.id, match.matchName)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-all bg-white shadow-sm rounded-lg border border-gray-100"
                  title="Delete"
                >
                    <Trash2 size={14} />
                </button>
              </div>
            )})
          )}
        </div>
      </section>

      {deleteModal.show && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/60 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-pop border-t-4 border-red-600">
                  <div className="p-6 text-center">
                      <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <AlertTriangle size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Record?</h3>
                      <p className="text-slate-500 text-xs mb-6">
                          Permanently remove <span className="font-bold text-slate-800">"{deleteModal.matchName}"</span>?
                      </p>
                      
                      <div className="space-y-3">
                          <input 
                            type="text"
                            value={deleteConfirmText}
                            onChange={e => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center font-bold tracking-widest text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20 text-sm"
                            autoFocus
                          />
                          
                          <div className="flex gap-2">
                              <button 
                                onClick={() => setDeleteModal({ show: false, matchId: null, matchName: '' })}
                                className="flex-1 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-all text-xs"
                              >
                                  Cancel
                              </button>
                              <button 
                                onClick={confirmDeleteMatch}
                                disabled={deleteConfirmText !== 'DELETE'}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold shadow disabled:opacity-50 hover:bg-red-700 transition-all text-xs"
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