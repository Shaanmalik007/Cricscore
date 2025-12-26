import React, { useState, useEffect } from 'react';
import { useScoring } from '../context/ScoringContext';
import { useNavigate } from 'react-router-dom';
import { Team, Match, Inning } from '../types';
import { Swords, Timer, Coins, Trophy, Globe, MapPin, Share2, Type } from 'lucide-react';

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

  // Auto-select teams when availableTeams changes to avoid empty dropdowns
  useEffect(() => {
    if (availableTeams.length >= 2) {
        if (!teamAId || !availableTeams.find(t => t.id === teamAId)) {
            setTeamAId(availableTeams[0].id);
        }
        if (!teamBId || !availableTeams.find(t => t.id === teamBId) || teamBId === teamAId) {
            setTeamBId(availableTeams[1].id);
        }
    }
  }, [availableTeams, teamAId, teamBId]);

  useEffect(() => {
    if (matchScope === 'TOURNAMENT' && selectedTournamentId) {
        const tourney = state.tournaments.find(t => t.id === selectedTournamentId);
        if (tourney) {
            setMatchType(tourney.format === 'T10' ? 'CUSTOM' : tourney.format as any);
            setOvers(tourney.overs);
        }
    }
  }, [matchScope, selectedTournamentId, state.tournaments]);

  useEffect(() => {
    setTossStep('SETUP');
    setTossCallerId(teamAId);
    setTossResult(null);
    setTossWinnerId('');
    setTossDecision(null);
    setCoinRotation(0);
  }, [teamAId, teamBId]);

  const handleTypeChange = (type: string) => {
    if (matchScope === 'TOURNAMENT') return;
    if (type === 'T20') {
        setMatchType('T20');
        setOvers(20);
    } else if (type === 'ODI') {
        setMatchType('ODI');
        setOvers(50);
    } else {
        setMatchType('CUSTOM');
        setOvers(10);
    }
  };

  const flipCoin = () => {
    if (!tossCallerId) return;
    
    setTossStep('FLIPPING');
    const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
    const isHeads = result === 'HEADS';
    const spins = 5;
    const newRotation = coinRotation + (spins * 360) + (isHeads ? 0 : 180);
    setCoinRotation(newRotation);

    setTimeout(() => {
        setTossResult(result);
        const isWin = result === tossCall;
        const winner = isWin ? tossCallerId : (tossCallerId === teamAId ? teamBId : teamAId);
        setTossWinnerId(winner);
        setTossStep('DECISION');
    }, 3000); 
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
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      <style>{`
        .coin-container { perspective: 1000px; }
        .coin { width: 120px; height: 120px; position: relative; transform-style: preserve-3d; transition: transform 3s cubic-bezier(0.25, 1, 0.5, 1); }
        .coin-face { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.5rem; border: 6px solid #d97706; box-shadow: inset 0 0 15px rgba(0,0,0,0.2), 0 5px 15px rgba(0,0,0,0.3); }
        .face-heads { background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%); color: #78350f; transform: rotateY(0deg); }
        .face-tails { background: linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%); color: #374151; transform: rotateY(180deg); }
      `}</style>

      <div className="bg-[#064e3b] text-white p-6">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Swords /> Start New Match</h2>
        <p className="text-emerald-200 text-sm opacity-80">Configure teams and match settings</p>
      </div>
      
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
             <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2 text-blue-900 font-bold">
                     <Globe size={18} /> Public Spectator Mode
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="sr-only peer"/>
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                 </label>
             </div>
             {isPublic && (
                 <p className="text-xs text-blue-700">Creates a numeric Game ID. Anyone can spectate live.</p>
             )}
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setMatchScope('FRIENDLY')} className={`flex-1 py-2 rounded-md font-medium text-sm transition-all ${matchScope === 'FRIENDLY' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Friendly</button>
            <button onClick={() => setMatchScope('TOURNAMENT')} className={`flex-1 py-2 rounded-md font-medium text-sm transition-all ${matchScope === 'TOURNAMENT' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Tournament</button>
        </div>

        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Type size={16}/> Match Name (Optional)</label>
            <input 
                type="text" 
                value={customMatchName}
                onChange={(e) => setCustomMatchName(e.target.value)}
                placeholder="e.g. Sunday League Final"
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
        </div>

        <div className="space-y-4">
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Home Team</label>
                <select 
                    className="w-full border border-gray-300 p-3 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none font-bold" 
                    value={teamAId} 
                    onChange={(e) => setTeamAId(e.target.value)}
                >
                    {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    {availableTeams.length === 0 && <option value="">No teams created</option>}
                </select>
            </div>
            <div className="flex items-center justify-end pr-4 -my-2">
                 <span className="font-bold text-gray-300 text-lg">VS</span>
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Away Team</label>
                <select 
                    className="w-full border border-gray-300 p-3 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none font-bold" 
                    value={teamBId} 
                    onChange={(e) => setTeamBId(e.target.value)}
                >
                    {availableTeams.filter(t => t.id !== teamAId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    {availableTeams.length < 2 && <option value="">Create more teams</option>}
                </select>
            </div>
        </div>

        <div className="bg-gray-50 p-4 md:p-6 rounded-lg relative border border-gray-100">
            {matchScope === 'TOURNAMENT' && <div className="absolute inset-0 bg-gray-100/50 cursor-not-allowed z-10" title="Settings locked by tournament"></div>}
            <h3 className="font-semibold text-gray-500 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"><Timer size={16} /> Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Format</label>
                    <div className="flex flex-wrap gap-2">
                        {['T20', 'ODI', 'CUSTOM'].map(t => (
                            <button key={t} onClick={() => handleTypeChange(t)} className={`px-4 py-2 rounded text-xs font-bold transition-colors flex-1 md:flex-none ${matchType === t ? 'bg-emerald-400 text-white shadow-sm' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{t}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Overs</label>
                    <input type="number" value={overs} onChange={(e) => setOvers(parseInt(e.target.value))} className="w-full bg-white border border-gray-300 text-gray-900 p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-bold"/>
                </div>
            </div>
        </div>

        {(teamAId && teamBId && teamAId !== teamBId) && (
             <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden relative">
                 <div className="bg-amber-100/50 p-3 border-b border-amber-200 flex items-center gap-2 text-amber-900 font-bold"><Coins size={18} /> Toss Simulation</div>
                 <div className="p-6">
                    {tossStep === 'SETUP' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-amber-800 uppercase mb-2">Who Calls?</label>
                                    <select value={tossCallerId} onChange={(e) => setTossCallerId(e.target.value)} className="w-full p-2 rounded border border-amber-300 bg-white text-gray-900 outline-none font-bold">
                                        <option value={teamAId}>{teamA?.name}</option>
                                        <option value={teamBId}>{teamB?.name}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-amber-800 uppercase mb-2">Call</label>
                                    <div className="flex bg-white rounded border border-amber-300 overflow-hidden">
                                        <button onClick={() => setTossCall('HEADS')} className={`flex-1 py-2 text-sm font-bold transition-colors ${tossCall === 'HEADS' ? 'bg-amber-400 text-white' : 'text-gray-600 hover:bg-amber-50'}`}>Heads</button>
                                        <button onClick={() => setTossCall('TAILS')} className={`flex-1 py-2 text-sm font-bold transition-colors ${tossCall === 'TAILS' ? 'bg-amber-400 text-white' : 'text-gray-600 hover:bg-amber-50'}`}>Tails</button>
                                    </div>
                                </div>
                            </div>
                            <button onClick={flipCoin} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow-md transition-transform hover:scale-[1.02]">Flip Coin</button>
                        </div>
                    )}

                    {(tossStep === 'FLIPPING' || tossStep === 'DECISION') && (
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="coin-container mb-8"><div className="coin" style={{ transform: `rotateY(${coinRotation}deg)` }}><div className="coin-face face-heads">H</div><div className="coin-face face-tails">T</div></div></div>
                            {tossStep === 'FLIPPING' && <p className="text-amber-800 font-bold animate-pulse">Flipping...</p>}
                            {tossStep === 'DECISION' && tossWinner && (
                                <div className="text-center animate-pop">
                                    <p className="text-gray-600 mb-1"><span className="font-bold text-gray-900">{state.teams?.find(t=>t.id===tossCallerId)?.name}</span> called <span className="font-bold">{tossCall}</span></p>
                                    <div className="text-2xl font-bold text-amber-900 mb-6 flex items-center justify-center gap-2"><Trophy className="text-amber-500" />{tossWinner.name} Won the Toss!</div>
                                    <div className="flex gap-4 justify-center">
                                        <button onClick={() => handleTossDecision('BAT')} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow">Bat First</button>
                                        <button onClick={() => handleTossDecision('BOWL')} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow">Bowl First</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {tossStep === 'COMPLETED' && tossWinner && tossDecision && (
                         <div className="text-center py-4">
                             <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3"><Trophy size={32} /></div>
                             <h3 className="text-xl font-bold text-gray-900">{tossWinner.name}</h3>
                             <p className="text-gray-600">Won the toss and elected to <span className="font-bold text-gray-900">{tossDecision === 'BAT' ? 'BAT' : 'BOWL'}</span></p>
                             <button onClick={() => setTossStep('SETUP')} className="text-xs text-amber-600 underline mt-4 hover:text-amber-800">Redo Toss</button>
                         </div>
                    )}
                 </div>
             </div>
        )}

        <button 
            onClick={handleStartMatch}
            disabled={tossStep !== 'COMPLETED'}
            className={`w-full py-4 rounded-lg text-lg font-bold shadow transition-all ${tossStep === 'COMPLETED' ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg transform hover:-translate-y-0.5' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
            Start Match
        </button>
      </div>
    </div>
  );
};