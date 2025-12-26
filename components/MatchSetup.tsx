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
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow border border-gray-200 overflow-hidden text-sm">
      <style>{`
        .coin-container { perspective: 800px; }
        .coin { width: 80px; height: 80px; position: relative; transform-style: preserve-3d; transition: transform 2.5s cubic-bezier(0.25, 1, 0.5, 1); }
        .coin-face { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem; border: 4px solid #d97706; box-shadow: inset 0 0 10px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.2); }
        .face-heads { background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%); color: #78350f; transform: rotateY(0deg); }
        .face-tails { background: linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%); color: #374151; transform: rotateY(180deg); }
      `}</style>

      <div className="bg-[#064e3b] text-white p-4">
        <h2 className="text-lg font-bold flex items-center gap-2"><Swords size={18}/> Start New Match</h2>
      </div>
      
      <div className="p-4 space-y-4">
        
        <div className="bg-blue-50 border border-blue-200 rounded p-3 flex justify-between items-center">
             <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                 <Globe size={14} /> Public Spectator Mode
             </div>
             <label className="relative inline-flex items-center cursor-pointer scale-90">
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="sr-only peer"/>
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
             </label>
        </div>

        <div className="flex bg-gray-100 p-1 rounded">
            <button onClick={() => setMatchScope('FRIENDLY')} className={`flex-1 py-1.5 rounded font-bold text-xs transition-all ${matchScope === 'FRIENDLY' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Friendly</button>
            <button onClick={() => setMatchScope('TOURNAMENT')} className={`flex-1 py-1.5 rounded font-bold text-xs transition-all ${matchScope === 'TOURNAMENT' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Tournament</button>
        </div>

        <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Type size={12}/> Match Name (Optional)</label>
            <input 
                type="text" 
                value={customMatchName}
                onChange={(e) => setCustomMatchName(e.target.value)}
                placeholder="e.g. Sunday League Final"
                className="w-full bg-white text-gray-900 border border-gray-300 rounded p-2 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Home Team</label>
                <select 
                    className="w-full border border-gray-300 p-2 rounded bg-white text-gray-900 focus:ring-1 focus:ring-emerald-500 outline-none font-medium text-sm" 
                    value={teamAId} 
                    onChange={(e) => setTeamAId(e.target.value)}
                >
                    {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    {availableTeams.length === 0 && <option value="">No teams</option>}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Away Team</label>
                <select 
                    className="w-full border border-gray-300 p-2 rounded bg-white text-gray-900 focus:ring-1 focus:ring-emerald-500 outline-none font-medium text-sm" 
                    value={teamBId} 
                    onChange={(e) => setTeamBId(e.target.value)}
                >
                    {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
        </div>

        <div className="bg-gray-50 p-3 rounded border border-gray-200">
            {matchScope === 'TOURNAMENT' && <div className="absolute inset-0 bg-gray-100/50 cursor-not-allowed z-10" title="Settings locked by tournament"></div>}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Format</label>
                    <div className="flex flex-wrap gap-1">
                        {['T20', 'ODI', 'CUSTOM'].map(t => (
                            <button key={t} onClick={() => { if(matchScope === 'FRIENDLY') setMatchType(t as any); if(t === 'T20') setOvers(20); else if(t === 'ODI') setOvers(50); }} className={`px-2 py-1 rounded text-[10px] font-bold transition-colors flex-1 ${matchType === t ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>{t}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Overs</label>
                    <input type="number" value={overs} onChange={(e) => setOvers(parseInt(e.target.value))} className="w-full bg-white border border-gray-300 text-gray-900 p-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-bold text-sm"/>
                </div>
            </div>
        </div>

        {(teamAId && teamBId && teamAId !== teamBId) && (
             <div className="bg-amber-50 rounded border border-amber-200 overflow-hidden relative">
                 <div className="bg-amber-100/50 p-2 border-b border-amber-200 flex items-center gap-2 text-amber-900 font-bold text-xs"><Coins size={14} /> Toss</div>
                 <div className="p-4">
                    {tossStep === 'SETUP' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1">Caller</label>
                                    <select value={tossCallerId} onChange={(e) => setTossCallerId(e.target.value)} className="w-full p-1.5 rounded border border-amber-300 bg-white text-gray-900 outline-none font-bold text-xs">
                                        <option value={teamAId}>{teamA?.name}</option>
                                        <option value={teamBId}>{teamB?.name}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1">Call</label>
                                    <div className="flex bg-white rounded border border-amber-300 overflow-hidden">
                                        <button onClick={() => setTossCall('HEADS')} className={`flex-1 py-1.5 text-xs font-bold transition-colors ${tossCall === 'HEADS' ? 'bg-amber-400 text-white' : 'text-gray-600 hover:bg-amber-50'}`}>Heads</button>
                                        <button onClick={() => setTossCall('TAILS')} className={`flex-1 py-1.5 text-xs font-bold transition-colors ${tossCall === 'TAILS' ? 'bg-amber-400 text-white' : 'text-gray-600 hover:bg-amber-50'}`}>Tails</button>
                                    </div>
                                </div>
                            </div>
                            <button onClick={flipCoin} className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold shadow-sm text-xs">Flip Coin</button>
                        </div>
                    )}

                    {(tossStep === 'FLIPPING' || tossStep === 'DECISION') && (
                        <div className="flex flex-col items-center justify-center py-2">
                            <div className="coin-container mb-4"><div className="coin" style={{ transform: `rotateY(${coinRotation}deg)` }}><div className="coin-face face-heads">H</div><div className="coin-face face-tails">T</div></div></div>
                            {tossStep === 'FLIPPING' && <p className="text-amber-800 font-bold text-xs">Flipping...</p>}
                            {tossStep === 'DECISION' && tossWinner && (
                                <div className="text-center animate-pop">
                                    <p className="text-gray-600 text-xs mb-1"><span className="font-bold text-gray-900">{state.teams?.find(t=>t.id===tossCallerId)?.name}</span> called <span className="font-bold">{tossCall}</span></p>
                                    <div className="text-lg font-bold text-amber-900 mb-3 flex items-center justify-center gap-1"><Trophy size={16} className="text-amber-500" />{tossWinner.name} Won!</div>
                                    <div className="flex gap-2 justify-center">
                                        <button onClick={() => handleTossDecision('BAT')} className="px-4 py-1.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 shadow text-xs">Bat</button>
                                        <button onClick={() => handleTossDecision('BOWL')} className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow text-xs">Bowl</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {tossStep === 'COMPLETED' && tossWinner && tossDecision && (
                         <div className="text-center py-2">
                             <h3 className="text-base font-bold text-gray-900 mb-1">{tossWinner.name}</h3>
                             <p className="text-gray-600 text-xs">Won toss & chose to <span className="font-bold text-gray-900">{tossDecision}</span></p>
                             <button onClick={() => setTossStep('SETUP')} className="text-[10px] text-amber-600 underline mt-2 hover:text-amber-800">Redo</button>
                         </div>
                    )}
                 </div>
             </div>
        )}

        <button 
            onClick={handleStartMatch}
            disabled={tossStep !== 'COMPLETED'}
            className={`w-full py-3 rounded-lg text-sm font-bold shadow transition-all ${tossStep === 'COMPLETED' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
            Start Match
        </button>
      </div>
    </div>
  );
};