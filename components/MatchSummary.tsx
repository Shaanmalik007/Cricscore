
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useScoring } from '../context/ScoringContext';
import { ArrowLeft, Share2, Medal, Sparkles } from 'lucide-react';
import { getOversDisplay, calculateRunRate, getEconomy, calculateMVP } from '../services/gameLogic';

export const MatchSummary = () => {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = useScoring();
  const match = state.matches.find(m => m.id === id);
  const [showMomModal, setShowMomModal] = useState(false);

  if (!match) return <div>Match not found</div>;

  const getPlayerPerf = (pid: string) => {
     let batStr = '', bowlStr = '';
     match.innings.forEach(inn => {
         const bs = inn.battingStats[pid];
         if (bs && (bs.balls > 0 || bs.isOut)) batStr = `${bs.runs} (${bs.balls})`;
         const bo = inn.bowlingStats[pid];
         if (bo && bo.ballsBowled > 0) bowlStr = `${bo.wickets}/${bo.runsConceded} (${getOversDisplay(bo.ballsBowled)})`;
     });
     return { batStr, bowlStr };
  };

  const mvpList = calculateMVP(match);
  const bestPerformer = mvpList[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-4">
         <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-emerald-600"><ArrowLeft size={20} /> Back to Dashboard</Link>
         {match.status === 'LIVE' && <Link to={`/match/${match.id}`} className="text-emerald-600 font-bold hover:underline">Go to Live Scoring</Link>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center relative">
         <h1 className="text-2xl font-bold text-gray-800">{match.name}</h1>
         <p className="text-gray-500 mb-4">{match.status === 'COMPLETED' ? `Result: ${match.winnerTeamId ? match.teams.find(t => t.id === match.winnerTeamId)?.name + ' Won' : 'Match Tied'}` : 'Match In Progress'}</p>
         
         {/* MOM Display */}
         {match.manOfTheMatchId && (
             <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-full border border-yellow-200 mb-4">
                 <Medal size={16} />
                 <span className="font-bold text-sm">MOM: {match.teams.flatMap(t => t.players).find(p => p.id === match.manOfTheMatchId)?.name}</span>
             </div>
         )}
         
         {match.status === 'COMPLETED' && !match.manOfTheMatchId && (
             <div className="flex flex-col items-center gap-2 mb-4">
                 {bestPerformer && (
                     <div className="bg-indigo-50 text-indigo-800 px-3 py-1 rounded text-xs font-medium flex items-center gap-1 mb-2 border border-indigo-100">
                        <Sparkles size={12}/> Auto-calculated Top Performer: {match.teams.flatMap(t => t.players).find(p => p.id === bestPerformer.playerId)?.name} ({bestPerformer.points} pts)
                     </div>
                 )}
                 <button 
                    onClick={() => setShowMomModal(true)}
                    className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full border border-emerald-200 hover:bg-emerald-200 text-sm font-semibold"
                 >
                     <Medal size={16} /> Select Man of the Match
                 </button>
             </div>
         )}

         <div className="flex justify-center items-center gap-8 py-4">
             {match.innings.map((inning, idx) => {
                 const team = match.teams.find(t => t.id === inning.battingTeamId);
                 if (!team) return null;
                 return (
                     <div key={idx} className="text-center">
                         <div className="font-bold text-4xl text-emerald-800">{inning.totalRuns}/{inning.totalWickets}</div>
                         <div className="text-gray-500 text-sm">
                             {team.shortName} <span className="mx-1">•</span> {getOversDisplay(inning.totalBalls)} Overs
                         </div>
                     </div>
                 );
             })}
         </div>
      </div>

      {match.innings.map((inning, index) => {
          const battingTeam = match.teams.find(t => t.id === inning.battingTeamId);
          const bowlingTeam = match.teams.find(t => t.id === inning.bowlingTeamId);
          if (!battingTeam || !bowlingTeam) return null;

          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 p-4 border-b border-gray-200 font-bold text-lg flex justify-between text-gray-900">
                    <span>Inning {index + 1} - {battingTeam.name} Batting</span>
                    <span className="text-gray-600 text-sm font-normal">RR: {calculateRunRate(inning.totalRuns, inning.totalBalls)}</span>
                </div>
                
                {/* Batting Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium">
                            <tr>
                                <th className="p-3">Batter</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">R</th>
                                <th className="p-3 text-right">B</th>
                                <th className="p-3 text-right">4s</th>
                                <th className="p-3 text-right">6s</th>
                                <th className="p-3 text-right">SR</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {battingTeam.players.map(player => {
                                const stats = inning.battingStats[player.id];
                                if (!stats || (stats.balls === 0 && !stats.isOut && player.id !== inning.currentStrikerId && player.id !== inning.currentNonStrikerId)) return null; // Hide DNB
                                return (
                                    <tr key={player.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium text-gray-900">{player.name}</td>
                                        <td className="p-3 text-gray-500">{stats.isOut ? <span className="text-red-600 font-medium">{stats.wicketInfo}</span> : 'not out'}</td>
                                        <td className="p-3 text-right font-bold text-gray-900">{stats.runs}</td>
                                        <td className="p-3 text-right text-gray-700">{stats.balls}</td>
                                        <td className="p-3 text-right text-gray-700">{stats.fours}</td>
                                        <td className="p-3 text-right text-gray-700">{stats.sixes}</td>
                                        <td className="p-3 text-right text-gray-500">{stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '-'}</td>
                                    </tr>
                                );
                            })}
                             <tr className="bg-gray-50 font-bold text-gray-800">
                                <td className="p-3" colSpan={2}>Extras</td>
                                <td className="p-3 text-right" colSpan={5}>
                                    {inning.extras.wides + inning.extras.noBalls + inning.extras.byes + inning.extras.legByes} 
                                    <span className="text-gray-500 font-normal text-xs ml-2">
                                        (w {inning.extras.wides}, nb {inning.extras.noBalls}, b {inning.extras.byes}, lb {inning.extras.legByes})
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Bowling Table */}
                 <div className="bg-gray-50 p-2 font-semibold text-xs text-gray-600 uppercase border-t border-b">Bowling</div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium">
                            <tr>
                                <th className="p-3">Bowler</th>
                                <th className="p-3 text-right">O</th>
                                <th className="p-3 text-right">M</th>
                                <th className="p-3 text-right">R</th>
                                <th className="p-3 text-right">W</th>
                                <th className="p-3 text-right">Econ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                             {bowlingTeam.players.map(player => {
                                const stats = inning.bowlingStats[player.id];
                                if (!stats || stats.ballsBowled === 0) return null;
                                return (
                                    <tr key={player.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium text-gray-900">{player.name}</td>
                                        <td className="p-3 text-right text-gray-700">{getOversDisplay(stats.ballsBowled)}</td>
                                        <td className="p-3 text-right text-gray-700">{stats.maidens}</td>
                                        <td className="p-3 text-right text-gray-700">{stats.runsConceded}</td>
                                        <td className="p-3 text-right font-bold text-gray-900">{stats.wickets}</td>
                                        <td className="p-3 text-right text-gray-700">{getEconomy(stats.runsConceded, stats.ballsBowled)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                 </div>
            </div>
          );
      })}

      {/* MOM Modal */}
      {showMomModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden">
                  <div className="bg-emerald-900 text-white p-4 font-bold flex justify-between">
                      <span>Select Man of the Match</span>
                      <button onClick={() => setShowMomModal(false)}><ArrowLeft/></button>
                  </div>
                  <div className="p-4 max-h-[70vh] overflow-y-auto">
                      {mvpList.map(item => {
                          const player = match.teams.flatMap(t => t.players).find(p => p.id === item.playerId);
                          const { batStr, bowlStr } = getPlayerPerf(item.playerId);
                          if (!player) return null;
                          return (
                              <button 
                                key={item.playerId}
                                onClick={() => {
                                    dispatch({ type: 'SET_MAN_OF_MATCH', payload: { matchId: match.id, playerId: item.playerId } });
                                    setShowMomModal(false);
                                }}
                                className="w-full text-left flex justify-between items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                              >
                                  <div>
                                      <div className="font-medium text-gray-900">
                                          {player.name} 
                                          <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{item.details}</span>
                                      </div>
                                      <div className="text-xs text-gray-500 flex gap-2">
                                          {batStr && <span>Bat: {batStr}</span>}
                                          {bowlStr && <span>Bowl: {bowlStr}</span>}
                                      </div>
                                  </div>
                              </button>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
