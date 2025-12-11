
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useScoring } from '../context/ScoringContext';
import * as StorageService from '../services/storageService';
import * as GameLogic from '../services/gameLogic';
import { Match } from '../types';
import { Radio, CircleDot, TrendingUp, Wind, Target } from 'lucide-react';

export const BroadcastView = () => {
    const { id } = useParams<{ id: string }>();
    const { state, dispatch } = useScoring();
    const [lastUpdated, setLastUpdated] = useState(Date.now());

    // --- AUTO SYNC LOGIC ---
    // Poll localStorage every 2 seconds to get updates from the scoring tab
    useEffect(() => {
        const interval = setInterval(() => {
            const matches = StorageService.getMatches();
            const currentMatch = matches.find(m => m.id === id);
            
            // If the local state match is different from storage match (basic check on events length or total runs)
            // Ideally we just reload to be safe and simple for this demo
            if (currentMatch) {
                const loadedActiveId = StorageService.getActiveMatchId();
                const teams = StorageService.getTeams();
                const tournaments = StorageService.getTournaments();
                
                dispatch({ 
                    type: 'LOAD_DATA', 
                    payload: { matches, teams, tournaments, activeMatchId: loadedActiveId } 
                });
                setLastUpdated(Date.now());
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [id, dispatch]);

    const match = state.matches.find(m => m.id === id);

    if (!match) return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
            <div className="text-center animate-pulse">
                <Radio className="mx-auto mb-4 text-emerald-500" size={48} />
                <h2 className="text-2xl font-bold">Connecting to Broadcast...</h2>
            </div>
        </div>
    );

    const inning = match.innings[match.currentInningIndex];
    const battingTeam = match.teams.find(t => t.id === inning.battingTeamId);
    const bowlingTeam = match.teams.find(t => t.id === inning.bowlingTeamId);
    
    if (!inning || !battingTeam || !bowlingTeam) return null;

    const striker = battingTeam.players.find(p => p.id === inning.currentStrikerId);
    const nonStriker = battingTeam.players.find(p => p.id === inning.currentNonStrikerId);
    const bowler = bowlingTeam.players.find(p => p.id === inning.currentBowlerId);

    const strikerStats = striker ? inning.battingStats[striker.id] : null;
    const nonStrikerStats = nonStriker ? inning.battingStats[nonStriker.id] : null;
    const bowlerStats = bowler ? inning.bowlingStats[bowler.id] : null;

    const crr = GameLogic.calculateRunRate(inning.totalRuns, inning.totalBalls);
    const target = match.currentInningIndex === 1 ? match.innings[0].totalRuns + 1 : null;
    
    let reqRate = null;
    let runsNeeded = null;
    let ballsRemaining = null;

    if (target) {
        runsNeeded = target - inning.totalRuns;
        ballsRemaining = (match.oversPerInning * 6) - inning.totalBalls;
        reqRate = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : '0.00';
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden flex flex-col">
            
            {/* TOP BAR */}
            <div className="bg-slate-950 px-6 py-3 flex justify-between items-center border-b border-slate-800 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse flex items-center gap-1">
                        <CircleDot size={10} /> LIVE
                    </div>
                    <h1 className="font-bold text-lg tracking-wide uppercase text-slate-300">{match.name}</h1>
                </div>
                <div className="text-slate-400 text-sm font-medium">
                    {match.type} • {match.oversPerInning} Overs
                </div>
            </div>

            {/* MAIN SCOREBOARD */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900 via-slate-900 to-slate-900"></div>
                
                <div className="relative z-10 w-full max-w-5xl space-y-8">
                    
                    {/* Main Score Header */}
                    <div className="flex items-center justify-between bg-slate-800/50 rounded-2xl p-8 border border-slate-700 backdrop-blur-sm shadow-2xl">
                        <div className="flex items-center gap-6">
                             <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold shadow-lg ring-4 ring-blue-500/30">
                                 {battingTeam.shortName[0]}
                             </div>
                             <div>
                                 <h2 className="text-4xl font-black text-white leading-tight">{battingTeam.name}</h2>
                                 <div className="text-7xl font-black text-emerald-400 tracking-tighter filter drop-shadow-lg">
                                     {inning.totalRuns}/{inning.totalWickets}
                                 </div>
                             </div>
                        </div>

                        <div className="text-right space-y-2">
                            <div className="text-4xl font-bold text-slate-200">
                                <span className="text-slate-500 text-2xl font-normal mr-2">OVERS</span>
                                {GameLogic.getOversDisplay(inning.totalBalls)}
                            </div>
                            <div className="flex items-center justify-end gap-6 text-xl">
                                <div className="text-slate-400">
                                    CRR <span className="text-white font-bold ml-1">{crr}</span>
                                </div>
                                {target && (
                                    <div className="text-yellow-400">
                                        REQ <span className="text-white font-bold ml-1">{reqRate}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Situation Bar (Target / Status) */}
                    {target && (
                        <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-xl p-4 border border-blue-800 flex items-center justify-center gap-2 shadow-lg">
                            <Target className="text-yellow-400 animate-pulse" />
                            <span className="text-xl font-medium text-blue-100">
                                {battingTeam.shortName} needs <span className="text-yellow-400 font-bold text-2xl">{runsNeeded}</span> runs in <span className="text-white font-bold text-2xl">{ballsRemaining}</span> balls
                            </span>
                        </div>
                    )}
                    
                    {/* Match Result if Completed */}
                    {match.status === 'COMPLETED' && (
                         <div className="bg-emerald-900/80 rounded-xl p-6 border border-emerald-500 text-center animate-pop">
                            <h2 className="text-3xl font-bold text-emerald-100">
                                {match.winnerTeamId ? `${match.teams.find(t=>t.id===match.winnerTeamId)?.name} WON` : 'MATCH TIED'}
                            </h2>
                         </div>
                    )}

                    {/* Active Players Grid */}
                    <div className="grid grid-cols-12 gap-6">
                        
                        {/* BATSMEN CARD */}
                        <div className="col-span-8 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
                            <div className="bg-slate-700/50 px-4 py-2 border-b border-slate-600 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Batting
                            </div>
                            <div className="p-0">
                                <table className="w-full">
                                    <tbody className="divide-y divide-slate-700">
                                        <tr className="bg-slate-700/30">
                                            <td className="p-4 w-1/2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-10 bg-emerald-500 rounded-full"></div>
                                                    <div>
                                                        <div className="text-xl font-bold text-white flex items-center gap-2">
                                                            {striker ? striker.name : 'Empty'} <span className="text-emerald-500 text-2xl leading-none">▸</span>
                                                        </div>
                                                        <div className="text-slate-400 text-xs uppercase">{striker?.role.replace('_', ' ')}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="text-4xl font-bold text-white">{strikerStats?.runs || 0}</span>
                                                <span className="text-slate-400 text-lg ml-1">({strikerStats?.balls || 0})</span>
                                            </td>
                                            <td className="p-4 text-right w-24 bg-slate-800/50">
                                                <div className="text-xs text-slate-500 uppercase">SR</div>
                                                <div className="font-bold text-slate-200">
                                                    {GameLogic.getStrikeRate(strikerStats?.runs || 0, strikerStats?.balls || 0)}
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                     <div className="w-2 h-10 bg-transparent rounded-full"></div>
                                                     <div>
                                                        <div className="text-lg font-bold text-slate-300">
                                                            {nonStriker ? nonStriker.name : (inning.loneStrikerMode ? 'Lone Striker' : 'Empty')}
                                                        </div>
                                                        <div className="text-slate-500 text-xs uppercase">{nonStriker?.role.replace('_', ' ')}</div>
                                                     </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="text-2xl font-bold text-slate-300">{nonStrikerStats?.runs || 0}</span>
                                                <span className="text-slate-500 ml-1">({nonStrikerStats?.balls || 0})</span>
                                            </td>
                                            <td className="p-4 text-right bg-slate-800/50">
                                                <div className="text-xs text-slate-500 uppercase">SR</div>
                                                <div className="font-bold text-slate-400">
                                                    {GameLogic.getStrikeRate(nonStrikerStats?.runs || 0, nonStrikerStats?.balls || 0)}
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* BOWLER CARD */}
                        <div className="col-span-4 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl flex flex-col">
                             <div className="bg-slate-700/50 px-4 py-2 border-b border-slate-600 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Bowling
                            </div>
                            <div className="flex-1 p-6 flex flex-col justify-center">
                                <div className="text-xl font-bold text-white mb-1">{bowler ? bowler.name : 'Empty'}</div>
                                <div className="flex items-baseline gap-2 mb-4">
                                    <div className="text-5xl font-bold text-yellow-400">{bowlerStats?.wickets || 0}<span className="text-slate-400 text-3xl mx-1">-</span>{bowlerStats?.runsConceded || 0}</div>
                                </div>
                                <div className="flex justify-between text-sm border-t border-slate-700 pt-3">
                                    <div className="text-slate-400">
                                        Overs: <span className="text-white font-bold">{GameLogic.getOversDisplay(bowlerStats?.ballsBowled || 0)}</span>
                                    </div>
                                    <div className="text-slate-400">
                                        Eco: <span className="text-white font-bold">{GameLogic.getEconomy(bowlerStats?.runsConceded || 0, bowlerStats?.ballsBowled || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* TICKER / FOOTER */}
            <div className="bg-slate-950 border-t border-slate-800 p-4">
                 <div className="max-w-5xl mx-auto flex items-center gap-4">
                     <div className="bg-slate-800 px-3 py-1 rounded text-xs font-bold text-slate-400 uppercase tracking-wider">
                         This Over
                     </div>
                     <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
                         {inning.thisOver.length === 0 && <span className="text-slate-600 italic text-sm">New over started...</span>}
                         {inning.thisOver.map((ball) => (
                              <div key={ball.id} className={`
                                w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shadow-md border border-slate-700
                                ${ball.isWicket ? 'bg-red-600 text-white' : 
                                  ball.runsScored === 4 ? 'bg-blue-600 text-white' :
                                  ball.runsScored === 6 ? 'bg-purple-600 text-white' :
                                  'bg-slate-800 text-slate-200'}
                              `}>
                                  {ball.isWicket ? 'W' : ball.runsScored + ball.extras}
                              </div>
                          ))}
                     </div>
                     <div className="flex items-center gap-6 text-slate-500 text-sm font-medium">
                         <div className="flex items-center gap-2">
                             <Wind size={16} /> Extras: {inning.extras.wides + inning.extras.noBalls + inning.extras.byes + inning.extras.legByes}
                         </div>
                         <div className="flex items-center gap-2">
                             <TrendingUp size={16} /> P.Score: {GameLogic.calculateProjectedScore(inning.totalRuns, inning.totalBalls, match.oversPerInning).current}
                         </div>
                     </div>
                 </div>
            </div>
        </div>
    );
};
