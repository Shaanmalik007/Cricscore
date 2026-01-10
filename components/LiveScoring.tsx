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

  const [showNoBallModal, setShowNoBallModal] = useState(false);
  const [showWideModal, setShowWideModal] = useState(false);
  
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const [endConfirmText, setEndConfirmText] = useState('');
  const [endReason, setEndReason] = useState('Rain');

  const [celebration, setCelebration] = useState<'FOUR' | 'SIX' | 'WICKET' | null>(null);

  const [selectedStriker, setSelectedStriker] = useState('');
  const [selectedNonStriker, setSelectedNonStriker] = useState('');
  const [selectedBowler, setSelectedBowler] = useState('');

  const [isBatsmenDismissed, setBatsmenDismissed] = useState(false);
  const [isBowlerDismissed, setBowlerDismissed] = useState(false);

  useEffect(() => {
    if (celebration) {
      const timer = setTimeout(() => setCelebration(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [celebration]);

  const inning = match ? match.innings[match.currentInningIndex] : undefined;

  if (!match) return <div className="p-8 text-center text-white/50 text-sm">Match not found</div>;
  
  // COMPLETED GUARD
  if (match.status === 'COMPLETED') {
       return (
           <div className="p-6 text-center h-full flex flex-col items-center justify-center">
               <div className="glass-panel p-8 rounded-[2rem] mb-6 max-w-sm w-full border-t-4 border-emerald-500 animate-pop">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                      <CheckCircle size={32} />
                  </div>
                  <h2 className="text-xl font-black mb-1 text-white uppercase tracking-tight">Match Finished</h2>
                  <p className="text-sm text-emerald-400 font-bold mb-4">
                      {match.abandonmentReason || (match.winnerTeamId ? `${match.teams.find(t=>t.id===match.winnerTeamId)?.name} Won` : 'Match Tied')}
                  </p>
                  <p className="text-white/40 text-xs">Scorecard is finalized.</p>
               </div>
               <button onClick={() => navigate(`/summary/${match.id}`)} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 transition-all text-sm">View Report</button>
           </div>
       );
  }

  if (!inning) return <div className="p-8 text-center font-bold text-sm text-white/60">Initializing...</div>;

  const battingTeam = match.teams.find(t => t.id === inning.battingTeamId);
  const bowlingTeam = match.teams.find(t => t.id === inning.bowlingTeamId);
  
  if (!battingTeam || !bowlingTeam) return null;

  const needsBatsmen = !inning.currentStrikerId || (!inning.loneStrikerMode && !inning.currentNonStrikerId);
  const needsBowler = !inning.currentBowlerId;
  const isLocked = inning.isCompleted;

  const handleAbandonMatch = () => {
      if (endConfirmText.toUpperCase() !== 'CANCEL') return;
      
      const inn1 = match.innings[0];
      const inn2 = match.innings[1];
      const rr1 = inn1.totalBalls > 0 ? (inn1.totalRuns / (inn1.totalBalls / 6)) : 0;
      const rr2 = inn2.totalBalls > 0 ? (inn2.totalRuns / (inn2.totalBalls / 6)) : 0;

      let winId = null;
      let margin = "Abandoned";
      if (rr2 > rr1) {
          winId = inn2.battingTeamId;
          margin = `Won on Run Rate (${rr2.toFixed(2)})`;
      } else if (rr1 > rr2) {
          winId = inn1.battingTeamId;
          margin = `Won on Run Rate (${rr1.toFixed(2)})`;
      }

      dispatch({ 
          type: 'FINALIZE_MATCH', 
          payload: { matchId: match.id, winnerTeamId: winId, reason: endReason, winMargin: margin } 
      });
  };

  const submitBall = (payload: any) => {
      if (match.status === 'COMPLETED' || inning.isCompleted) return;
      if (needsBowler || needsBatsmen) {
          setBatsmenDismissed(false);
          setBowlerDismissed(false);
          return;
      }
      
      dispatch({ type: 'RECORD_BALL', payload });
      setShowWicketModal(false);
      setShowNoBallModal(false);
      setShowWideModal(false);
      
      if (payload.isWicket) setCelebration('WICKET');
      else if (payload.runs === 4 && payload.extraType === 'NONE') setCelebration('FOUR');
      else if (payload.runs === 6 && payload.extraType === 'NONE') setCelebration('SIX');
  };

  const striker = battingTeam.players.find(p => p.id === inning.currentStrikerId);
  const nonStriker = inning.currentNonStrikerId ? battingTeam.players.find(p => p.id === inning.currentNonStrikerId) : null;
  const bowler = bowlingTeam.players.find(p => p.id === inning.currentBowlerId);
  const strikerStats = striker ? inning.battingStats[striker.id] : { runs: 0, balls: 0 };
  const nonStrikerStats = nonStriker ? inning.battingStats[nonStriker.id] : { runs: 0, balls: 0 };
  const bowlerStats = bowler ? inning.bowlingStats[bowler.id] : { wickets: 0, runsConceded: 0, ballsBowled: 0 };
  
  const targetValue = match.currentInningIndex === 1 ? match.innings[0].totalRuns + 1 : 0;
  const winProb = targetValue > 0 ? GameLogic.calculateWinProbability(targetValue, inning.totalRuns, inning.totalBalls, inning.totalWickets, match.oversPerInning) : 50;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20 relative">
      {/* Celebration Overlays */}
      {celebration === 'FOUR' && <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center backdrop-blur-sm"><div className="bg-blue-600 text-white text-5xl font-black px-12 py-6 rounded-2xl shadow-2xl animate-pop rotate-[-3deg] border-4 border-white/20">4 RUNS!</div></div>}
      {celebration === 'SIX' && <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center backdrop-blur-sm"><div className="bg-purple-600 text-white text-7xl font-black px-14 py-8 rounded-3xl shadow-2xl animate-pop border-4 border-yellow-400 rotate-[3deg]">SIX!</div></div>}
      {celebration === 'WICKET' && <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center flex-col gap-4 backdrop-blur-sm"><div className="text-8xl animate-bounce">☝️</div><div className="bg-red-600 text-white text-5xl font-black px-12 py-6 rounded-2xl shadow-2xl animate-pop border-4 border-white/20">WICKET!</div></div>}

      {/* Score Header */}
      <div className="glass-panel p-6 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
        
        <div className="flex justify-between items-center mb-4 relative z-10">
            <button onClick={() => navigate('/')} className="text-white/60 hover:text-white flex items-center gap-1.5 transition-colors">
                <ArrowLeft size={16}/> <span className="text-[10px] font-bold uppercase tracking-wider">Back</span>
            </button>
            <div className="flex items-center gap-3">
                <button onClick={() => setShowEndMatchModal(true)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Power size={14} /></button>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                    <Share2 size={12} className="text-emerald-400"/>
                    <span className="text-[10px] font-mono font-bold text-white/80 select-all tracking-wider">{match.gameId || 'LOCAL'}</span>
                </div>
            </div>
        </div>
        
        <div className="flex justify-between items-end relative z-10">
             <div>
                 <div className="text-5xl font-black leading-none mb-2 text-white tracking-tighter drop-shadow-lg">{inning.totalRuns}<span className="text-white/40 text-3xl mx-1">/</span>{inning.totalWickets}</div>
                 <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span>Over {GameLogic.getOversDisplay(inning.totalBalls)}</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                    <span>CRR {GameLogic.calculateRunRate(inning.totalRuns, inning.totalBalls)}</span>
                 </div>
             </div>
             <div className="text-right">
                 <div className="text-sm font-bold uppercase tracking-widest text-white/80 mb-1">{bowlingTeam.shortName}</div>
                 <div className="text-[10px] text-white/40 font-mono border border-white/10 px-2 py-0.5 rounded bg-white/5">
                    Target: {match.currentInningIndex === 1 ? match.innings[0].totalRuns + 1 : '-'}
                 </div>
             </div>
        </div>

        {/* Win Probability Bar */}
        <div className="mt-5 relative z-10">
          <div className="flex justify-between text-[9px] uppercase font-black tracking-widest mb-1.5 text-white/40">
            <span>{battingTeam.shortName} {winProb}%</span>
            <span>{bowlingTeam.shortName} {100-winProb}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex shadow-inner">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: `${winProb}%` }}></div>
          </div>
        </div>
      </div>

      {/* Players Card */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-lg border-white/5">
         <div className="p-4 grid grid-cols-2 divide-x divide-white/5">
             <div className="pr-4">
                 <button disabled={isLocked} onClick={() => setBatsmenDismissed(false)} className={`w-full text-left transition-opacity ${needsBatsmen && !isLocked ? 'animate-pulse' : ''}`}>
                    {striker ? (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-white truncate text-sm flex items-center gap-1">{striker.name} <span className="text-emerald-400 text-[10px]">★</span></span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="font-mono font-bold text-white text-lg">{strikerStats?.runs}</span>
                                <span className="text-[10px] text-white/40 font-medium">({strikerStats?.balls})</span>
                            </div>
                        </div>
                    ) : <div className="text-white/30 italic text-xs py-2 border-2 border-dashed border-white/10 rounded-lg text-center hover:border-emerald-500/50 hover:text-emerald-400 transition-colors">{isLocked ? '-' : '+ Select Striker'}</div>}
                 </button>
             </div>
             <div className="pl-4">
                 {nonStriker ? (
                    <div className="opacity-60">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-white truncate text-sm">{nonStriker.name}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="font-mono font-bold text-white text-lg">{nonStrikerStats?.runs}</span>
                            <span className="text-[10px] text-white/40 font-medium">({nonStrikerStats?.balls})</span>
                        </div>
                    </div>
                 ) : <div className="text-white/20 italic text-xs py-2 text-center">{inning.loneStrikerMode ? 'Lone Striker' : (isLocked ? '-' : 'Non-Striker')}</div>}
             </div>
         </div>
         <button disabled={isLocked} onClick={() => setBowlerDismissed(false)} className={`w-full bg-white/5 px-4 py-3 border-t border-white/5 flex justify-between items-center text-xs ${needsBowler && !isLocked ? 'bg-blue-500/20 animate-pulse' : 'hover:bg-white/10'} transition-colors`}>
             <div className="font-medium text-white/90">{bowler ? bowler.name : (isLocked ? '-' : '+ Select Bowler')}</div>
             <div className="font-mono font-bold text-white">{bowlerStats?.wickets}-{bowlerStats?.runsConceded} <span className="text-[10px] text-white/40 font-normal ml-1">({GameLogic.getOversDisplay(bowlerStats?.ballsBowled || 0)})</span></div>
         </button>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar px-1">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider flex-shrink-0">Over:</span>
          {inning.thisOver.map((ball) => {
              const label = ball.isWicket ? 'W' : 
                   ball.extraType === 'WIDE' ? `w${ball.extras}` : 
                   ball.extraType === 'NO_BALL' ? `n${ball.runsScored+ball.extras}` : 
                   ball.runsScored;
              return <div key={ball.id} className={`
                w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border flex-shrink-0 shadow-lg
                ${ball.isWicket ? 'bg-red-500 text-white border-red-400 shadow-red-900/50' : 
                  ball.runsScored >= 4 ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white border-blue-400' :
                  'bg-white/10 text-white border-white/10'}
              `}>{label}</div>;
          })}
      </div>

      {/* Controls */}
      <div className={`grid grid-cols-4 gap-2 ${isLocked ? 'opacity-30 pointer-events-none' : ''}`}>
          {[0, 1, 2, 3, 4, 6].map(run => (
              <button key={run} onClick={() => submitBall({ runs: run, extras: 0, extraType: 'NONE', isWicket: false })} className="bg-white/5 hover:bg-white/10 active:scale-95 py-4 rounded-xl font-black text-white shadow-lg border border-white/5 transition-all text-xl">{run}</button>
          ))}
          <button onClick={() => setShowWideModal(true)} className="bg-amber-500/10 hover:bg-amber-500/20 py-4 rounded-xl font-black text-amber-400 border border-amber-500/20 text-xs uppercase tracking-wider">Wide</button>
          <button onClick={() => setShowNoBallModal(true)} className="bg-orange-500/10 hover:bg-orange-500/20 py-4 rounded-xl font-black text-orange-400 border border-orange-500/20 text-xs uppercase tracking-wider">NB</button>
      </div>
      
      <div className="grid grid-cols-3 gap-3 mt-2">
          <button disabled={isLocked} onClick={() => { setWicketType('CAUGHT'); setShowWicketModal(true); }} className="bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-black border border-red-400 shadow-lg shadow-red-900/40 uppercase tracking-widest text-sm disabled:opacity-50 transition-all active:scale-95">OUT</button>
          <button onClick={() => dispatch({ type: 'UNDO_LAST_BALL' })} disabled={state.undoStack.length === 0} className="bg-white/5 hover:bg-white/10 text-white/70 py-4 rounded-xl font-bold border border-white/10 disabled:opacity-30 flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wide"><RotateCcw size={14} /> Undo</button>
          <button onClick={() => navigate(`/summary/${match.id}`)} className="bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold border border-slate-600 text-xs uppercase tracking-wide">Report</button>
      </div>

      {/* MODALS (Styled Dark) */}
      
      {/* BATSMEN SELECTION MODAL */}
      {needsBatsmen && !isLocked && !isBatsmenDismissed && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setBatsmenDismissed(true)}>
            <div className="glass-panel p-6 rounded-[2rem] w-full max-w-sm shadow-2xl animate-pop border-white/10" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-black text-white mb-6">Select Batsmen</h3>
                <div className="space-y-4 mb-8">
                    {!inning.currentStrikerId && (
                        <select className="w-full p-4 border border-white/10 rounded-xl font-bold bg-white/5 text-white outline-none focus:ring-1 focus:ring-emerald-500 text-sm appearance-none" value={selectedStriker} onChange={(e) => setSelectedStriker(e.target.value)}>
                            <option value="" className="bg-slate-900">Choose Striker</option>
                            {battingTeam.players.filter(p => !inning.battingStats[p.id]?.isOut && p.id !== selectedNonStriker && p.id !== inning.currentNonStrikerId).map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
                        </select>
                    )}
                    {!inning.currentNonStrikerId && !inning.loneStrikerMode && (
                        <select className="w-full p-4 border border-white/10 rounded-xl font-bold bg-white/5 text-white outline-none focus:ring-1 focus:ring-emerald-500 text-sm appearance-none" value={selectedNonStriker} onChange={(e) => setSelectedNonStriker(e.target.value)}>
                            <option value="" className="bg-slate-900">Choose Non-Striker</option>
                            {battingTeam.players.filter(p => !inning.battingStats[p.id]?.isOut && p.id !== selectedStriker && p.id !== inning.currentStrikerId).map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
                        </select>
                    )}
                </div>
                <button disabled={(!inning.currentStrikerId && !selectedStriker) || (!inning.currentNonStrikerId && !selectedNonStriker && !inning.loneStrikerMode)} onClick={() => { dispatch({ type: 'SET_BATSMEN', payload: { strikerId: inning.currentStrikerId || selectedStriker, nonStrikerId: inning.currentNonStrikerId || selectedNonStriker } }); }} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-emerald-500 transition-all text-sm uppercase tracking-wider">Start Batting</button>
            </div>
        </div>
      )}

      {/* BOWLER SELECTION MODAL */}
      {needsBowler && !isLocked && !isBowlerDismissed && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setBowlerDismissed(true)}>
            <div className="glass-panel p-6 rounded-[2rem] w-full max-w-sm shadow-2xl animate-pop border-white/10" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-black text-white mb-6">Select Bowler</h3>
                <select className="w-full p-4 border border-white/10 rounded-xl font-bold bg-white/5 text-white mb-8 text-sm outline-none focus:ring-1 focus:ring-blue-500 appearance-none" value={selectedBowler} onChange={(e) => setSelectedBowler(e.target.value)}>
                    <option value="" className="bg-slate-900">Choose Bowler</option>
                    {bowlingTeam.players.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
                </select>
                <button disabled={!selectedBowler} onClick={() => { dispatch({ type: 'SET_BOWLER', payload: { bowlerId: selectedBowler } }); }} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-500 transition-all text-sm uppercase tracking-wider">Confirm Bowler</button>
            </div>
        </div>
      )}

      {/* END MATCH MODAL */}
      {showEndMatchModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setShowEndMatchModal(false)}>
              <div className="glass-panel p-6 rounded-[2rem] w-full max-w-sm shadow-2xl animate-pop text-center border-t-4 border-red-500" onClick={e => e.stopPropagation()}>
                  <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30"><AlertTriangle size={24} /></div>
                  <h3 className="text-lg font-bold text-white mb-1">End Match?</h3>
                  <p className="text-white/50 mb-6 text-xs">This action cannot be undone.</p>
                  
                  <div className="space-y-4 mb-6 text-left">
                      <div>
                          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">End Reason</label>
                          <select className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white font-bold text-sm outline-none" value={endReason} onChange={e => setEndReason(e.target.value)}>
                              <option className="bg-slate-900">Rain</option><option className="bg-slate-900">Bad Light</option><option className="bg-slate-900">Manual Conclusion</option><option className="bg-slate-900">Other</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Type 'CANCEL'</label>
                          <input type="text" placeholder="CANCEL" className="w-full p-3 border border-white/10 bg-white/5 text-white rounded-xl font-bold text-center text-sm outline-none focus:ring-1 focus:ring-red-500" value={endConfirmText} onChange={e => setEndConfirmText(e.target.value)}/>
                      </div>
                  </div>

                  <button disabled={endConfirmText.toUpperCase() !== 'CANCEL'} onClick={handleAbandonMatch} className="w-full bg-red-600 text-white py-4 rounded-xl font-bold disabled:opacity-30 shadow-lg hover:bg-red-500 transition-all text-sm uppercase tracking-wider">End Match</button>
                  <button onClick={() => setShowEndMatchModal(false)} className="w-full py-3 text-white/40 font-bold mt-2 text-xs hover:text-white transition-colors">Return</button>
              </div>
          </div>
      )}

      {/* WICKET MODAL */}
      {showWicketModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setShowWicketModal(false)}>
            <div className="glass-panel p-6 rounded-[2rem] w-full max-w-sm shadow-2xl animate-pop border-white/10" onClick={e => e.stopPropagation()}>
                <h3 className="font-black text-white mb-6 uppercase tracking-widest text-center text-sm">Wicket Details</h3>
                <div className="space-y-4 mb-8">
                    <select className="w-full p-4 border border-white/10 bg-white/5 rounded-xl font-bold text-sm text-white outline-none focus:ring-1 focus:ring-red-500 appearance-none" value={wicketType} onChange={e => setWicketType(e.target.value as WicketType)}>
                        <option value="BOWLED" className="bg-slate-900">Bowled</option><option value="CAUGHT" className="bg-slate-900">Caught</option><option value="LBW" className="bg-slate-900">LBW</option><option value="RUN_OUT" className="bg-slate-900">Run Out</option><option value="STUMPED" className="bg-slate-900">Stumped</option>
                    </select>
                    <input type="text" placeholder="Fielder Name" className="w-full p-4 border border-white/10 bg-white/5 rounded-xl font-bold text-sm text-white outline-none focus:ring-1 focus:ring-red-500 placeholder-white/20" value={fielderName} onChange={e => setFielderName(e.target.value)}/>
                </div>
                <button onClick={() => submitBall({ runs: 0, extras: 0, extraType: 'NONE', isWicket: true, wicketType, wicketPlayerId: wicketType === 'RUN_OUT' ? wicketPlayerId : inning.currentStrikerId, fielderName })} className="w-full bg-red-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-900/40 uppercase tracking-wider text-sm hover:bg-red-500 transition-all">Confirm Wicket</button>
            </div>
        </div>
      )}

      {/* NO BALL MODAL */}
      {showNoBallModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setShowNoBallModal(false)}>
            <div className="glass-panel p-6 rounded-[2rem] w-full max-w-xs shadow-2xl animate-pop border-white/10" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-orange-400 mb-6 uppercase tracking-wider text-center text-xs">No Ball + Runs</h3>
                <div className="grid grid-cols-3 gap-3">
                    {[0,1,2,3,4,6].map(r => <button key={r} onClick={() => submitBall({ runs: r, extras: 1, extraType: 'NO_BALL', isWicket: false })} className="py-4 bg-white/5 border border-white/10 rounded-xl font-black text-sm hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all text-white">{r}</button>)}
                </div>
            </div>
        </div>
      )}

      {/* WIDE MODAL */}
      {showWideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setShowWideModal(false)}>
            <div className="glass-panel p-6 rounded-[2rem] w-full max-w-xs shadow-2xl animate-pop border-white/10" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-amber-400 mb-6 uppercase tracking-wider text-center text-xs">Wide Extras</h3>
                <div className="grid grid-cols-3 gap-3">
                    {[1,2,3,4,5].map(r => <button key={r} onClick={() => submitBall({ runs: 0, extras: r, extraType: 'WIDE', isWicket: false })} className="py-4 bg-white/5 border border-white/10 rounded-xl font-black text-sm hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all text-white">{r}</button>)}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};