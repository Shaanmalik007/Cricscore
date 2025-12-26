import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useScoring } from '../context/ScoringContext';
import { ArrowLeft, Medal, Clock, ListChecks, History, FileDown, Printer } from 'lucide-react';
import { getOversDisplay, calculateRunRate, getEconomy } from '../services/gameLogic';
import * as FirestoreService from '../services/firestoreService';
import { BallEvent } from '../types';

export const MatchSummary = () => {
  const { id } = useParams<{ id: string }>();
  const { state } = useScoring();
  const match = state.matches.find(m => m.id === id);
  const [activeTab, setActiveTab] = useState<'SCORECARD' | 'HISTORY'>('SCORECARD');
  const [balls, setBalls] = useState<BallEvent[]>([]);
  const [loadingBalls, setLoadingBalls] = useState(false);

  useEffect(() => {
      if (activeTab === 'HISTORY' && id) {
          setLoadingBalls(true);
          FirestoreService.getMatchBalls(id).then(res => {
              if (res && res.length > 0) {
                  setBalls(res);
              } else if (match) {
                  const localBalls = match.innings.flatMap(inn => inn.events);
                  setBalls(localBalls);
              }
              setLoadingBalls(false);
          });
      }
  }, [activeTab, id, match]);

  if (!match) return <div className="p-8">Match not found</div>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in print:p-0 print:max-w-none">
      <style>{`
        @media print {
            .no-print { display: none !important; }
            body { background: white; }
            .print-shadow-none { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
            .print-bg-none { background: transparent !important; }
        }
      `}</style>

      <div className="flex justify-between items-center mb-4 no-print">
         <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-bold transition-colors"><ArrowLeft size={20} /> Dashboard</Link>
         <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-black transition-all active:scale-95"
         >
            <FileDown size={18} /> Export as PDF
         </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center relative overflow-hidden print-shadow-none">
         <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 print:hidden"></div>
         <h1 className="text-3xl font-black text-gray-900 mb-2">{match.name}</h1>
         <p className="text-emerald-700 font-bold text-lg mb-6">
             {match.abandonmentReason ? `Abandoned: ${match.abandonmentReason}` : (match.status === 'COMPLETED' ? (match.winnerTeamId ? match.teams.find(t => t.id === match.winnerTeamId)?.name + ' won' : 'Match Drawn') : 'Match In Progress')}
         </p>
         
         <div className="flex justify-center items-center gap-6 md:gap-12 py-4">
             {match.innings.map((inning, idx) => {
                 const team = match.teams.find(t => t.id === inning.battingTeamId);
                 return (
                    <div key={idx} className="text-center group">
                        <div className="text-4xl font-black text-slate-800 mb-1">{inning.totalRuns}/{inning.totalWickets}</div>
                        <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">{team?.shortName} • {getOversDisplay(inning.totalBalls)} Ov</div>
                    </div>
                 );
             })}
         </div>
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit mx-auto md:mx-0 no-print">
          <button onClick={() => setActiveTab('SCORECARD')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'SCORECARD' ? 'bg-white shadow text-emerald-800' : 'text-gray-500 hover:bg-gray-200'}`}><ListChecks size={16}/> Scorecard</button>
          <button onClick={() => setActiveTab('HISTORY')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'HISTORY' ? 'bg-white shadow text-emerald-800' : 'text-gray-500 hover:bg-gray-200'}`}><History size={16}/> Ball History</button>
      </div>

      {(activeTab === 'SCORECARD' || window.matchMedia('print').matches) && (
          <div className="space-y-8">
              {match.innings.map((inning, index) => {
                  const battingTeam = match.teams.find(t => t.id === inning.battingTeamId);
                  const bowlingTeam = match.teams.find(t => t.id === inning.bowlingTeamId);
                  if (!battingTeam || !bowlingTeam) return null;
                  return (
                    <div key={index} className="space-y-4 print:break-inside-avoid">
                        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden print-shadow-none">
                            <div className="bg-slate-50 p-4 border-b font-black text-slate-700 flex justify-between items-center">
                                <span className="flex items-center gap-2 text-emerald-700 uppercase tracking-tighter">
                                    <Medal size={18}/> {battingTeam.name} Batting
                                </span>
                                <span className="text-slate-400 font-bold text-xs">CRR: {calculateRunRate(inning.totalRuns, inning.totalBalls)}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b">
                                        <tr><th className="p-4">Batter</th><th className="p-4">Status</th><th className="p-4 text-right">R</th><th className="p-4 text-right">B</th><th className="p-4 text-right">4s</th><th className="p-4 text-right">6s</th><th className="p-4 text-right">SR</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {battingTeam.players.map(player => {
                                            const stats = inning.battingStats[player.id];
                                            if (!stats || (stats.balls === 0 && !stats.isOut)) return null;
                                            return (
                                                <tr key={player.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 font-bold text-slate-800">{player.name}</td>
                                                    <td className="p-4 text-slate-400 text-[10px] uppercase font-bold italic">{stats.isOut ? stats.wicketInfo : 'not out'}</td>
                                                    <td className="p-4 text-right font-black text-slate-900">{stats.runs}</td>
                                                    <td className="p-4 text-right text-slate-600">{stats.balls}</td>
                                                    <td className="p-4 text-right text-slate-600">{stats.fours}</td>
                                                    <td className="p-4 text-right text-slate-600">{stats.sixes}</td>
                                                    <td className="p-4 text-right text-slate-400 font-mono">{stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-slate-50 font-bold">
                                            <td className="p-4" colSpan={2}>Extras</td>
                                            <td className="p-4 text-right" colSpan={5}>
                                                <span className="font-black">{inning.extras.wides + inning.extras.noBalls + inning.extras.byes + inning.extras.legByes}</span>
                                                <span className="text-[10px] text-gray-400 ml-2 font-mono uppercase">(W {inning.extras.wides}, NB {inning.extras.noBalls}, B {inning.extras.byes}, LB {inning.extras.legByes})</span>
                                            </td>
                                        </tr>
                                        <tr className="bg-emerald-50 font-black text-emerald-900 print:bg-gray-100">
                                            <td className="p-4" colSpan={2}>Innings Total</td>
                                            <td className="p-4 text-right text-xl" colSpan={5}>{inning.totalRuns}/{inning.totalWickets} <span className="text-sm font-normal text-emerald-600 ml-2">({getOversDisplay(inning.totalBalls)} Overs)</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden print-shadow-none print:break-inside-avoid">
                            <div className="bg-slate-50 p-4 border-b font-black text-slate-700">
                                <span className="text-blue-700 uppercase tracking-tighter">{bowlingTeam.name} Bowling</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b">
                                        <tr><th className="p-4">Bowler</th><th className="p-4 text-right">O</th><th className="p-4 text-right">M</th><th className="p-4 text-right">R</th><th className="p-4 text-right">W</th><th className="p-4 text-right">Econ</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {bowlingTeam.players.map(player => {
                                            const stats = inning.bowlingStats[player.id];
                                            if (!stats || (stats.ballsBowled === 0 && stats.runsConceded === 0)) return null;
                                            return (
                                                <tr key={player.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 font-bold text-slate-800">{player.name}</td>
                                                    <td className="p-4 text-right font-mono text-slate-900">{getOversDisplay(stats.ballsBowled)}</td>
                                                    <td className="p-4 text-right text-slate-600">{stats.maidens}</td>
                                                    <td className="p-4 text-right font-black text-slate-900">{stats.runsConceded}</td>
                                                    <td className="p-4 text-right font-black text-blue-600">{stats.wickets}</td>
                                                    <td className="p-4 text-right text-slate-400 font-mono">{getEconomy(stats.runsConceded, stats.ballsBowled)}</td>
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
          <div className="bg-white rounded-2xl shadow-sm border p-6 no-print">
              {loadingBalls ? (
                  <div className="text-center py-12 text-gray-400 animate-pulse font-bold">Retrieving timeline...</div>
              ) : balls.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 italic">No ball-by-ball data found for this match yet.</div>
              ) : (
                  <div className="space-y-4">
                      {balls.slice().reverse().map((ball, i) => (
                          <div key={ball.id} className="flex gap-4 items-start group">
                              <div className="w-16 text-[10px] font-black text-gray-400 mt-1 uppercase tracking-tighter">{ball.overNumber}.{ball.ballNumber}</div>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-sm flex-shrink-0 transition-transform group-hover:scale-110 ${
                                ball.isWicket ? 'bg-red-500 text-white' : 
                                ball.extraType === 'WIDE' ? 'bg-amber-100 text-amber-800' :
                                ball.extraType === 'NO_BALL' ? 'bg-orange-100 text-orange-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                  {ball.isWicket ? 'W' : (ball.runsScored + ball.extras)}
                              </div>
                              <div className="flex-1 border-b border-gray-100 pb-4 group-last:border-0">
                                  <div className="text-sm font-bold text-gray-800">
                                      {match.teams.flatMap(t=>t.players).find(p=>p.id===ball.bowlerId)?.name} to {match.teams.flatMap(t=>t.players).find(p=>p.id===ball.strikerId)?.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide font-medium">
                                      {ball.isWicket ? (
                                        <span className="text-red-600 font-bold">WICKET! ({ball.wicketType}{ball.fielderName ? ` by ${ball.fielderName}` : ''})</span>
                                      ) : (
                                        <span>{ball.runsScored} run(s) {ball.extraType !== 'NONE' ? <span className="text-amber-600">({ball.extraType} + {ball.extras} extras)</span> : ''}</span>
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