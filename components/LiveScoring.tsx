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

  if (!match) return <div className="p-8 text-center text-gray-500 text-sm">Match not found</div>;
  
  // COMPLETED GUARD
  if (match.status === 'COMPLETED') {
       return (
           <div className="p-6 text-center bg-gray-50 min-h-screen flex flex-col items-center justify-center">
               <div className="bg-white p-8 rounded-xl shadow-lg mb-4 max-w-sm w-full border-t-4 border-emerald-600 animate-pop">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} />
                  </div>
                  <h2 className="text-xl font-bold mb-1 text-gray-900">Match Completed</h2>
                  <p className="text-sm text-emerald-700 font-bold mb-4">
                      {match.abandonmentReason || (match.winnerTeamId ? `${match.teams.find(t=>t.id===match.winnerTeamId)?.name} Won!` : 'Match Finished')}
                  </p>
                  <p className="text-gray-500 text-xs">Results locked.</p>
               </div>
               <button onClick={() => navigate(`/summary/${match.id}`)} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold shadow hover:bg-emerald-700 text-sm">View Scorecard</button>
           </div>
       );
  }

  if (!inning) return <div className="p-8 text-center font-bold text-sm">Initializing...</div>;

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
    <div className="max-w-2xl mx-auto space-y-3 pb-20 relative">
      {celebration === 'FOUR' && <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center"><div className="bg-blue-600 text-white text-4xl font-black px-8 py-4 rounded-xl shadow-2xl animate-pop rotate-[-5deg]">4 RUNS!</div></div>}
      {celebration === 'SIX' && <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center"><div className="bg-purple-600 text-white text-6xl font-black px-10 py-6 rounded-xl shadow-2xl animate-pop border-4 border-yellow-400">SIX!</div></div>}
      {celebration === 'WICKET' && <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center flex-col gap-2"><div className="text-6xl animate-bounce">🦆</div><div className="bg-red-600 text-white text-4xl font-black px-8 py-4 rounded-xl shadow-2xl animate-pop">WICKET!</div></div>}

      <div className="bg-[#064e3b] text-white p-4 rounded-xl shadow-md border border-white/10">
        <div className="flex justify-between items-center mb-2">
            <button onClick={() => navigate('/')} className="text-emerald-300 hover:text-white flex items-center gap-1">
                <ArrowLeft size={16}/> <span className="text-[10px] font-bold uppercase">Back</span>
            </button>
            <div className="flex items-center gap-2">
                <button onClick={() => setShowEndMatchModal(true)} className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors"><Power size={12} /></button>
                <div className="flex items-center gap-1 bg-emerald-800/50 px-2 py-0.5 rounded border border-emerald-700">
                    <Share2 size={10} className="text-emerald-400"/>
                    <span className="text-[10px] font-mono font-bold text-white select-all">{match.gameId || 'LIVE'}</span>
                </div>
            </div>
        </div>
        
        <div className="flex justify-between items-end">
             <div>
                 <div className="text-3xl font-bold leading-none mb-1">{inning.totalRuns}/{inning.totalWickets}</div>
                 <div className="text-emerald-300 text-xs font-medium">Over {GameLogic.getOversDisplay(inning.totalBalls)} <span className="mx-1 opacity-50">|</span> CRR: {GameLogic.calculateRunRate(inning.totalRuns, inning.totalBalls)}</div>
             </div>
             <div className="text-right">
                 <div className="text-sm font-bold uppercase tracking-wider">{bowlingTeam.shortName}</div>
                 <div className="text-[10px] text-emerald-300">Target: {match.currentInningIndex === 1 ? match.innings[0].totalRuns + 1 : '-'}</div>
             </div>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-[8px] uppercase font-black tracking-widest mb-1 text-emerald-400">
            <span>{battingTeam.shortName} {winProb}%</span>
            <span>{bowlingTeam.shortName} {100-winProb}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden flex">
            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${winProb}%` }}></div>
            <div className="h-full bg-slate-600 transition-all duration-1000 flex-1"></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-sm">
         <div className="p-3 grid grid-cols-2 divide-x divide-gray-100">
             <div className="pr-3">
                 <button disabled={isLocked} onClick={() => setBatsmenDismissed(false)} className={`w-full text-left transition-opacity ${needsBatsmen && !isLocked ? 'animate-pulse' : ''}`}>
                    {striker ? (
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900 truncate text-sm">{striker.name} ★</span>
                            <span className="font-mono font-bold text-slate-800 text-sm">{strikerStats?.runs} <span className="text-[10px] text-slate-400 font-normal">({strikerStats?.balls})</span></span>
                        </div>
                    ) : <div className="text-gray-400 italic text-xs">{isLocked ? '-' : 'Select Striker'}</div>}
                 </button>
             </div>
             <div className="pl-3 opacity-70">
                 {nonStriker ? (
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-700 truncate text-sm">{nonStriker.name}</span>
                        <span className="font-mono font-bold text-slate-700 text-sm">{nonStrikerStats?.runs} <span className="text-[10px] text-slate-400 font-normal">({nonStrikerStats?.balls})</span></span>
                    </div>
                 ) : <div className="text-gray-400 italic text-xs">{inning.loneStrikerMode ? 'Lone Striker' : (isLocked ? '-' : 'Non-Striker')}</div>}
             </div>
         </div>
         <button disabled={isLocked} onClick={() => setBowlerDismissed(false)} className={`w-full bg-slate-50 px-3 py-2 border-t border-gray-100 flex justify-between items-center text-xs ${needsBowler && !isLocked ? 'bg-blue-50 animate-pulse' : ''}`}>
             <div className="font-medium text-slate-800">{bowler ? bowler.name : (isLocked ? '-' : 'Select Bowler')}</div>
             <div className="font-mono font-bold text-slate-900">{bowlerStats?.wickets}-{bowlerStats?.runsConceded} <span className="text-[10px] text-slate-400 font-normal">({GameLogic.getOversDisplay(bowlerStats?.ballsBowled || 0)})</span></div>
         </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Over:</span>
          {inning.thisOver.map((ball) => {
              const label = ball.isWicket ? 'W' : 
                   ball.extraType === 'WIDE' ? `w${ball.extras}` : 
                   ball.extraType === 'NO_BALL' ? `n${ball.runsScored+ball.extras}` : 
                   ball.runsScored;
              return <div key={ball.id} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border flex-shrink-0 ${ball.isWicket ? 'bg-red-500 text-white border-red-600' : 'bg-white text-slate-700 border-slate-200'}`}>{label}</div>;
          })}
      </div>

      <div className={`grid grid-cols-4 gap-2 ${isLocked ? 'opacity-30 pointer-events-none' : ''}`}>
          {[0, 1, 2, 3, 4, 6].map(run => (
              <button key={run} onClick={() => submitBall({ runs: run, extras: 0, extraType: 'NONE', isWicket: false })} className="bg-white py-3 rounded-lg font-black text-slate-800 shadow-sm border border-b-2 border-gray-200 active:border-b active:translate-y-[1px] transition-all text-lg">{run}</button>
          ))}
          <button onClick={() => setShowWideModal(true)} className="bg-[#fff9e6] py-3 rounded-lg font-black text-amber-800 border border-b-2 border-amber-200 text-sm">WD</button>
          <button onClick={() => setShowNoBallModal(true)} className="bg-[#fff1e6] py-3 rounded-lg font-black text-orange-800 border border-b-2 border-orange-200 text-sm">NB</button>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mt-1">
          <button disabled={isLocked} onClick={() => { setWicketType('CAUGHT'); setShowWicketModal(true); }} className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-black border-b-2 border-red-800 uppercase tracking-widest text-sm disabled:opacity-50">OUT</button>
          <button onClick={() => dispatch({ type: 'UNDO_LAST_BALL' })} disabled={state.undoStack.length === 0} className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-lg font-bold border-b-2 border-slate-300 disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-sm"><RotateCcw size={14} /> Undo</button>
          <button onClick={() => navigate(`/summary/${match.id}`)} className="bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-lg font-bold border-b-2 border-black text-sm">Scorecard</button>
      </div>

      {/* BATSMEN SELECTION MODAL */}
      {needsBatsmen && !isLocked && !isBatsmenDismissed && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setBatsmenDismissed(true)}>
            <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl animate-pop" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-black text-slate-900 mb-4">Select Batsmen</h3>
                <div className="space-y-4 mb-6">
                    {!inning.currentStrikerId && (
                        <select className="w-full p-3 border border-slate-200 rounded-lg font-bold bg-slate-50 text-sm" value={selectedStriker} onChange={(e) => setSelectedStriker(e.target.value)}>
                            <option value="">Choose Striker</option>
                            {battingTeam.players.filter(p => !inning.battingStats[p.id]?.isOut && p.id !== selectedNonStriker && p.id !== inning.currentNonStrikerId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    )}
                    {!inning.currentNonStrikerId && !inning.loneStrikerMode && (
                        <select className="w-full p-3 border border-slate-200 rounded-lg font-bold bg-slate-50 text-sm" value={selectedNonStriker} onChange={(e) => setSelectedNonStriker(e.target.value)}>
                            <option value="">Choose Non-Striker</option>
                            {battingTeam.players.filter(p => !inning.battingStats[p.id]?.isOut && p.id !== selectedStriker && p.id !== inning.currentStrikerId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    )}
                </div>
                <button disabled={(!inning.currentStrikerId && !selectedStriker) || (!inning.currentNonStrikerId && !selectedNonStriker && !inning.loneStrikerMode)} onClick={() => { dispatch({ type: 'SET_BATSMEN', payload: { strikerId: inning.currentStrikerId || selectedStriker, nonStrikerId: inning.currentNonStrikerId || selectedNonStriker } }); }} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold shadow hover:bg-emerald-700 text-sm">Start Batting</button>
            </div>
        </div>
      )}

      {/* BOWLER SELECTION MODAL */}
      {needsBowler && !isLocked && !isBowlerDismissed && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setBowlerDismissed(true)}>
            <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl animate-pop" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-black text-slate-900 mb-4">Select Bowler</h3>
                <select className="w-full p-3 border border-slate-200 rounded-lg font-bold bg-slate-50 mb-6 text-sm" value={selectedBowler} onChange={(e) => setSelectedBowler(e.target.value)}>
                    <option value="">Choose Bowler</option>
                    {bowlingTeam.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button disabled={!selectedBowler} onClick={() => { dispatch({ type: 'SET_BOWLER', payload: { bowlerId: selectedBowler } }); }} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow hover:bg-blue-700 text-sm">Confirm Bowler</button>
            </div>
        </div>
      )}

      {/* ABANDON/END MATCH MODAL */}
      {showEndMatchModal && (
          <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowEndMatchModal(false)}>
              <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl animate-pop text-center" onClick={e => e.stopPropagation()}>
                  <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3"><AlertTriangle size={24} /></div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">End Match?</h3>
                  <p className="text-slate-500 mb-6 text-xs">This action is permanent.</p>
                  
                  <div className="space-y-4 mb-6 text-left">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Reason</label>
                          <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-white font-bold text-sm" value={endReason} onChange={e => setEndReason(e.target.value)}>
                              <option>Rain</option><option>Bad Light</option><option>Manual Conclusion</option><option>Other</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type 'CANCEL'</label>
                          <input type="text" placeholder="CANCEL" className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-center text-sm" value={endConfirmText} onChange={e => setEndConfirmText(e.target.value)}/>
                      </div>
                  </div>

                  <button disabled={endConfirmText.toUpperCase() !== 'CANCEL'} onClick={handleAbandonMatch} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold disabled:opacity-30 shadow hover:bg-red-700 text-sm">End Match</button>
                  <button onClick={() => setShowEndMatchModal(false)} className="w-full py-2 text-slate-400 font-bold mt-2 text-xs hover:text-slate-600">Return</button>
              </div>
          </div>
      )}

      {/* WICKET MODAL */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowWicketModal(false)}>
            <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl animate-pop" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-slate-900 mb-4 uppercase tracking-wider text-center text-sm">Wicket Details</h3>
                <div className="space-y-3 mb-6">
                    <select className="w-full p-3 border border-slate-200 rounded-lg font-bold text-sm" value={wicketType} onChange={e => setWicketType(e.target.value as WicketType)}>
                        <option value="BOWLED">Bowled</option><option value="CAUGHT">Caught</option><option value="LBW">LBW</option><option value="RUN_OUT">Run Out</option><option value="STUMPED">Stumped</option>
                    </select>
                    <input type="text" placeholder="Fielder Name" className="w-full p-3 border border-slate-200 rounded-lg font-bold text-sm" value={fielderName} onChange={e => setFielderName(e.target.value)}/>
                </div>
                <button onClick={() => submitBall({ runs: 0, extras: 0, extraType: 'NONE', isWicket: true, wicketType, wicketPlayerId: wicketType === 'RUN_OUT' ? wicketPlayerId : inning.currentStrikerId, fielderName })} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold shadow uppercase tracking-wider text-sm">Confirm</button>
            </div>
        </div>
      )}

      {/* NO BALL & WIDE MODALS */}
      {showNoBallModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowNoBallModal(false)}>
            <div className="bg-white p-5 rounded-xl w-full max-w-xs shadow-2xl animate-pop" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-slate-900 mb-4 uppercase tracking-wider text-center text-xs">No Ball + Runs</h3>
                <div className="grid grid-cols-3 gap-2">
                    {[0,1,2,3,4,6].map(r => <button key={r} onClick={() => submitBall({ runs: r, extras: 1, extraType: 'NO_BALL', isWicket: false })} className="py-3 bg-slate-50 border border-slate-200 rounded-lg font-black text-sm hover:bg-slate-100">{r}</button>)}
                </div>
            </div>
        </div>
      )}

      {showWideModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowWideModal(false)}>
            <div className="bg-white p-5 rounded-xl w-full max-w-xs shadow-2xl animate-pop" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-slate-900 mb-4 uppercase tracking-wider text-center text-xs">Wide Extras</h3>
                <div className="grid grid-cols-3 gap-2">
                    {[1,2,3,4,5].map(r => <button key={r} onClick={() => submitBall({ runs: 0, extras: r, extraType: 'WIDE', isWicket: false })} className="py-3 bg-slate-50 border border-slate-200 rounded-lg font-black text-sm hover:bg-slate-100">{r}</button>)}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};