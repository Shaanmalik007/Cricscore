import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as FirestoreService from '../services/firestoreService';
import * as GameLogic from '../services/gameLogic';
import { Match, MatchCheers } from '../types';
import { CircleDot, Target, TrendingUp, Wind, Zap, ThumbsUp, PartyPopper, Flame, Home, Search, Loader2 } from 'lucide-react';

export const SpectatorLive = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();
    const [match, setMatch] = useState<Match | null>(null);
    const [loading, setLoading] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [searchCode, setSearchCode] = useState('');

    useEffect(() => {
        if (!gameId) return;
        
        setLoading(true);
        setNotFound(false);

        let unsubscribe: () => void;

        const handleUpdate = (data: Match) => {
            if (data) {
                setMatch(data);
                setLoading(false);
                setNotFound(false);
            } else {
                handleNotFound();
            }
        };

        const handleNotFound = () => {
            setLoading(false);
            setNotFound(true);
        };

        const isGameId = /^\d{6}$/.test(gameId);

        if (isGameId) {
            unsubscribe = FirestoreService.subscribeToMatchByGameId(gameId, handleUpdate, handleNotFound);
        } else {
            unsubscribe = FirestoreService.subscribeToMatch(gameId, handleUpdate, handleNotFound);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [gameId]);

    const handleCheer = (type: keyof MatchCheers) => {
        if (match) {
            FirestoreService.sendCheer(match.id, type);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchCode.length === 6) {
            navigate(`/spectate/${searchCode}`);
        }
    };

    // --- PROMPT FOR CODE VIEW ---
    if (!gameId || notFound) return (
        <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4">
            <div className="text-center max-w-sm w-full bg-[#1e293b]/50 p-10 rounded-2xl shadow-2xl border border-slate-800 backdrop-blur-xl animate-pop">
                <div className="flex justify-center mb-6">
                    <div className="relative">
                       <div className="text-6xl transform -rotate-45">🏏</div>
                       <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-[#1e293b]"></div>
                    </div>
                </div>
                <h2 className="text-2xl font-black mb-3 text-white tracking-tight">
                    {notFound ? 'Match Not Found' : 'Spectate Live'}
                </h2>
                <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                    Enter the 6-digit match code provided by the scorer to follow the game in real-time.
                </p>
                
                <form onSubmit={handleSearch} className="space-y-4">
                    <input 
                        type="text"
                        maxLength={6}
                        placeholder="e.g. 123456"
                        value={searchCode}
                        onChange={e => setSearchCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-black/40 border border-slate-700 rounded-xl py-4 text-center text-3xl font-mono font-black text-emerald-400 tracking-[0.2em] focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner"
                    />
                    <button 
                        disabled={searchCode.length !== 6}
                        className="inline-flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg transform active:scale-95 w-full justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Search size={20} /> Spectate Now
                    </button>
                </form>
                <Link to="/" className="block mt-6 text-slate-500 hover:text-slate-300 text-sm font-bold">Return to Dashboard</Link>
            </div>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen bg-[#111827] text-white flex items-center justify-center">
            <div className="text-center animate-pulse">
                <CircleDot className="mx-auto mb-4 text-emerald-500" size={48} />
                <h2 className="text-2xl font-bold">Connecting...</h2>
                <p className="text-slate-400 mt-2 text-sm">Synchronizing live match data</p>
            </div>
        </div>
    );

    const inning = match?.innings?.[match.currentInningIndex];
    if (!inning) return <div className="text-white text-center p-12">Waiting for first inning to start...</div>;

    const battingTeam = match.teams?.find(t => t.id === inning.battingTeamId);
    const bowlingTeam = match.teams?.find(t => t.id === inning.bowlingTeamId);
    
    if (!battingTeam || !bowlingTeam) return null;

    const striker = battingTeam.players?.find(p => p.id === inning.currentStrikerId);
    const nonStriker = battingTeam.players?.find(p => p.id === inning.currentNonStrikerId);
    const bowler = bowlingTeam.players?.find(p => p.id === inning.currentBowlerId);

    const strikerStats = striker ? inning.battingStats?.[striker.id] : null;
    const nonStrikerStats = nonStriker ? inning.battingStats?.[nonStriker.id] : null;
    const bowlerStats = bowler ? inning.bowlingStats?.[bowler.id] : null;

    const crr = GameLogic.calculateRunRate(inning.totalRuns || 0, inning.totalBalls || 0);
    const target = match.currentInningIndex === 1 ? (match.innings[0]?.totalRuns || 0) + 1 : null;
    
    let runsNeeded = null;
    let ballsRemaining = null;

    if (target) {
        runsNeeded = target - (inning.totalRuns || 0);
        ballsRemaining = (match.oversPerInning * 6) - (inning.totalBalls || 0);
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-[#020617] px-4 py-4 flex justify-between items-center border-b border-slate-800 shadow-xl">
                <div className="flex items-center gap-3 overflow-hidden">
                    {match.status === 'LIVE' ? (
                        <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse flex items-center gap-1 shadow-red-500/20 shadow-lg">
                            <CircleDot size={8} /> LIVE
                        </div>
                    ) : (
                        <div className="bg-slate-700 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                            ENDED
                        </div>
                    )}
                    <h1 className="font-black text-sm md:text-lg tracking-tight uppercase text-slate-100 truncate">{match.name}</h1>
                </div>
                {match.gameId && (
                    <div className="bg-[#1e293b] px-3 py-1 rounded-lg text-xs text-emerald-400 font-mono border border-slate-700 font-bold tracking-widest shadow-inner">
                        #{match.gameId}
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto no-scrollbar">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900 via-slate-950 to-slate-950 pointer-events-none"></div>
                
                <div className="relative z-10 w-full max-w-lg space-y-6">
                    
                    {/* RESULT BANNER */}
                    {match.status === 'COMPLETED' && (
                        <div className="bg-emerald-600/20 border border-emerald-500/50 p-6 rounded-[2rem] text-center animate-pop backdrop-blur-md">
                            <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-tighter mb-1">Match Finished</h2>
                            <p className="text-white font-bold text-lg">
                                {match.winnerTeamId ? (
                                    <>
                                        <PartyPopper size={20} className="inline mr-2 text-yellow-400" />
                                        {match.teams.find(t=>t.id === match.winnerTeamId)?.name} Won
                                    </>
                                ) : 'Match Tied/No Result'}
                            </p>
                        </div>
                    )}

                    {/* SCORECARD */}
                    <div className="bg-[#1e293b]/60 rounded-3xl p-8 border border-slate-800 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl pointer-events-none tracking-tighter">
                            {battingTeam.shortName}
                        </div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight mb-2">{battingTeam.name}</h2>
                                <div className="text-6xl font-black text-emerald-400 tracking-tighter filter drop-shadow-2xl">
                                     {inning.totalRuns || 0}/{inning.totalWickets || 0}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-slate-200">
                                    <span className="text-slate-500 text-sm font-bold mr-2 tracking-widest uppercase">Overs</span>
                                    {GameLogic.getOversDisplay(inning.totalBalls || 0)}
                                </div>
                                <div className="text-slate-400 text-sm font-bold mt-2 uppercase tracking-widest">
                                    CRR: <span className="text-white ml-1">{crr}</span>
                                </div>
                            </div>
                        </div>
                        
                        {target && match.status === 'LIVE' && (
                            <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-col gap-2">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-yellow-400 flex items-center gap-2"><Target size={16}/> Target: {target}</span>
                                    <span className="text-slate-300">Need <span className="text-white text-lg">{runsNeeded}</span> from <span className="text-white text-lg">{Math.max(0, ballsRemaining || 0)}</span> balls</span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-emerald-500 h-full transition-all duration-1000" 
                                        style={{ width: `${Math.min(100, (inning.totalRuns / (target - 1)) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* LIVE UPDATES / PLAYERS */}
                    <div className="grid gap-6">
                        <div className="bg-[#1e293b]/40 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                            <div className="bg-slate-800/50 px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Batting</div>
                            <div className="divide-y divide-slate-800">
                                <div className="p-4 flex justify-between items-center">
                                    <div className="font-black text-white flex items-center gap-2 text-lg">
                                        {striker ? striker.name : (match.status === 'COMPLETED' ? 'Innings Over' : 'Waiting...')} 
                                        {striker && <span className="text-emerald-400 animate-pulse text-2xl leading-none">★</span>}
                                    </div>
                                    <div className="text-right">
                                        <span className="font-black text-2xl text-white">{strikerStats?.runs || 0}</span>
                                        <span className="text-slate-500 text-sm font-bold ml-2">({strikerStats?.balls || 0})</span>
                                    </div>
                                </div>
                                {(!inning.loneStrikerMode || nonStriker) && (
                                    <div className="p-4 flex justify-between items-center bg-black/10">
                                        <div className="font-bold text-slate-400 text-lg">
                                            {nonStriker ? nonStriker.name : (match.status === 'COMPLETED' ? '-' : 'Empty')}
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-xl text-slate-400">{nonStrikerStats?.runs || 0}</span>
                                            <span className="text-slate-600 text-sm font-bold ml-2">({nonStrikerStats?.balls || 0})</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-[#1e293b]/40 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex justify-between items-center p-5">
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-2">Bowling</div>
                                <div className="font-black text-white text-lg">{bowler ? bowler.name : (match.status === 'COMPLETED' ? 'Innings Over' : 'Waiting...')}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black text-yellow-400">{bowlerStats?.wickets || 0}<span className="text-slate-700 mx-1">-</span>{bowlerStats?.runsConceded || 0}</div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{GameLogic.getOversDisplay(bowlerStats?.ballsBowled || 0)} Overs</div>
                            </div>
                        </div>
                    </div>

                    {/* OVER TIMELINE */}
                    <div className="flex gap-2.5 overflow-x-auto py-2 no-scrollbar">
                         {inning.thisOver?.map((ball) => (
                              <div key={ball.id} className={`
                                flex-shrink-0 w-12 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-xl border border-slate-800 animate-slide-up
                                ${ball.isWicket ? 'bg-red-600 text-white border-red-500' : 
                                  ball.runsScored === 4 ? 'bg-blue-600 text-white border-blue-500' :
                                  ball.runsScored === 6 ? 'bg-purple-600 text-white border-purple-500' :
                                  'bg-slate-900 text-slate-200'}
                              `}>
                                  {ball.isWicket ? 'W' : 
                                   ball.extraType === 'WIDE' ? `w${ball.extras}` : 
                                   ball.extraType === 'NO_BALL' ? `n${ball.runsScored+ball.extras}` : 
                                   ball.runsScored}
                              </div>
                          ))}
                    </div>

                    {/* CHEER BOARD */}
                    <div className="grid grid-cols-4 gap-4 mt-4 bg-black/20 p-6 rounded-3xl border border-slate-800">
                        <button onClick={() => handleCheer('clap')} className="flex flex-col items-center gap-2 group active:scale-90 transition-transform">
                            <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-slate-700 border border-slate-700 shadow-lg">👏</div>
                            <span className="text-xs font-black text-slate-400 tracking-wider">{match.cheers?.clap || 0}</span>
                        </button>
                        <button onClick={() => handleCheer('fire')} className="flex flex-col items-center gap-2 group active:scale-90 transition-transform">
                            <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-slate-700 border border-slate-700 shadow-lg">🔥</div>
                            <span className="text-xs font-black text-slate-400 tracking-wider">{match.cheers?.fire || 0}</span>
                        </button>
                        <button onClick={() => handleCheer('celebrate')} className="flex flex-col items-center gap-2 group active:scale-90 transition-transform">
                            <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-slate-700 border border-slate-700 shadow-lg">🎉</div>
                            <span className="text-xs font-black text-slate-400 tracking-wider">{match.cheers?.celebrate || 0}</span>
                        </button>
                        <button onClick={() => handleCheer('wow')} className="flex flex-col items-center gap-2 group active:scale-90 transition-transform">
                            <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-slate-700 border border-slate-700 shadow-lg">😮</div>
                            <span className="text-xs font-black text-slate-400 tracking-wider">{match.cheers?.wow || 0}</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};