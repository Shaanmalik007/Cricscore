
import React from 'react';
import { useScoring } from '../context/ScoringContext';
import { Link, useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, Plus, ChevronRight, Users, FileText, Trophy } from 'lucide-react';

export const Home = () => {
  const { state } = useScoring();
  const navigate = useNavigate();

  const activeMatch = state.matches.find(m => m.id === state.activeMatchId);
  const recentMatches = state.matches
    .filter(m => m.id !== state.activeMatchId && m.status === 'COMPLETED')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getWinnerDescription = (match: typeof activeMatch) => {
    if (!match) return '';
    if (!match.winnerTeamId) return 'Match Tied';
    const winner = match.teams.find(t => t.id === match.winnerTeamId);
    return `${winner?.name} Won`;
  };

  const isLive = activeMatch && activeMatch.status === 'LIVE';

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      <header className="mb-4 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome Back</h2>
        <p className="text-gray-600 text-sm md:text-base">Manage your tournaments and score matches in real-time.</p>
      </header>

      {/* Active/Last Match Card */}
      {activeMatch && (
        <section>
          <div className="flex justify-between items-center mb-2 md:mb-4">
            <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
              {isLive ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Live Match
                </>
              ) : (
                <>
                  <Trophy className="text-yellow-500" size={18} />
                  Match Result
                </>
              )}
            </h3>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg border-l-4 border-emerald-500 overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xl md:text-2xl font-bold text-gray-900">{activeMatch.name}</h4>
                  <p className="text-xs md:text-sm text-gray-700 font-medium">{activeMatch.type} • {activeMatch.oversPerInning} Overs</p>
                </div>
                {isLive ? (
                  <span className="px-2 py-1 md:px-3 text-[10px] md:text-xs bg-emerald-100 text-emerald-800 font-bold rounded-full">
                    IN PROGRESS
                  </span>
                ) : (
                  <span className="px-2 py-1 md:px-3 text-[10px] md:text-xs bg-blue-100 text-blue-800 font-bold rounded-full">
                    {getWinnerDescription(activeMatch)}
                  </span>
                )}
              </div>
              
              <div className="flex justify-between items-center py-4 border-t border-b border-gray-100 mb-4">
                <div className="text-center w-1/3">
                  <div className="font-black text-lg md:text-xl text-gray-900">{activeMatch.teams[0].shortName}</div>
                  <div className="text-xs md:text-sm text-gray-600">{activeMatch.teams[0].name}</div>
                </div>
                <div className="text-center font-bold text-lg md:text-xl text-gray-400">VS</div>
                <div className="text-center w-1/3">
                  <div className="font-black text-lg md:text-xl text-gray-900">{activeMatch.teams[1].shortName}</div>
                  <div className="text-xs md:text-sm text-gray-600">{activeMatch.teams[1].name}</div>
                </div>
              </div>

              <button 
                onClick={() => navigate(isLive ? `/match/${activeMatch.id}` : `/summary/${activeMatch.id}`)}
                className={`w-full font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm md:text-base ${
                  isLive 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                    : 'bg-gray-800 hover:bg-gray-900 text-white'
                }`}
              >
                {isLive ? (
                  <><PlayCircle size={18} /> Continue Scoring</>
                ) : (
                  <><FileText size={18} /> View Scorecard</>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Link to="/new-match" className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 md:p-6 text-white shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <Plus className="bg-white/20 p-2 rounded-lg box-content" size={20} />
            <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-lg md:text-xl font-bold">Start New Match</h3>
          <p className="text-blue-100 text-xs md:text-sm mt-1">Set up teams, overs, and toss details.</p>
        </Link>
        
        <Link to="/teams" className="group bg-white border border-gray-200 rounded-xl p-4 md:p-6 text-gray-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <Users className="bg-gray-100 p-2 rounded-lg box-content text-emerald-600" size={20} />
            <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
          </div>
          <h3 className="text-lg md:text-xl font-bold">Manage Teams</h3>
          <p className="text-gray-500 text-xs md:text-sm mt-1">Add players and create squads.</p>
        </Link>
      </div>

      {/* Recent History */}
      <section>
        <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2 md:mb-4 flex items-center gap-2">
          <Clock size={16} /> Recent Matches
        </h3>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
          {recentMatches.length === 0 ? (
            <div className="p-6 md:p-8 text-center text-gray-400 text-sm">
              No completed matches yet.
            </div>
          ) : (
            recentMatches.map(match => (
              <Link key={match.id} to={`/summary/${match.id}`} className="block p-3 md:p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm md:text-base">{match.name}</h4>
                    <div className="text-xs md:text-sm text-gray-600">
                      {match.teams[0].shortName} vs {match.teams[1].shortName} • {new Date(match.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] md:text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {match.winnerTeamId ? 'Result' : 'Draw'}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
