import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useScoring } from '../context/ScoringContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Medal, Clock, ListChecks, History, FileDown, Printer, Loader2 } from 'lucide-react';
import { getOversDisplay, calculateRunRate, getEconomy } from '../services/gameLogic';
import * as FirestoreService from '../services/firestoreService';
import { BallEvent, Match } from '../types';

export const MatchSummary = () => {
  const { id } = useParams<{ id: string }>();
  const { state } = useScoring();
  const { user } = useAuth();
  
  const localMatch = state.matches.find(m => m.id === id);
  const [match, setMatch] = useState<any | null>(localMatch || null);
  const [fetchingMatch, setFetchingMatch] = useState(!localMatch);
  
  const [activeTab, setActiveTab] = useState<'SCORECARD' | 'HISTORY'>('SCORECARD');
  const [balls, setBalls] = useState<BallEvent[]>([]);
  const [loadingBalls, setLoadingBalls] = useState(false);

  useEffect(() => {
    const fetchFullMatch = async () => {
        if (!id || match?.scorecard) {
            setFetchingMatch(false);
            return;
        }
        
        if (localMatch) {
            setMatch(localMatch);
            setFetchingMatch(false);
        } else if (user && id) {
            const historyMatch = await FirestoreService.getMatchFromHistory(user.uid, id);
            if (historyMatch) {
                if (historyMatch.scorecard) {
                    setMatch({
                        ...historyMatch,
                        name: historyMatch.matchName,
                        innings: historyMatch.scorecard.innings
                    });
                } else {
                    setMatch(historyMatch);
                }
            }
            setFetchingMatch(false);
        } else {
            setFetchingMatch(false);
        }
    };
    
    fetchFullMatch();
  }, [id, localMatch, user]);

  useEffect(() => {
      if (activeTab === 'HISTORY' && id) {
          setLoadingBalls(true);
          FirestoreService.getMatchBalls(id).then(res => {
              if (res && res.length > 0) {
                  setBalls(res);
              } else if (match?.innings) {
                  const localBalls = match.innings.flatMap((inn: any) => inn.events || []);
                  setBalls(localBalls);
              }
              setLoadingBalls(false);
          });
      }
  }, [activeTab, id, match]);

  if (fetchingMatch) return (
      <div className="p-20 text-center flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="font-bold text-gray-500 text-sm">Loading Scorecard...</p>
      </div>
  );

  if (!match) return <div className="p-8 text-center text-gray-500 italic text-sm">Match records not found.</div>;

  const handlePrint = () => {
    window.print();
  };

  const teamsArray = Array.isArray(match.teams) ? match.teams : [match.teams?.teamA, match.teams?.teamB].filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20 animate-fade-in print:p-0 print:max-w-none text-sm">
      <style>{`
        @media print {
            .no-print { display: none !important; }
            body { background: white; }
            .print-shadow-none { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
      `}</style>

      <div className="flex justify-between items-center mb-2 no-print">
         <Link to="/" className="flex items-center gap-1 text-gray-600 hover:text-emerald-600 font-bold transition-colors text-xs"><ArrowLeft size={16} /> Back</Link>
         <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-black transition-all text-xs"
         >
            <FileDown size={14} /> Export PDF
         </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 text-center relative overflow-hidden print-shadow-none">
         <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 print:hidden"></div>
         <h1 className="text-2xl font-black text-gray-900 mb-1">{match.name || match.matchName}</h1>
         <p className="text-emerald-700 font-bold text-base mb-4">
             {match.abandonmentReason ? `Abandoned: ${match.abandonmentReason}` : (match.status === 'COMPLETED' ? (match.winnerTeamId ? (teamsArray.find((t:any) => t.id === match.winnerTeamId)?.name || 'Winner') + ' won' : (match.result?.winMargin || 'Match Finished')) : 'In Progress')}
         </p>
         
         <div className="flex justify-center items-center gap-8 md:gap-12 py-2">
             {(match.innings || []).map((inning: any, idx: number) => {
                 const team = teamsArray.find((t: any) => t.id === inning.battingTeamId) || teamsArray[idx];
                 return (
                    <div key={idx} className="text-center group">
                        <div className="text-2xl font-black text-slate-800 mb-0.5">{inning.totalRuns}/{inning.totalWickets}</div>
                        <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{(team?.shortName || 'T' + (idx+1))} • {getOversDisplay(inning.totalBalls)} Ov</div>
                    </div>
                 );
             })}
         </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mx-auto md:mx-0 no-print">
          <button onClick={() => setActiveTab('SCORECARD')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-bold text-xs transition-all ${activeTab === 'SCORECARD' ? 'bg-white shadow text-emerald-800' : 'text-gray-500 hover:bg-gray-200'}`}><ListChecks size={14}/> Scorecard</button>
          <button onClick={() => setActiveTab('HISTORY')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-bold text-xs transition-all ${activeTab === 'HISTORY' ? 'bg-white shadow text-emerald-800' : 'text-gray-500 hover:bg-gray-200'}`}><History size={14}/> Ball History</button>
      </div>

      {(activeTab === 'SCORECARD' || window.matchMedia('print').matches) && (
          <div className="space-y-6">
              {(match.innings || []).map((inning: any, index: number) => {
                  const battingTeam = teamsArray.find((t: any) => t.id === inning.battingTeamId);
                  const bowlingTeam = teamsArray.find((t: any) => t.id === inning.bowlingTeamId);
                  
                  if (!battingTeam || !bowlingTeam) return null;
                  return (
                    <div key={index} className="space-y-4 print:break-inside-avoid">
                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden print-shadow-none">
                            <div className="bg-slate-50 px-4 py-2 border-b font-bold text-slate-700 flex justify-between items-center">
                                <span className="flex items-center gap-2 text-emerald-800 uppercase tracking-tight text-xs">
                                    <Medal size={14}/> {battingTeam.name} Batting
                                </span>
                                <span className="text-slate-400 font-bold text-[10px]">CRR: {calculateRunRate(inning.totalRuns, inning.totalBalls)}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b">
                                        <tr><th className="p-3">Batter</th><th className="p-3">Status</th><th className="p-3 text-right">R</th><th className="p-3 text-right">B</th><th className="p-3 text-right">4s</th><th className="p-3 text-right">6s</th><th className="p-3 text-right">SR</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(battingTeam.players || []).map((player: any) => {
                                            const stats = inning.battingStats[player.id];
                                            if (!stats || (stats.balls === 0 && !stats.isOut)) return null;
                                            return (
                                                <tr key={player.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 font-bold text-slate-800">{player.name}</td>
                                                    <td className="p-3 text-slate-400 text-[10px] uppercase font-bold italic">{stats.isOut ? stats.wicketInfo : 'not out'}</td>
                                                    <td className="p-3 text-right font-black text-slate-900">{stats.runs}</td>
                                                    <td className="p-3 text-right text-slate-600">{stats.balls}</td>
                                                    <td className="p-3 text-right text-slate-600">{stats.fours}</td>
                                                    <td className="p-3 text-right text-slate-600">{stats.sixes}</td>
                                                    <td className="p-3 text-right text-slate-400 font-mono">{stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-slate-50 font-bold">
                                            <td className="p-3" colSpan={2}>Extras</td>
                                            <td className="p-3 text-right" colSpan={5}>
                                                <span className="font-black">{(inning.extras.wides + inning.extras.noBalls + inning.extras.byes + inning.extras.legByes) || 0}</span>
                                                <span className="text-[9px] text-gray-400 ml-2 font-mono uppercase">(W {inning.extras.wides}, NB {inning.extras.noBalls}, B {inning.extras.byes}, LB {inning.extras.legByes})</span>
                                            </td>
                                        </tr>
                                        <tr className="bg-emerald-50/50 font-black text-emerald-900 border-t border-emerald-100">
                                            <td className="p-3" colSpan={2}>Total</td>
                                            <td className="p-3 text-right text-lg" colSpan={5}>{inning.totalRuns}/{inning.totalWickets} <span className="text-xs font-normal text-emerald-600 ml-1">({getOversDisplay(inning.totalBalls)} Ov)</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden print-shadow-none print:break-inside-avoid">
                            <div className="bg-slate-50 px-4 py-2 border-b font-bold text-slate-700 text-xs uppercase tracking-tight text-blue-800">
                                {bowlingTeam.name} Bowling
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b">
                                        <tr><th className="p-3">Bowler</th><th className="p-3 text-right">O</th><th className="p-3 text-right">M</th><th className="p-3 text-right">R</th><th className="p-3 text-right">W</th><th className="p-3 text-right">Econ</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(bowlingTeam.players || []).map((player: any) => {
                                            const stats = inning.bowlingStats[player.id];
                                            if (!stats || (stats.ballsBowled === 0 && stats.runsConceded === 0)) return null;
                                            return (
                                                <tr key={player.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 font-bold text-slate-800">{player.name}</td>
                                                    <td className="p-3 text-right font-mono text-slate-900">{getOversDisplay(stats.ballsBowled)}</td>
                                                    <td className="p-3 text-right text-slate-600">{stats.maidens}</td>
                                                    <td className="p-3 text-right font-black text-slate-900">{stats.runsConceded}</td>
                                                    <td className="p-3 text-right font-black text-blue-600">{stats.wickets}</td>
                                                    <td className="p-3 text-right text-slate-400 font-mono">{getEconomy(stats.runsConceded, stats.ballsBowled)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                  );
              })}
          </div>
      )}

      {activeTab === 'HISTORY' && !window.matchMedia('print').matches && (
          <div className="bg-white rounded-xl shadow-sm border p-4 no-print">
              {loadingBalls ? (
                  <div className="text-center py-8 text-gray-400 animate-pulse font-bold text-xs">Retrieving timeline...</div>
              ) : balls.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 italic text-xs">No ball data available.</div>
              ) : (
                  <div className="space-y-2">
                      {balls.slice().reverse().map((ball, i) => (
                          <div key={ball.id} className="flex gap-3 items-center group py-2 border-b border-gray-50 last:border-0">
                              <div className="w-10 text-[10px] font-black text-gray-400 uppercase tracking-tighter text-right">{ball.overNumber}.{ball.ballNumber}</div>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black shadow-sm flex-shrink-0 text-xs ${
                                ball.isWicket ? 'bg-red-500 text-white' : 
                                ball.extraType === 'WIDE' ? 'bg-amber-100 text-amber-800' :
                                ball.extraType === 'NO_BALL' ? 'bg-orange-100 text-orange-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                  {ball.isWicket ? 'W' : (ball.runsScored + ball.extras)}
                              </div>
                              <div className="flex-1">
                                  <div className="text-xs font-bold text-gray-800">
                                      {teamsArray.flatMap((t:any)=>t.players || []).find((p:any)=>p.id===ball.bowlerId)?.name || 'Bowler'} to {teamsArray.flatMap((t:any)=>t.players || []).find((p:any)=>p.id===ball.strikerId)?.name || 'Batter'}
                                  </div>
                                  <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">
                                      {ball.isWicket ? (
                                        <span className="text-red-600 font-bold">WICKET! ({ball.wicketType})</span>
                                      ) : (
                                        <span>{ball.runsScored} run(s) {ball.extraType !== 'NONE' ? <span className="text-amber-600">({ball.extraType} + {ball.extras})</span> : ''}</span>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}
    </div>
  );
};