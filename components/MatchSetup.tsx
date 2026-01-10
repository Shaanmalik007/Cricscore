import React, { useState, useEffect } from 'react';
import { useScoring } from '../context/ScoringContext';
import { useNavigate } from 'react-router-dom';
import { Team, Match, Inning } from '../types';
import { Swords, Timer, Coins, Trophy, Globe, MapPin, Share2, Type } from 'lucide-react';
import { auth } from '../lib/firebase';

export const MatchSetup = () => {
  const { state, dispatch } = useScoring();
  const navigate = useNavigate();

  const [matchScope, setMatchScope] = useState<'FRIENDLY' | 'TOURNAMENT'>('FRIENDLY');
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const [customMatchName, setCustomMatchName] = useState('');
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [matchType, setMatchType] = useState<'T20' | 'ODI' | 'CUSTOM'>('T20');
  const [overs, setOvers] = useState(20);
  
  const [isPublic, setIsPublic] = useState(true);
  
  const [tossStep, setTossStep] = useState<'SETUP' | 'FLIPPING' | 'DECISION' | 'COMPLETED'>('SETUP');
  const [tossCallerId, setTossCallerId] = useState('');
  const [tossCall, setTossCall] = useState<'HEADS' | 'TAILS'>('HEADS');
  const [tossResult, setTossResult] = useState<'HEADS' | 'TAILS' | null>(null);
  const [coinRotation, setCoinRotation] = useState(0);
  const [tossWinnerId, setTossWinnerId] = useState('');
  const [tossDecision, setTossDecision] = useState<'BAT' | 'BOWL' | null>(null);

  const availableTeams = React.useMemo(() => {
    if (matchScope === 'FRIENDLY') return state.teams || [];
    if (!selectedTournamentId) return [];
    
    const tourney = state.tournaments.find(t => t.id === selectedTournamentId);
    if (!tourney) return [];

    let filteredTeams = tourney.teams || [];
    if (selectedGroupId) {
        filteredTeams = filteredTeams.filter(t => t.groupId === selectedGroupId);
    }
    
    return filteredTeams
        .map(tt => state.teams.find(t => t.id === tt.teamId))
        .filter((t): t is Team => !!t);
  }, [matchScope, selectedTournamentId, selectedGroupId, state.teams, state.tournaments]);

  // Handle initial auto-selection robustly
  useEffect(() => {
    if (availableTeams.length >= 2 && !teamAId && !teamBId) {
        setTeamAId(availableTeams[0].id);
        setTeamBId(availableTeams[1].id);
        setTossCallerId(availableTeams[0].id);
    }
  }, [availableTeams]);

  useEffect(() => {
    if (matchScope === 'TOURNAMENT' && selectedTournamentId) {
        const tourney = state.tournaments.find(t => t.id === selectedTournamentId);
        if (tourney) {
            setMatchType(tourney.format === 'T10' ? 'CUSTOM' : tourney.format as any);
            setOvers(tourney.overs);
        }
    }
  }, [matchScope, selectedTournamentId, state.tournaments]);

  const flipCoin = () => {
    if (!tossCallerId) return;
    
    setTossStep('FLIPPING');
    const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
    const isHeads = result === 'HEADS';
    
    const baseSpins = 5 + Math.floor(Math.random() * 5);
    const newRotation = coinRotation + (baseSpins * 360) + (isHeads ? 0 : 180);
    setCoinRotation(newRotation);

    setTimeout(() => {
        setTossResult(result);
        const isWin = result === tossCall;
        const winner = isWin ? tossCallerId : (tossCallerId === teamAId ? teamBId : teamAId);
        setTossWinnerId(winner);
        setTossStep('DECISION');
    }, 2500); 
  };

  const handleTossDecision = (decision: 'BAT' | 'BOWL') => {
      setTossDecision(decision);
      setTossStep('COMPLETED');
  };

  const handleStartMatch = () => {
    if (!teamAId || !teamBId || teamAId === teamBId) {
      alert("Please select two different teams.");
      return;
    }
    if (!tossWinnerId || !tossDecision) {
        alert("Please complete the toss procedure");
        return;
    }

    const teamA = state.teams.find(t => t.id === teamAId)!;
    const teamB = state.teams.find(t => t.id === teamBId)!;

    const generateGameId = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    const placeholderInning: Inning = {
        battingTeamId: '', bowlingTeamId: '', totalRuns: 0, totalWickets: 0, oversBowled: 0, totalBalls: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
        thisOver: [], events: [], battingStats: {}, bowlingStats: {},
        currentStrikerId: null, currentNonStrikerId: null, currentBowlerId: null,
        isCompleted: false, loneStrikerMode: false
    };

    const newMatch: Match = {
      id: Date.now().toString(),
      gameId: isPublic ? generateGameId() : undefined,
      isPublic,
      createdBy: auth.currentUser?.uid,
      cheers: { clap: 0, fire: 0, celebrate: 0, wow: 0 },
      name: customMatchName.trim() || `${teamA.shortName} vs ${teamB.shortName}`,
      date: new Date().toISOString(),
      type: matchType === 'CUSTOM' ? 'CUSTOM' : matchType,
      oversPerInning: overs,
      teams: [teamA, teamB],
      tossWinnerId,
      tossDecision,
      tossCallerId,
      tossCall,
      tossResult: tossResult!,
      status: 'SCHEDULED',
      currentInningIndex: 0,
      innings: [placeholderInning, placeholderInning],
      tournamentId: matchScope === 'TOURNAMENT' ? selectedTournamentId : undefined,
      groupId: matchScope === 'TOURNAMENT' ? selectedGroupId : undefined
    };

    dispatch({ type: 'CREATE_MATCH', payload: newMatch });
    dispatch({ 
        type: 'START_MATCH', 
        payload: { 
            matchId: newMatch.id, 
            tossWinnerId, 
            tossDecision 
        } 
    });

    navigate(`/match/${newMatch.id}`);
  };

  const teamA = state.teams.find(t => t.id === teamAId);
  const teamB = state.teams.find(t => t.id === teamBId);
  const tossWinner = state.teams.find(t => t.id === tossWinnerId);

  return (
    <div className="max-w-xl mx-auto glass-panel rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden text-sm">
      <style>{`
        .coin-container { perspective: 800px; }
        .coin { width: 80px; height: 80px; position: relative; transform-style: preserve-3d; transition: transform 2.5s cubic-bezier(0.25, 1, 0.5, 1); }
        .coin-face { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem; border: 4px solid #d97706; box-shadow: inset 0 0 10px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.5); }
        .face-heads { background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%); color: #78350f; transform: rotateY(0deg); }
        .face-tails { background: linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%); color: #374151; transform: rotateY(180deg); }
      `}</style>

      <div className="bg-white/5 border-b border-white/10 p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white"><Swords size={20} className="text-emerald-400"/> Start New Match</h2>
      </div>
      
      <div className="p-6 space-y-6">
        
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex justify-between items-center">
             <div className="flex items-center gap-2 text-blue-300 font-bold text-xs uppercase tracking-wide">
                 <Globe size={16} /> Public Broadcast
             </div>
             <label className="relative inline-flex items-center cursor-pointer scale-90">
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="sr-only peer"/>
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
             </label>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl">
            <button onClick={() => setMatchScope('FRIENDLY')} className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition-all ${matchScope === 'FRIENDLY' ? 'bg-white text-slate-900 shadow' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>Friendly</button>
            <button onClick={() => setMatchScope('TOURNAMENT')} className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition-all ${matchScope === 'TOURNAMENT' ? 'bg-white text-slate-900 shadow' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>Tournament</button>
        </div>

        <div>
            <label className="block text-xs font-bold text-white/40 mb-2 flex items-center gap-1 uppercase tracking-wider"><Type size={12}/> Match Name (Optional)</label>
            <input 
                type="text" 
                value={customMatchName}
                onChange={(e) => setCustomMatchName(e.target.value)}
                placeholder="e.g. Sunday League Final"
                className="w-full bg-white/5 text-white border border-white/10 rounded-xl p-3 focus:ring-1 focus:ring-emerald-500 outline-none text-sm placeholder-white/20"
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-white/40 mb-2 uppercase tracking-wider">Home Team</label>
                <select 
                    className="w-full border border-white/10 p-3 rounded-xl bg-white/5 text-white focus:ring-1 focus:ring-emerald-500 outline-none font-medium text-sm appearance-none" 
                    value={teamAId} 
                    onChange={(e) => setTeamAId(e.target.value)}
                >
                    {availableTeams.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>)}
                    {availableTeams.length === 0 && <option value="" className="bg-slate-900">No teams</option>}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-white/40 mb-2 uppercase tracking-wider">Away Team</label>
                <select 
                    className="w-full border border-white/10 p-3 rounded-xl bg-white/5 text-white focus:ring-1 focus:ring-emerald-500 outline-none font-medium text-sm appearance-none" 
                    value={teamBId} 
                    onChange={(e) => setTeamBId(e.target.value)}
                >
                    {availableTeams.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>)}
                </select>
            </div>
        </div>

        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            {matchScope === 'TOURNAMENT' && <div className="absolute inset-0 bg-slate-900/50 cursor-not-allowed z-10" title="Settings locked by tournament"></div>}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Format</label>
                    <div className="flex flex-wrap gap-1">
                        {['T20', 'ODI', 'CUSTOM'].map(t => (
                            <button key={t} onClick={() => { if(matchScope === 'FRIENDLY') setMatchType(t as any); if(t === 'T20') setOvers(20); else if(t === 'ODI') setOvers(50); }} className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex-1 ${matchType === t ? 'bg-emerald-500 text-white' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'}`}>{t}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Overs</label>
                    <input type="number" value={overs} onChange={(e) => setOvers(parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 text-white p-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none font-bold text-sm"/>
                </div>
            </div>
        </div>

        {(teamAId && teamBId && teamAId !== teamBId) && (
             <div className="bg-amber-500/10 rounded-xl border border-amber-500/20 overflow-hidden relative">
                 <div className="bg-amber-500/20 p-3 border-b border-amber-500/20 flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider"><Coins size={14} /> Coin Toss</div>
                 <div className="p-6">
                    {tossStep === 'SETUP' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-amber-200/60 uppercase mb-2">Caller</label>
                                    <select value={tossCallerId} onChange={(e) => setTossCallerId(e.target.value)} className="w-full p-2.5 rounded-lg border border-amber-500/30 bg-slate-900 text-amber-100 outline-none font-bold text-xs appearance-none">
                                        <option value={teamAId}>{teamA?.name}</option>
                                        <option value={teamBId}>{teamB?.name}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-amber-200/60 uppercase mb-2">Call</label>
                                    <div className="flex bg-slate-900 rounded-lg border border-amber-500/30 overflow-hidden">
                                        <button onClick={() => setTossCall('HEADS')} className={`flex-1 py-2.5 text-xs font-bold transition-colors ${tossCall === 'HEADS' ? 'bg-amber-500 text-slate-900' : 'text-amber-100/60 hover:bg-amber-500/10'}`}>Heads</button>
                                        <button onClick={() => setTossCall('TAILS')} className={`flex-1 py-2.5 text-xs font-bold transition-colors ${tossCall === 'TAILS' ? 'bg-amber-500 text-slate-900' : 'text-amber-100/60 hover:bg-amber-500/10'}`}>Tails</button>
                                    </div>
                                </div>
                            </div>
                            <button onClick={flipCoin} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 rounded-xl font-black shadow-lg shadow-amber-900/40 text-xs uppercase tracking-wider">Flip Coin</button>
                        </div>
                    )}

                    {(tossStep === 'FLIPPING' || tossStep === 'DECISION') && (
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="coin-container mb-6"><div className="coin" style={{ transform: `rotateY(${coinRotation}deg)` }}><div className="coin-face face-heads">H</div><div className="coin-face face-tails">T</div></div></div>
                            {tossStep === 'FLIPPING' && <p className="text-amber-400 font-bold text-xs animate-pulse">Flipping...</p>}
                            {tossStep === 'DECISION' && tossWinner && (
                                <div className="text-center animate-pop w-full">
                                    <p className="text-white/60 text-xs mb-2"><span className="font-bold text-white">{state.teams?.find(t=>t.id===tossCallerId)?.name}</span> called <span className="font-bold text-amber-400">{tossCall}</span></p>
                                    <div className="text-xl font-bold text-white mb-6 flex items-center justify-center gap-2"><Trophy size={20} className="text-yellow-400" /> {tossWinner.name} Won!</div>
                                    <div className="flex gap-3 justify-center">
                                        <button onClick={() => handleTossDecision('BAT')} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 shadow-lg text-xs uppercase">Bat</button>
                                        <button onClick={() => handleTossDecision('BOWL')} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 shadow-lg text-xs uppercase">Bowl</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {tossStep === 'COMPLETED' && tossWinner && tossDecision && (
                         <div className="text-center py-4">
                             <h3 className="text-lg font-bold text-white mb-1">{tossWinner.name}</h3>
                             <p className="text-white/60 text-xs">Won toss & chose to <span className="font-bold text-emerald-400 uppercase">{tossDecision}</span></p>
                             <button onClick={() => setTossStep('SETUP')} className="text-[10px] text-amber-400/80 underline mt-4 hover:text-amber-400">Redo Toss</button>
                         </div>
                    )}
                 </div>
             </div>
        )}

        <button 
            onClick={handleStartMatch}
            disabled={tossStep !== 'COMPLETED'}
            className={`w-full py-4 rounded-xl text-sm font-bold shadow-lg transition-all uppercase tracking-wider ${tossStep === 'COMPLETED' ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/40' : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'}`}
        >
            Start Match
        </button>
      </div>
    </div>
  );
};