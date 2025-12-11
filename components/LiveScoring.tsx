
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScoring } from '../context/ScoringContext';
import { Match, WicketType } from '../types';
import * as GameLogic from '../services/gameLogic';
import { ArrowLeft, User, AlertTriangle, RotateCcw, TrendingUp, Target, Radio } from 'lucide-react';

export const LiveScoring = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useScoring();
  
  const match = state.matches.find(m => m.id === id);
  
  // --- HOOKS MUST BE AT TOP LEVEL (Before any return) ---
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<WicketType>('CAUGHT');
  
  const [showNoBallModal, setShowNoBallModal] = useState(false);
  const [noBallRuns, setNoBallRuns] = useState(0);

  const [showWideModal, setShowWideModal] = useState(false);
  const [wideRuns, setWideRuns] = useState(0);

  const [showAllOutModal, setShowAllOutModal] = useState(false);

  const [celebration, setCelebration] = useState<'FOUR' | 'SIX' | 'WICKET' | null>(null);

  const [selectedStriker, setSelectedStriker] = useState('');
  const [selectedNonStriker, setSelectedNonStriker] = useState('');
  const [selectedBowler, setSelectedBowler] = useState('');

  // Derived Data (Safe access)
  const inning = match ? match.innings[match.currentInningIndex] : undefined;
  const battingTeam = (match && inning) ? match.teams.find(t => t.id === inning.battingTeamId) : undefined;
  const bowlingTeam = (match && inning) ? match.teams.find(t => t.id === inning.bowlingTeamId) : undefined;

  // --- Effects ---

  // Celebration Timer
  useEffect(() => {
    if (celebration) {
      const timer = setTimeout(() => setCelebration(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [celebration]);

  // Watch for All Out Condition
  useEffect(() => {
     if (match && match.status === 'LIVE' && inning && battingTeam && !inning.isCompleted && !inning.loneStrikerMode) {
         // Check if wickets >= players - 1 
         const totalPlayers = battingTeam.players.length;
         if (inning.totalWickets >= totalPlayers - 1) {
             setShowAllOutModal(true);
         }
     }
  }, [match, inning, battingTeam]); // Dependencies


  // --- Early Returns (AFTER Hooks) ---
  
  if (!match) return <div className="p-8">Match not found</div>;
  
  if (match.status === 'COMPLETED') {
       return (
           <div className="p-8 text-center bg-gray-50 min-h-screen flex flex-col items-center justify-center">
               <h2 className="text-3xl font-bold mb-4 text-emerald-800">Match Completed</h2>
               <div className="bg-white p-6 rounded-xl shadow-lg mb-6 max-w-md w-full">
                  <p className="text-xl mb-2 font-semibold">
                      {match.winnerTeamId ? `${match.teams.find(t=>t.id===match.winnerTeamId)?.name} Won!` : 'Match Tied!'}
                  </p>
                  <p className="text-gray-500 text-sm">Thank you for scoring with CricScore Pro.</p>
               </div>
               <button onClick={() => navigate(`/summary/${match.id}`)} className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-emerald-700">View Full Scorecard</button>
           </div>
       );
  }

  // Safety check for derived data
  if (!inning || !battingTeam || !bowlingTeam) return <div className="p-8">Loading match data...</div>;

  // --- INNINGS BREAK / TRANSITION ---
  if (inning.isCompleted) {
      return (
          <div className="min-h-screen bg-emerald-900 flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="relative z-10 text-center space-y-6 max-w-lg w-full">
                  <h1 className="text-4xl font-bold animate-slide-up">Innings Break</h1>
                  <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm border border-white/20">
                      <h2 className="text-2xl font-semibold mb-2">{battingTeam.name}</h2>
                      <p className="text-5xl font-bold mb-4">{inning.totalRuns}/{inning.totalWickets}</p>
                      <p className="text-emerald-300">{GameLogic.getOversDisplay(inning.totalBalls)} Overs</p>
                  </div>
                  
                  {match.currentInningIndex === 0 ? (
                      <div className="space-y-4">
                          <p className="text-lg">Target for {bowlingTeam.name}: <span className="font-bold text-yellow-400">{inning.totalRuns + 1}</span></p>
                          <button 
                            onClick={() => dispatch({ type: 'START_NEXT_INNING' })}
                            className="w-full bg-yellow-500 hover:bg-yellow-400 text-emerald-900 font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-105"
                          >
                              Start 2nd Innings
                          </button>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <p className="text-xl font-bold text-yellow-400">Match Concluded</p>
                          <button 
                             onClick={() => navigate(`/summary/${match.id}`)}
                             className="w-full bg-white text-emerald-900 font-bold py-4 rounded-xl shadow-lg"
                          >
                              View Result
                          </button>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- SETUP PHASE: Select Batsmen/Bowler ---
  const needsBatsmen = !inning.currentStrikerId || (!inning.loneStrikerMode && !inning.currentNonStrikerId);
  const needsBowler = !inning.currentBowlerId;
  
  if ((needsBatsmen || needsBowler) && !showAllOutModal) {
      return (
          <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg mt-10 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                  <User className="text-emerald-600"/>
                  {needsBatsmen ? "Select Batsmen" : "Select Next Bowler"}
              </h3>
              
              {needsBatsmen && (
                  <div className="space-y-4 mb-6">
                      {!inning.currentStrikerId && (
                          <div>
                              <label className="block text-sm font-medium mb-1 text-gray-700">Striker</label>
                              <select 
                                className="w-full border border-gray-300 bg-white p-2 rounded focus:ring-2 focus:ring-emerald-500 text-gray-900"
                                value={selectedStriker}
                                onChange={(e) => setSelectedStriker(e.target.value)}
                              >
                                  <option value="">Select Striker</option>
                                  {battingTeam.players.filter(p => !inning.battingStats[p.id]?.isOut && p.id !== selectedNonStriker && p.id !== inning.currentNonStrikerId).map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                              </select>
                          </div>
                      )}
                      {!inning.currentNonStrikerId && !inning.loneStrikerMode && (
                          <div>
                              <label className="block text-sm font-medium mb-1 text-gray-700">Non-Striker</label>
                               <select 
                                className="w-full border border-gray-300 bg-white p-2 rounded focus:ring-2 focus:ring-emerald-500 text-gray-900"
                                value={selectedNonStriker}
                                onChange={(e) => setSelectedNonStriker(e.target.value)}
                              >
                                  <option value="">Select Non-Striker</option>
                                  {battingTeam.players.filter(p => !inning.battingStats[p.id]?.isOut && p.id !== selectedStriker && p.id !== inning.currentStrikerId).map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                              </select>
                          </div>
                      )}
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
                        className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold disabled:opacity-50 hover:bg-emerald-700 transition-colors"
                      >
                          Confirm Batsmen
                      </button>
                  </div>
              )}

              {(!needsBatsmen && needsBowler) && (
                  <div className="space-y-4">
                       <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700">Bowler</label>
                          <select 
                            className="w-full border border-gray-300 bg-white p-2 rounded focus:ring-2 focus:ring-emerald-500 text-gray-900"
                            value={selectedBowler}
                            onChange={(e) => setSelectedBowler(e.target.value)}
                          >
                              <option value="">Select Bowler</option>
                              {bowlingTeam.players.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                          </select>
                      </div>
                       <button 
                        disabled={!selectedBowler}
                        onClick={() => {
                            dispatch({ type: 'SET_BOWLER', payload: { bowlerId: selectedBowler } });
                            setSelectedBowler('');
                        }}
                        className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold disabled:opacity-50 hover:bg-emerald-700 transition-colors"
                      >
                          Start Over
                      </button>
                  </div>
              )}
          </div>
      );
  }

  // --- Scoring Helpers ---
  const triggerCelebration = (type: 'FOUR' | 'SIX' | 'WICKET') => {
      setCelebration(type);
  };

  const submitBall = (payload: any) => {
      dispatch({ type: 'RECORD_BALL', payload });
      setShowWicketModal(false);
      setShowNoBallModal(false);
      setShowWideModal(false);
      
      if (payload.isWicket) triggerCelebration('WICKET');
      else if (payload.runs === 4 && payload.extraType === 'NONE') triggerCelebration('FOUR');
      else if (payload.runs === 6 && payload.extraType === 'NONE') triggerCelebration('SIX');
  };

  const handleNoBallClick = () => {
      setNoBallRuns(0);
      setShowNoBallModal(true);
  };

  const handleWideClick = () => {
      setWideRuns(0);
      setShowWideModal(true);
  };

  const handleNormalRun = (runs: number) => {
      submitBall({
          runs,
          extras: 0,
          extraType: 'NONE',
          isWicket: false
      });
  };

  const handleUndo = () => {
      if (state.undoStack.length > 0) {
          dispatch({ type: 'UNDO_LAST_BALL' });
      }
  };

  const handleOpenBroadcast = () => {
      window.open(`#/broadcast/${match.id}`, '_blank');
  };

  // Safe Accessors
  const striker = battingTeam.players.find(p => p.id === inning.currentStrikerId);
  const nonStriker = inning.currentNonStrikerId ? battingTeam.players.find(p => p.id === inning.currentNonStrikerId) : null;
  const bowler = bowlingTeam.players.find(p => p.id === inning.currentBowlerId);
  
  const strikerStats = striker ? inning.battingStats[striker.id] : { runs: 0, balls: 0 };
  const nonStrikerStats = nonStriker ? inning.battingStats[nonStriker.id] : { runs: 0, balls: 0 };
  const bowlerStats = bowler ? inning.bowlingStats[bowler.id] : { wickets: 0, runsConceded: 0, ballsBowled: 0 };

  // Insights Calc
  const projected = GameLogic.calculateProjectedScore(inning.totalRuns, inning.totalBalls, match.oversPerInning);
  const winProb = match.currentInningIndex === 1 
      ? GameLogic.calculateWinProbability(match.innings[0].totalRuns + 1, inning.totalRuns, inning.totalBalls, inning.totalWickets, match.oversPerInning) 
      : null;

  return (
    <div className="max-w-4xl mx-auto space-y-3 pb-24 relative">
      
      {/* --- CELEBRATION OVERLAYS --- */}
      {celebration === 'FOUR' && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
              <div className="bg-blue-600 text-white text-6xl font-black px-12 py-6 rounded-xl shadow-2xl animate-pop rotate-[-5deg]">
                  4 RUNS!
              </div>
          </div>
      )}
      {celebration === 'SIX' && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
               <div className="absolute inset-0 bg-black/30"></div>
               <div className="bg-purple-600 text-white text-8xl font-black px-16 py-10 rounded-2xl shadow-2xl animate-pop border-4 border-yellow-400">
                  SIX!
              </div>
          </div>
      )}
      {celebration === 'WICKET' && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center flex-col gap-4">
              <div className="absolute inset-0 bg-red-600/20"></div>
              <div className="text-9xl animate-bounce">🦆</div>
              <div className="bg-red-600 text-white text-6xl font-black px-12 py-6 rounded-xl shadow-2xl animate-pop">
                  WICKET!
              </div>
          </div>
      )}


      {/* Header Info - Compact on mobile */}
      <div className="bg-emerald-900 text-white p-3 md:p-4 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-1">
            <button onClick={() => navigate('/')} className="text-emerald-300 hover:text-white flex items-center gap-1">
                <ArrowLeft size={18}/> <span className="text-xs">Back</span>
            </button>
            <div className="flex items-center gap-2">
                <h2 className="text-xs md:text-sm font-medium opacity-80 truncate max-w-[150px]">{match.name}</h2>
                <button 
                    onClick={handleOpenBroadcast}
                    title="Open Broadcast View"
                    className="p-1 bg-emerald-800 rounded hover:bg-emerald-700 transition-colors"
                >
                    <Radio size={14} className="text-yellow-400" />
                </button>
            </div>
            <div className="w-5"></div>
        </div>
        <div className="flex justify-between items-end">
             <div>
                 <div className="text-3xl md:text-4xl font-bold leading-none mb-1">
                     {inning.totalRuns}/{inning.totalWickets}
                 </div>
                 <div className="text-emerald-300 text-xs md:text-sm">
                     Over {GameLogic.getOversDisplay(inning.totalBalls)} <span className="mx-1">•</span> CRR: {GameLogic.calculateRunRate(inning.totalRuns, inning.totalBalls)}
                 </div>
             </div>
             <div className="text-right">
                 <div className="text-sm md:text-lg font-bold">{bowlingTeam.shortName}</div>
                 <div className="text-[10px] md:text-xs text-emerald-300">Opted to {match.tossDecision === 'BOWL' ? 'Bowl' : 'Bat'}</div>
             </div>
        </div>

        {/* INSIGHTS PANEL */}
        <div className="mt-4 pt-3 border-t border-emerald-800">
            {match.currentInningIndex === 0 ? (
                <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-emerald-300 flex items-center gap-1"><TrendingUp size={14}/> Projected Score:</span>
                    <div className="flex gap-3 font-mono font-bold">
                        <span className="text-gray-400">{projected.minusOne}</span>
                        <span className="text-white text-lg">{projected.current}</span>
                        <span className="text-gray-400">{projected.plusOne}</span>
                    </div>
                </div>
            ) : (
                <div>
                     <div className="flex justify-between text-xs text-emerald-300 mb-1">
                         <span className="flex items-center gap-1"><Target size={14}/> Target: {match.innings[0].totalRuns + 1}</span>
                         <span>Win Probability: {winProb}%</span>
                     </div>
                     <div className="h-2 bg-emerald-950 rounded-full overflow-hidden">
                         <div 
                            className="h-full bg-gradient-to-r from-yellow-400 to-green-500 transition-all duration-1000" 
                            style={{ width: `${winProb}%` }}
                        ></div>
                     </div>
                </div>
            )}
        </div>
      </div>

      {/* Players Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         {/* Batsmen */}
         <div className="p-3 md:p-4 grid grid-cols-2 divide-x divide-gray-100 text-sm md:text-base">
             <div className="pr-2 md:pr-4">
                 {striker ? (
                     <div className="flex justify-between items-center mb-1">
                         <span className="font-bold text-gray-800 flex items-center gap-1 truncate">
                             {striker.name} <span className="text-emerald-600 text-xs">★</span>
                         </span>
                         <span className="font-mono font-bold whitespace-nowrap">{strikerStats?.runs} <span className="text-gray-400 text-xs">({strikerStats?.balls})</span></span>
                     </div>
                 ) : (
                     <div className="text-gray-400 italic">Select Striker</div>
                 )}
             </div>
             <div className="pl-2 md:pl-4 opacity-70">
                 {nonStriker ? (
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-700 truncate">{nonStriker.name}</span>
                        <span className="font-mono font-bold whitespace-nowrap">{nonStrikerStats?.runs} <span className="text-gray-400 text-xs">({nonStrikerStats?.balls})</span></span>
                    </div>
                 ) : (
                     <div className="text-gray-400 italic text-xs md:text-sm">{inning.loneStrikerMode ? 'Lone Striker' : 'Select Non-Striker'}</div>
                 )}
             </div>
         </div>
         {/* Bowler */}
         <div className="bg-gray-50 px-3 md:px-4 py-2 border-t border-gray-100 flex justify-between items-center text-sm md:text-base">
             <div>
                 <div className="text-[10px] text-gray-500 uppercase font-semibold">Bowler</div>
                 <div className="font-medium text-gray-800">{bowler ? bowler.name : 'Select Bowler'}</div>
             </div>
             <div className="text-right">
                  {bowler && (
                      <div className="font-mono text-sm">
                          <span className="font-bold">{bowlerStats?.wickets}</span>-{bowlerStats?.runsConceded} <span className="text-gray-400 text-xs">({GameLogic.getOversDisplay(bowlerStats?.ballsBowled || 0)})</span>
                      </div>
                  )}
             </div>
         </div>
      </div>

      {/* This Over & Recent History */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
          <span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">This Over:</span>
          {inning.thisOver.length > 0 ? inning.thisOver.map((ball) => (
              <div key={ball.id} className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border relative
                ${ball.isWicket ? 'bg-red-500 text-white border-red-600' : 
                  ball.runsScored === 4 ? 'bg-blue-500 text-white border-blue-600' :
                  ball.runsScored === 6 ? 'bg-purple-500 text-white border-purple-600' :
                  'bg-white text-gray-700 border-gray-200'}
              `}>
                  {ball.isWicket ? 'W' : ball.runsScored + ball.extras}
                  {ball.extraType !== 'NONE' && <span className="absolute -top-1 -right-1 text-[8px] bg-yellow-400 text-black px-1 rounded-full">{ball.extraType[0]}</span>}
              </div>
          )) : (
              <span className="text-xs text-gray-400 italic">New Over</span>
          )}
          
          {/* Last 3 Balls Indicator for Undo context */}
          <div className="flex-1"></div>
          {state.undoStack.length > 0 && (
              <div className="text-[10px] text-gray-400 flex items-center gap-1">
                  <span>Last 3:</span>
                  {inning.events.slice(-3).map(e => (
                      <span key={e.id} className="bg-gray-100 px-1 rounded">{e.isWicket ? 'W' : e.runsScored + e.extras}</span>
                  ))}
              </div>
          )}
      </div>

      {/* Controls / Keypad */}
      {/* Disable controls if setup needed or modal open */}
      <div className={`grid grid-cols-4 gap-2 md:gap-3 ${showAllOutModal ? 'opacity-50 pointer-events-none' : ''}`}>
          {[0, 1, 2, 3, 4, 6].map(run => (
              <button 
                key={run}
                onClick={() => handleNormalRun(run)}
                disabled={!striker || !bowler}
                className={`
                    py-3 md:py-4 rounded-xl font-bold text-lg md:text-xl shadow-sm border-b-4 active:border-b-0 active:translate-y-1 transition-all touch-manipulation
                    ${run === 4 ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                      run === 6 ? 'bg-purple-100 text-purple-800 border-purple-200' : 
                      'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}
                `}
              >
                  {run}
              </button>
          ))}
          <button onClick={handleWideClick} disabled={!striker || !bowler} className="bg-yellow-100 text-yellow-800 border-yellow-200 py-3 md:py-4 rounded-xl font-bold border-b-4 active:border-b-0 active:translate-y-1 touch-manipulation">wd</button>
          <button onClick={handleNoBallClick} disabled={!striker || !bowler} className="bg-orange-100 text-orange-800 border-orange-200 py-3 md:py-4 rounded-xl font-bold border-b-4 active:border-b-0 active:translate-y-1 touch-manipulation">nb</button>
      </div>
      
      <div className={`grid grid-cols-3 gap-2 md:gap-3 mt-2 ${showAllOutModal ? 'opacity-50 pointer-events-none' : ''}`}>
          <button onClick={() => setShowWicketModal(true)} disabled={!striker || !bowler} className="bg-red-500 text-white border-red-700 py-3 md:py-4 rounded-xl font-bold border-b-4 active:border-b-0 active:translate-y-1 touch-manipulation">OUT</button>
          
          <button 
            onClick={handleUndo} 
            disabled={state.undoStack.length === 0}
            className={`
                flex flex-col items-center justify-center py-3 md:py-4 rounded-xl font-bold border-b-4 active:border-b-0 active:translate-y-1 touch-manipulation
                ${state.undoStack.length > 0 ? 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300' : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'}
            `}
          >
             <RotateCcw size={20} />
             <span className="text-xs">Undo</span>
          </button>

          <button onClick={() => navigate(`/summary/${match.id}`)} className="bg-gray-700 text-white border-gray-900 py-3 md:py-4 rounded-xl font-bold border-b-4 active:border-b-0 active:translate-y-1 touch-manipulation text-sm">Scorecard</button>
      </div>

      {/* --- MODALS --- */}

      {/* No Ball Modal */}
      {showNoBallModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in">
                 <div className="bg-orange-500 text-white p-4 font-bold text-lg">Runs taken on No-Ball?</div>
                 <div className="p-6">
                     <p className="text-sm text-gray-600 mb-4">Select runs scored off the bat. (1 NB extra is added automatically)</p>
                     <div className="grid grid-cols-4 gap-2 mb-4">
                         {[0,1,2,3,4,6].map(r => (
                             <button 
                                key={r}
                                onClick={() => setNoBallRuns(r)}
                                className={`py-2 rounded-lg font-bold border ${noBallRuns === r ? 'bg-orange-500 text-white border-orange-600' : 'bg-gray-50 text-gray-700'}`}
                             >
                                 {r}
                             </button>
                         ))}
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => setShowNoBallModal(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button 
                            onClick={() => submitBall({ runs: noBallRuns, extras: 1, extraType: 'NO_BALL', isWicket: false })}
                            className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-bold"
                        >
                            Confirm ({noBallRuns} + 1)
                        </button>
                     </div>
                 </div>
             </div>
         </div>
      )}

      {/* Wide Modal */}
      {showWideModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in">
                 <div className="bg-yellow-500 text-white p-4 font-bold text-lg">Runs on Wide Ball?</div>
                 <div className="p-6">
                     <p className="text-sm text-gray-600 mb-4">Select runs ran by batsmen. (1 Wide extra is added automatically)</p>
                     <div className="grid grid-cols-5 gap-2 mb-6">
                         {[0,1,2,3,4].map(r => (
                             <button 
                                key={r}
                                onClick={() => setWideRuns(r)}
                                className={`py-3 rounded-lg font-bold border ${wideRuns === r ? 'bg-yellow-500 text-white border-yellow-600 shadow-md scale-105' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'} transition-all`}
                             >
                                 {r}
                             </button>
                         ))}
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => setShowWideModal(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                        <button 
                            onClick={() => submitBall({ runs: 0, extras: 1 + wideRuns, extraType: 'WIDE', isWicket: false })}
                            className="flex-1 bg-yellow-500 text-white py-3 rounded-lg font-bold shadow hover:bg-yellow-600 transition-colors"
                        >
                            Confirm ({wideRuns} + 1 wd)
                        </button>
                     </div>
                 </div>
             </div>
         </div>
      )}

      {/* All Out Modal */}
      {showAllOutModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in border-t-4 border-red-600">
                  <div className="p-6 text-center">
                      <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">All Wickets Fallen</h3>
                      <p className="text-gray-600 mb-6">
                          All wickets have fallen and there is no striker available. Do you want to allow one striker to continue, or end the innings/match?
                      </p>
                      
                      <div className="flex flex-col gap-3">
                          <button 
                            onClick={() => {
                                setShowAllOutModal(false);
                                dispatch({ type: 'ALLOW_LONE_STRIKER' });
                            }}
                            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700"
                          >
                              Let one striker continue
                          </button>
                          <button 
                            onClick={() => {
                                setShowAllOutModal(false);
                                dispatch({ type: 'DECLARE_INNING_END' });
                            }}
                            className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-900"
                          >
                              End innings/match
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Wicket Modal */}
      {showWicketModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="bg-red-600 text-white p-4 font-bold text-lg flex justify-between">
                      <span>Wicket Details</span>
                      <button onClick={() => setShowWicketModal(false)}><AlertTriangle size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <label className="block text-sm font-medium text-gray-700">How did they get out?</label>
                      <select 
                        value={wicketType}
                        onChange={(e) => setWicketType(e.target.value as WicketType)}
                        className="w-full border p-2 rounded"
                      >
                          <option value="BOWLED">Bowled</option>
                          <option value="CAUGHT">Caught</option>
                          <option value="LBW">LBW</option>
                          <option value="RUN_OUT">Run Out</option>
                          <option value="STUMPED">Stumped</option>
                          <option value="HIT_WICKET">Hit Wicket</option>
                      </select>
                      
                      <button 
                        onClick={() => submitBall({ runs: 0, extras: 0, extraType: 'NONE', isWicket: true, wicketType })}
                        className="w-full bg-red-600 text-white py-3 rounded-lg font-bold"
                      >
                          Confirm Wicket
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
