
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScoring } from '../context/ScoringContext';
import { Match, WicketType, ExtraType } from '../types';
import * as GameLogic from '../services/gameLogic';
import { ArrowLeft, User, AlertTriangle, RotateCcw, TrendingUp, Target, Radio, Share2, CheckCircle, Power, X } from 'lucide-react';

export const LiveScoring = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useScoring();
  
  const match = state.matches.find(m => m.id === id);
  
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<WicketType>('CAUGHT');
  const [wicketPlayerId, setWicketPlayerId] = useState('');
  const [fielderName, setFielderName] = useState('');
  const [runsOnWicket, setRunsOnWicket] = useState(0);

  const [showNoBallModal, setShowNoBallModal] = useState(false);
  const [showWideModal, setShowWideModal] = useState(false);
  const [showAllOutModal, setShowAllOutModal] = useState(false);
  
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const [endConfirmText, setEndConfirmText] = useState('');
  const [endReason, setEndReason] = useState('Rain');

  const [celebration, setCelebration] = useState<'FOUR' | 'SIX' | 'WICKET' | null>(null);

  const [selectedStriker, setSelectedStriker] = useState('');
  const [selectedNonStriker, setSelectedNonStriker] = useState('');
  const [selectedBowler, setSelectedBowler] = useState('');

  // Local state to manage dismissing mandatory modals
  const [isBatsmenDismissed, setBatsmenDismissed] = useState(false);
  const [isBowlerDismissed, setBowlerDismissed] = useState(false);

  const inning = match ? match.innings[match.currentInningIndex] : undefined;
  const battingTeam = (match && inning) ? match.teams.find(t => t.id === inning.battingTeamId) : undefined;
  const bowlingTeam = (match && inning) ? match.teams.find(t => t.id === inning.bowlingTeamId) : undefined;

  useEffect(() => {
    if (celebration) {
      const timer = setTimeout(() => setCelebration(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [celebration]);

  useEffect(() => {
     if (match && match.status === 'LIVE' && inning && battingTeam && !inning.isCompleted && !inning.loneStrikerMode) {
         const totalPlayers = battingTeam.players.length;
         if (inning.totalWickets >= totalPlayers - 1) {
             setShowAllOutModal(true);
         }
     }
  }, [match, inning, battingTeam]);

  // Reset dismissal states when innings or over changes
  useEffect(() => {
    setBatsmenDismissed(false);
    setBowlerDismissed(false);
  }, [match?.currentInningIndex, inning?.totalBalls]);

  if (!match) return <div className="p-8">Match not found</div>;
  
  if (match.status === 'COMPLETED') {
       return (
           <div className="p-8 text-center bg-gray-50 min-h-screen flex flex-col items-center justify-center">
               <div className="bg-white p-10 rounded-2xl shadow-xl mb-6 max-w-md w-full border-t-8 border-emerald-600 animate-pop">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle size={48} />
                  </div>
                  <h2 className="text-3xl font-bold mb-2 text-gray-900">Match Ended</h2>
                  <p className="text-xl text-emerald-700 font-bold mb-4">
                      {match.abandonmentReason ? `Abandoned: ${match.abandonmentReason}` : (match.winnerTeamId ? `${match.teams.find(t=>t.id===match.winnerTeamId)?.name} Won!` : 'Match Drawn/Tied')}
                  </p>
                  <p className="text-gray-500 text-sm">{match.winnerTeamId ? 'Result based on Match Progress.' : 'No result could be determined.'}</p>
               </div>
               <button onClick={() => navigate(`/summary/${match.id}`)} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all transform hover:scale-105">View Full Scorecard</button>
           </div>
       );
  }

  if (!inning || !battingTeam || !bowlingTeam) return <div className="p-8">Loading match data...</div>;

  const needsBatsmen = !inning.currentStrikerId || (!inning.loneStrikerMode && !inning.currentNonStrikerId);
  const needsBowler = !inning.currentBowlerId;

  const handleFinalizeMatch = () => {
    const score1 = match.innings[0].totalRuns;
    const score2 = match.innings[1].totalRuns;
    let winnerId: string | null = null;
    let marginText = "";

    if (score1 > score2) {
        winnerId = match.innings[0].battingTeamId;
        marginText = `${score1 - score2} runs`;
    } else if (score2 > score1) {
        winnerId = match.innings[1].battingTeamId;
        marginText = `${10 - match.innings[1].totalWickets} wickets`;
    }

    dispatch({ 
        type: 'FINALIZE_MATCH', 
        payload: { 
            matchId: match.id, 
            winnerTeamId: winnerId,
            winMargin: marginText
        } 
    });
  };

  const handleAbandonMatch = () => {
      if (endConfirmText.toUpperCase() !== 'CANCEL') return;
      
      const inn1 = match.innings[0];
      const inn2 = match.innings[1];
      const rr1 = inn1.totalBalls > 0 ? (inn1.totalRuns / (inn1.totalBalls / 6)) : 0;
      const rr2 = inn2.totalBalls > 0 ? (inn2.totalRuns / (inn2.totalBalls / 6)) : 0;

      let winnerTeamId: string | null = null;
      let marginText = "Abandoned";

      // If more CRR in 2nd innings or 1st innings, conclude winner
      if (rr2 > rr1) {
          winnerTeamId = inn2.battingTeamId;
          marginText = `Won on Run Rate (${rr2.toFixed(2)} vs ${rr1.toFixed(2)})`;
      } else if (rr1 > rr2) {
          winnerTeamId = inn1.battingTeamId;
          marginText = `Won on Run Rate (${rr1.toFixed(2)} vs ${rr2.toFixed(2)})`;
      } else {
          marginText = "Abandoned - Tie on Run Rate";
      }

      dispatch({ 
          type: 'FINALIZE_MATCH', 
          payload: { 
              matchId: match.id, 
              winnerTeamId: winnerTeamId,
              reason: endReason,
              winMargin: marginText
          } 
      });
  }

  const triggerCelebration = (type: 'FOUR' | 'SIX' | 'WICKET') => setCelebration(type);

  const submitBall = (payload: any) => {
      dispatch({ type: 'RECORD_BALL', payload });
      setShowWicketModal(false);
      setShowNoBallModal(false);
      setShowWideModal(false);
      setWicketType('CAUGHT');
      setFielderName('');
      setWicketPlayerId('');
      setRunsOnWicket(0);
      
      if (payload.isWicket) triggerCelebration('WICKET');
      else if (payload.runs === 4 && payload.extraType === 'NONE') triggerCelebration('FOUR');
      else if (payload.runs === 6 && payload.extraType === 'NONE') triggerCelebration('SIX');
  };

  const striker = battingTeam.players.find(p => p.id === inning.currentStrikerId);
  const nonStriker = inning.currentNonStrikerId ? battingTeam.players.find(p => p.id === inning.currentNonStrikerId) : null;
  const bowler = bowlingTeam.players.find(p => p.id === inning.currentBowlerId);
  const strikerStats = striker ? inning.battingStats[striker.id] : { runs: 0, balls: 0 };
  const nonStrikerStats = nonStriker ? inning.battingStats[nonStriker.id] : { runs: 0, balls: 0 };
  const bowlerStats = bowler ? inning.bowlingStats[bowler.id] : { wickets: 0, runsConceded: 0, ballsBowled: 0 };
  const projected = GameLogic.calculateProjectedScore(inning.totalRuns, inning.totalBalls, match.oversPerInning);

  const targetValue = match.currentInningIndex === 1 ? match.innings[0].totalRuns + 1 : 0;
  const winProb = targetValue > 0 ? GameLogic.calculateWinProbability(targetValue, inning.totalRuns, inning.totalBalls, inning.totalWickets, match.oversPerInning) : 50;

  return (
    <div className="max-w-4xl mx-auto space-y-3 pb-24 relative">
      {celebration === 'FOUR' && <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center"><div className="bg-blue-600 text-white text-6xl font-black px-12 py-6 rounded-xl shadow-2xl animate-pop rotate-[-5deg]">4 RUNS!</div></div>}
      {celebration === 'SIX' && <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center"><div className="absolute inset-0 bg-black/30"></div><div className="bg-purple-600 text-white text-8xl font-black px-16 py-10 rounded-2xl shadow-2xl animate-pop border-4 border-yellow-400">SIX!</div></div>}
      {celebration === 'WICKET' && <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center flex-col gap-4"><div className="absolute inset-0 bg-red-600/20"></div><div className="text-9xl animate-bounce">🦆</div><div className="bg-red-600 text-white text-6xl font-black px-12 py-6 rounded-xl shadow-2xl animate-pop">WICKET!</div></div>}

      <div className="bg-[#064e3b] text-white p-3 md:p-4 rounded-xl shadow-md border border-white/10">
        <div className="flex justify-between items-center mb-1">
            <button onClick={() => navigate('/')} className="text-emerald-300 hover:text-white flex items-center gap-1">
                <ArrowLeft size={18}/> <span className="text-xs">Back</span>
            </button>
            <div className="flex items-center gap-2">
                <button onClick={() => setShowEndMatchModal(true)} className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors" title="Abandon Match Manually"><Power size={14} /></button>
                <div className="flex items-center gap-1 bg-emerald-800/50 px-2 py-0.5 rounded border border-emerald-700">
                    <Share2 size={12} className="text-emerald-400"/>
                    <span className="text-xs md:sm font-mono font-bold text-white select-all">{match.gameId || 'LIVE'}</span>
                </div>
                <button onClick={() => window.open(`#/broadcast/${match.id}`, '_blank')} className="p-1 bg-emerald-800/50 rounded hover:bg-emerald-700"><Radio size={14} className="text-yellow-400" /></button>
            </div>
        </div>
        
        <div className="flex justify-between items-end mt-2">
             <div>
                 <div className="text-3xl md:text-4xl font-bold leading-none mb-1">{inning.totalRuns}/{inning.totalWickets}</div>
                 <div className="text-emerald-300 text-xs md:text-sm">Over {GameLogic.getOversDisplay(inning.totalBalls)} <span className="mx-1">•</span> CRR: {GameLogic.calculateRunRate(inning.totalRuns, inning.totalBalls)}</div>
             </div>
             <div className="text-right">
                 <div className="text-sm md:text-lg font-bold uppercase tracking-widest">{bowlingTeam.shortName}</div>
                 <div className="text-[10px] md:text-xs text-emerald-300">Target: {match.currentInningIndex === 1 ? match.innings[0].totalRuns + 1 : '-'}</div>
             </div>
        </div>

        {/* Win Probability Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[10px] uppercase font-black tracking-widest mb-1 text-emerald-400">
            <span>{battingTeam.shortName} Win %</span>
            <span>{bowlingTeam.shortName} Win %</span>
          </div>
          <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden flex">
            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${winProb}%` }}></div>
            <div className="h-full bg-slate-600 transition-all duration-1000 flex-1"></div>
          </div>
          <div className="flex justify-between mt-1 font-mono text-xs font-bold">
            <span className="text-white">{winProb}%</span>
            <span className="text-slate-400">{100 - winProb}%</span>
          </div>
        </div>

        <div className="mt-2 pt-3 border-t border-emerald-800/50">
            <div className="flex justify-between items-center text-xs md:text-sm">
                <span className="text-emerald-300 flex items-center gap-1"><TrendingUp size={14}/> Projected Score:</span>
                <span className="text-white text-lg font-black">{projected.current}</span>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         <div className="p-3 md:p-4 grid grid-cols-2 divide-x divide-gray-100 text-sm md:text-base">
             <div className="pr-2 md:pr-4">
                 {striker ? (
                     <div className="flex justify-between items-center mb-1">
                         <span className="font-bold text-slate-900 flex items-center gap-1 truncate">{striker.name} ★</span>
                         <span className="font-mono font-bold text-slate-800">{strikerStats?.runs} <span className="text-xs text-slate-400 font-normal">({strikerStats?.balls})</span></span>
                     </div>
                 ) : <div className="text-gray-400 italic">Striker</div>}
             </div>
             <div className="pl-2 md:pl-4 opacity-70">
                 {nonStriker ? (
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-slate-700 truncate">{nonStriker.name}</span>
                        <span className="font-mono font-bold text-slate-700">{nonStrikerStats?.runs} <span className="text-xs text-slate-400 font-normal">({nonStrikerStats?.balls})</span></span>
                    </div>
                 ) : <div className="text-gray-400 italic">{inning.loneStrikerMode ? 'Lone Striker' : 'Non-Striker'}</div>}
             </div>
         </div>
         <div className="bg-slate-50 px-3 md:px-4 py-2 border-t border-gray-100 flex justify-between items-center text-sm">
             <div className="font-medium text-slate-800">{bowler ? bowler.name : 'Select Bowler'}</div>
             <div className="font-mono font-bold text-slate-900">{bowlerStats?.wickets}-{bowlerStats?.runsConceded} <span className="text-xs text-slate-400 font-normal">({GameLogic.getOversDisplay(bowlerStats?.ballsBowled || 0)})</span></div>
         </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Over:</span>
          {inning.thisOver.map((ball) => {
              const label = ball.isWicket ? 'W' : 
                   ball.extraType === 'WIDE' ? `w${ball.extras}` : 
                   ball.extraType === 'NO_BALL' ? `n${ball.runsScored+ball.extras}` : 
                   ball.runsScored;
              
              const colorClass = ball.isWicket ? 'bg-red-500 text-white border-red-600' :
                               ball.extraType === 'WIDE' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                               ball.extraType === 'NO_BALL' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                               'bg-white text-slate-700 border-slate-200';
              
              return (
                <div key={ball.id} className={`w-10 px-2 h-8 rounded-full flex items-center justify-center text-[10px] font-black border ${colorClass}`}>
                  {label}
                </div>
              );
          })}
      </div>

      <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3, 4, 6].map(run => (
              <button key={run} onClick={() => submitBall({ runs: run, extras: 0, extraType: 'NONE', isWicket: false })} className="bg-white py-4 rounded-xl font-black text-slate-800 shadow-sm border-b-4 border-gray-200 active:border-0 active:translate-y-1 transition-all">{run}</button>
          ))}
          <button onClick={() => setShowWideModal(true)} className="bg-[#fff9e6] py-4 rounded-xl font-black text-amber-900 border-b-4 border-amber-200 active:border-0 active:translate-y-1">wd</button>
          <button onClick={() => setShowNoBallModal(true)} className="bg-[#fff1e6] py-4 rounded-xl font-black text-orange-900 border-b-4 border-orange-200 active:border-0 active:translate-y-1">nb</button>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mt-2">
          <button onClick={() => {
              setWicketType('CAUGHT');
              setWicketPlayerId(inning.currentStrikerId || '');
              setShowWicketModal(true);
          }} className="bg-[#ef4444] text-white py-4 rounded-xl font-black border-b-4 border-red-700 shadow-lg active:border-0 active:translate-y-1 transition-all uppercase tracking-widest">OUT</button>
          <button onClick={() => dispatch({ type: 'UNDO_LAST_BALL' })} disabled={state.undoStack.length === 0} className="bg-slate-100 text-slate-700 py-4 rounded-xl font-bold border-b-4 border-slate-300 disabled:opacity-50 flex items-center justify-center gap-2"><RotateCcw size={18} /> Undo</button>
          <button onClick={() => navigate(`/summary/${match.id}`)} className="bg-[#1e293b] text-white py-4 rounded-xl font-black border-b-4 border-slate-900 active:border-0 active:translate-y-1">Scorecard</button>
      </div>

      {/* BATSMEN SELECTION MODAL */}
      {needsBatsmen && !showAllOutModal && !isBatsmenDismissed && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setBatsmenDismissed(true)}>
            <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-pop overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="mb-8">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Select Batsmen</h3>
                </div>
                
                <div className="space-y-6 mb-10">
                    {!inning.currentStrikerId && (
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Striker</label>
                            <select 
                              className="w-full p-5 border border-slate-200 rounded-2xl bg-white text-slate-800 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                              value={selectedStriker}
                              onChange={(e) => setSelectedStriker(e.target.value)}
                            >
                                <option value="">Choose Striker</option>
                                {battingTeam.players.filter(p => !inning.battingStats[p.id]?.isOut && p.id !== selectedNonStriker && p.id !== inning.currentNonStrikerId).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {!inning.currentNonStrikerId && !inning.loneStrikerMode && (
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Non-Striker</label>
                             <select 
                              className="w-full p-5 border border-slate-200 rounded-2xl bg-white text-slate-800 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                              value={selectedNonStriker}
                              onChange={(e) => setSelectedNonStriker(e.target.value)}
                            >
                                <option value="">Choose Non-Striker</option>
                                {battingTeam.players.filter(p => !inning.battingStats[p.id]?.isOut && p.id !== selectedStriker && p.id !== inning.currentStrikerId).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                
                <button 
                  disabled={(!inning.currentStrikerId && !selectedStriker) || (!inning.currentNonStrikerId && !selectedNonStriker && !inning.loneStrikerMode)}
                  onClick={() => {
                      dispatch({ 
                          type: 'SET_BATSMEN', 
                          payload: { 
                              strikerId: inning.currentStrikerId || selectedStriker, 
                              nonStrikerId: inning.currentNonStrikerId || selectedNonStriker 
                          } 
                      });
                      setSelectedStriker('');
                      setSelectedNonStriker('');
                  }}
                  className="w-full bg-[#A7D1C4] text-[#064e3b] py-5 rounded-2xl font-black shadow-lg disabled:opacity-40 transition-all transform active:scale-95 text-lg"
                >
                    Start Batting
                </button>
            </div>
        </div>
      )}

      {/* BOWLER SELECTION MODAL */}
      {needsBowler && !needsBatsmen && !showAllOutModal && !isBowlerDismissed && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setBowlerDismissed(true)}>
            <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-pop" onClick={e => e.stopPropagation()}>
                <div className="mb-8">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Select Bowler</h3>
                </div>
                
                <div className="space-y-6 mb-10">
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Current Bowler</label>
                        <select 
                          className="w-full p-5 border border-slate-200 rounded-2xl bg-white text-slate-800 font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                          value={selectedBowler}
                          onChange={(e) => setSelectedBowler(e.target.value)}
                        >
                            <option value="">Choose Bowler</option>
                            {bowlingTeam.players.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <button 
                  disabled={!selectedBowler}
                  onClick={() => {
                      dispatch({ type: 'SET_BOWLER', payload: { bowlerId: selectedBowler } });
                      setSelectedBowler('');
                  }}
                  className="w-full bg-[#ADC4F0] text-[#1e3a8a] py-5 rounded-2xl font-black shadow-lg disabled:opacity-40 transition-all transform active:scale-95 text-lg"
                >
                    Confirm Bowler
                </button>
            </div>
        </div>
      )}

      {/* NO BALL MODAL */}
      {showNoBallModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowNoBallModal(false)}>
            <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl animate-pop" onClick={e => e.stopPropagation()}>
                <h3 className="font-black text-slate-900 mb-6 uppercase tracking-widest text-center">No Ball + Runs?</h3>
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[0,1,2,3,4,6].map(r => (
                        <button key={r} onClick={() => submitBall({ runs: r, extras: 1, extraType: 'NO_BALL', isWicket: false })} className="py-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-black hover:bg-orange-50 hover:border-orange-200 transition-all active:scale-95">{r}</button>
                    ))}
                </div>
                <button onClick={() => setShowNoBallModal(false)} className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors">Cancel</button>
            </div>
        </div>
      )}

      {/* WIDE MODAL */}
      {showWideModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowWideModal(false)}>
            <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl animate-pop" onClick={e => e.stopPropagation()}>
                <h3 className="font-black text-slate-900 mb-6 uppercase tracking-widest text-center">Wide Extras?</h3>
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[0,1,2,3,4].map(r => (
                        <button key={r} onClick={() => submitBall({ runs: 0, extras: 1+r, extraType: 'WIDE', isWicket: false })} className="py-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-bold hover:bg-amber-50 hover:border-amber-200 transition-all active:scale-95">{r}</button>
                    ))}
                </div>
                <button onClick={() => setShowWideModal(false)} className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors">Cancel</button>
            </div>
        </div>
      )}
      
      {/* WICKET MODAL */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowWicketModal(false)}>
            <div className="bg-white p-8 rounded-[2rem] w-full max-w-sm shadow-2xl animate-pop" onClick={e => e.stopPropagation()}>
                <h3 className="font-black text-slate-900 mb-8 uppercase tracking-widest text-center">Wicket Details</h3>
                
                <div className="space-y-6 mb-10">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Wicket Type</label>
                        <select 
                            className="w-full p-4 border border-slate-200 rounded-2xl bg-white text-slate-900 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all" 
                            value={wicketType} 
                            onChange={e => setWicketType(e.target.value as WicketType)}
                        >
                            <option value="BOWLED">Bowled</option>
                            <option value="CAUGHT">Caught</option>
                            <option value="LBW">LBW</option>
                            <option value="RUN_OUT">Run Out</option>
                            <option value="STUMPED">Stumped</option>
                            <option value="HIT_WICKET">Hit Wicket</option>
                        </select>
                    </div>

                    {(wicketType === 'CAUGHT' || wicketType === 'RUN_OUT' || wicketType === 'STUMPED') && (
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Fielder Name</label>
                            <input 
                                type="text"
                                placeholder="Who made the catch/run out?"
                                className="w-full p-4 border border-slate-200 rounded-2xl bg-white text-slate-900 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                                value={fielderName}
                                onChange={e => setFielderName(e.target.value)}
                            />
                        </div>
                    )}

                    {wicketType === 'RUN_OUT' && (
                        <>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Who is Out?</label>
                            <select 
                                className="w-full p-4 border border-slate-200 rounded-2xl bg-white text-slate-900 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all" 
                                value={wicketPlayerId} 
                                onChange={e => setWicketPlayerId(e.target.value)}
                            >
                                <option value={inning.currentStrikerId || ''}>{striker?.name} (Striker)</option>
                                <option value={inning.currentNonStrikerId || ''}>{nonStriker?.name} (Non-Striker)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Runs Completed</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[0,1,2,3].map(r => (
                                    <button 
                                        key={r}
                                        onClick={() => setRunsOnWicket(r)}
                                        className={`py-3 rounded-xl font-bold border transition-all ${runsOnWicket === r ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        </>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => submitBall({ 
                            runs: 0, 
                            extras: 0, 
                            extraType: 'NONE', 
                            isWicket: true, 
                            wicketType, 
                            wicketPlayerId: wicketType === 'RUN_OUT' ? wicketPlayerId : inning.currentStrikerId,
                            fielderName,
                            runsOnWicket: wicketType === 'RUN_OUT' ? runsOnWicket : 0
                        })} 
                        className="w-full bg-[#ef4444] text-white py-5 rounded-2xl font-black shadow-xl hover:bg-red-600 transition-all transform active:scale-95 uppercase tracking-widest"
                    >
                        Confirm Wicket
                    </button>
                    <button onClick={() => setShowWicketModal(false)} className="w-full py-2 text-slate-400 font-bold hover:text-slate-600">Cancel</button>
                </div>
            </div>
        </div>
      )}

      {/* END MATCH MODAL */}
      {showEndMatchModal && (
          <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowEndMatchModal(false)}>
              <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-pop text-center" onClick={e => e.stopPropagation()}>
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40} /></div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Abandon Match?</h3>
                  <p className="text-slate-500 mb-8 text-sm leading-relaxed">This will end the match immediately. The team with the higher **Current Run Rate** will be declared the winner.</p>
                  
                  <div className="space-y-6 mb-10 text-left">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Reason</label>
                          <select 
                            className="w-full p-4 border border-slate-200 rounded-2xl bg-white text-slate-800 font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all"
                            value={endReason}
                            onChange={e => setEndReason(e.target.value)}
                          >
                              <option>Rain</option>
                              <option>Bad Light</option>
                              <option>Ground Conditions</option>
                              <option>Mutual Agreement</option>
                              <option>Other</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Type 'CANCEL' to confirm</label>
                          <input 
                            type="text"
                            placeholder="CANCEL"
                            className="w-full p-4 border border-slate-200 rounded-2xl bg-white font-bold text-center tracking-widest text-slate-900 focus:ring-4 focus:ring-red-500/10 outline-none"
                            value={endConfirmText}
                            onChange={e => setEndConfirmText(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="flex flex-col gap-3">
                      <button 
                        disabled={endConfirmText.toUpperCase() !== 'CANCEL'}
                        onClick={handleAbandonMatch}
                        className="w-full bg-red-600 text-white py-5 rounded-2xl font-black disabled:opacity-30 shadow-lg hover:bg-red-700 transition-all active:scale-95"
                      >
                          Finalize Abandonment
                      </button>
                      <button onClick={() => { setShowEndMatchModal(false); setEndConfirmText(''); }} className="w-full py-2 text-slate-400 font-bold hover:text-slate-600">Keep Playing</button>
                  </div>
              </div>
          </div>
      )}
      
      {showAllOutModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowAllOutModal(false)}>
            <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md text-center shadow-2xl animate-pop border-t-8 border-emerald-600" onClick={e => e.stopPropagation()}>
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40}/></div>
                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Innings Complete?</h3>
                <p className="text-slate-500 mb-10 font-medium">This team has lost all its wickets or overs are up.</p>
                <div className="flex flex-col gap-4">
                    <button onClick={() => { setShowAllOutModal(false); dispatch({ type: 'ALLOW_LONE_STRIKER' }); }} className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95">Continue with Lone Striker</button>
                    <button onClick={() => { setShowAllOutModal(false); dispatch({ type: 'DECLARE_INNING_END' }); }} className="bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all transform active:scale-95 text-lg">End Innings Now</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
