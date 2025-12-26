import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Match, Team, ExtraType, Inning, BallEvent, WicketType, Tournament } from '../types';
import * as GameLogic from '../services/gameLogic';
import * as StorageService from '../services/storageService';
import { useAuth } from './AuthContext';

interface ScoringState {
  matches: Match[];
  teams: Team[];
  tournaments: Tournament[];
  activeMatchId: string | null;
  isLoading: boolean;
  undoStack: Match[];
}

type Action =
  | { type: 'LOAD_DATA'; payload: { matches: Match[]; teams: Team[]; tournaments: Tournament[]; activeMatchId: string | null } }
  | { type: 'CREATE_TEAM'; payload: Team }
  | { type: 'UPDATE_TEAM'; payload: Team }
  | { type: 'DELETE_TEAM'; payload: { teamId: string } }
  | { type: 'CREATE_MATCH'; payload: Match }
  | { type: 'START_MATCH'; payload: { matchId: string; tossWinnerId: string; tossDecision: 'BAT' | 'BOWL' } }
  | { type: 'RECORD_BALL'; payload: { 
      runs: number; 
      extras: number; 
      extraType: ExtraType; 
      isWicket: boolean; 
      wicketType?: WicketType; 
      wicketPlayerId?: string; 
      fielderName?: string;
      runsOnWicket?: number;
    } }
  | { type: 'UNDO_LAST_BALL' }
  | { type: 'SET_BATSMEN'; payload: { strikerId: string; nonStrikerId: string } }
  | { type: 'SET_BOWLER'; payload: { bowlerId: string } }
  | { type: 'START_NEXT_INNING' }
  | { type: 'DECLARE_INNING_END'; payload: { matchId: string } }
  | { type: 'ALLOW_LONE_STRIKER' }
  | { type: 'END_MATCH' }
  | { type: 'FINALIZE_MATCH'; payload: { matchId: string; winnerTeamId: string | null; winMargin?: string; reason?: string } }
  | { type: 'CREATE_TOURNAMENT'; payload: Tournament }
  | { type: 'SET_MAN_OF_MATCH'; payload: { matchId: string; playerId: string } };

const ScoringContext = createContext<{
  state: ScoringState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

const processBall = (match: Match, payload: { runs: number; extras: number; extraType: ExtraType; isWicket: boolean; wicketType?: WicketType; wicketPlayerId?: string; fielderName?: string; runsOnWicket?: number }): Match => {
  // 1. Guard Check
  if (match.status === 'COMPLETED') return match;

  const currentInningIndex = match.currentInningIndex;
  const inning = match.innings[currentInningIndex];
  
  if (!inning || !inning.currentStrikerId || !inning.currentBowlerId || inning.isCompleted) return match; 

  // 2. Calculate New Stats
  const newBattingStats = { ...inning.battingStats };
  const newBowlingStats = { ...inning.bowlingStats };
  const newExtras = { ...inning.extras };

  const isLegalDelivery = payload.extraType !== 'WIDE' && payload.extraType !== 'NO_BALL';
  
  let totalRunsForBall = (payload.runs || 0) + (payload.extras || 0);
  if (payload.wicketType === 'RUN_OUT' && payload.runsOnWicket) {
      totalRunsForBall += payload.runsOnWicket;
  }

  const newTotalRuns = (inning.totalRuns || 0) + totalRunsForBall;
  const newTotalWickets = (inning.totalWickets || 0) + (payload.isWicket ? 1 : 0);
  
  if (payload.extraType === 'WIDE') newExtras.wides += payload.extras;
  if (payload.extraType === 'NO_BALL') newExtras.noBalls += payload.extras;
  if (payload.extraType === 'BYE') newExtras.byes += payload.runs; 
  if (payload.extraType === 'LEG_BYE') newExtras.legByes += payload.runs;

  const newTotalBalls = (inning.totalBalls || 0) + (isLegalDelivery ? 1 : 0);
  
  // Update Batting Stats
  if (!newBattingStats[inning.currentStrikerId]) {
      newBattingStats[inning.currentStrikerId] = { playerId: inning.currentStrikerId, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
  }
  const strikerStats = { ...newBattingStats[inning.currentStrikerId] };
  
  if (isLegalDelivery && payload.extraType !== 'BYE' && payload.extraType !== 'LEG_BYE') {
     strikerStats.balls += 1;
  } else if (payload.extraType === 'NO_BALL') {
     strikerStats.balls += 1;
  }

  if (payload.extraType === 'NONE' || payload.extraType === 'NO_BALL') {
      strikerStats.runs += (payload.runs || 0);
      if (payload.runs === 4) strikerStats.fours += 1;
      if (payload.runs === 6) strikerStats.sixes += 1;
  } else if (payload.wicketType === 'RUN_OUT' && payload.runsOnWicket) {
      strikerStats.runs += payload.runsOnWicket;
  }

  let nextStrikerId = inning.currentStrikerId;
  let nextNonStrikerId = inning.currentNonStrikerId;
  
  if (payload.isWicket) {
      const outPlayerId = payload.wicketPlayerId || inning.currentStrikerId;
      const wInfo = payload.fielderName ? `${payload.wicketType?.toLowerCase()} by ${payload.fielderName}` : payload.wicketType?.toLowerCase() || 'out';
      
      if (outPlayerId === inning.currentStrikerId) {
          strikerStats.isOut = true;
          strikerStats.wicketInfo = wInfo;
          newBattingStats[outPlayerId] = strikerStats;
          nextStrikerId = null; 
      } else if (outPlayerId === inning.currentNonStrikerId && outPlayerId) {
          const outPlayerStats = { ...(newBattingStats[outPlayerId] || { playerId: outPlayerId, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false }) };
          outPlayerStats.isOut = true;
          outPlayerStats.wicketInfo = wInfo;
          newBattingStats[outPlayerId] = outPlayerStats;
          nextNonStrikerId = null; 
          newBattingStats[inning.currentStrikerId] = strikerStats;
      }
  } else {
      newBattingStats[inning.currentStrikerId] = strikerStats;
  }

  // Update Bowling Stats
  if (!newBowlingStats[inning.currentBowlerId]) {
      newBowlingStats[inning.currentBowlerId] = { playerId: inning.currentBowlerId, overs: 0, ballsBowled: 0, maidens: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0 };
  }
  const bowlerStats = { ...newBowlingStats[inning.currentBowlerId] };
  if (isLegalDelivery) bowlerStats.ballsBowled += 1;
  
  let runsAgainstBowler = 0;
  if (payload.extraType === 'WIDE') runsAgainstBowler += payload.extras;
  else if (payload.extraType === 'NO_BALL') runsAgainstBowler += payload.extras + payload.runs;
  else if (payload.extraType === 'NONE') {
      runsAgainstBowler += payload.runs;
      if (payload.runsOnWicket) runsAgainstBowler += payload.runsOnWicket;
  }

  bowlerStats.runsConceded += runsAgainstBowler;
  if (payload.isWicket && payload.wicketType !== 'RUN_OUT') bowlerStats.wickets += 1;
  if (payload.extraType === 'WIDE') bowlerStats.wides += payload.extras;
  if (payload.extraType === 'NO_BALL') bowlerStats.noBalls += 1;
  newBowlingStats[inning.currentBowlerId] = bowlerStats;

  // Record Event
  const newBall: BallEvent = {
    id: Date.now().toString(),
    overNumber: Math.floor(newTotalBalls / 6),
    ballNumber: (newTotalBalls % 6) || 6,
    bowlerId: inning.currentBowlerId,
    strikerId: inning.currentStrikerId,
    nonStrikerId: inning.currentNonStrikerId,
    runsScored: payload.runs,
    extras: payload.extras,
    extraType: payload.extraType,
    isWicket: payload.isWicket,
    wicketType: payload.wicketType,
    wicketPlayerId: payload.wicketPlayerId,
    fielderName: payload.fielderName,
    runsOnWicket: payload.runsOnWicket,
    timestamp: Date.now()
  };

  const newEvents = [...(inning.events || []), newBall];
  const newThisOver = isLegalDelivery && (newTotalBalls % 6 === 0) ? [] : [...(inning.thisOver || []), newBall];

  // Rotation Logic
  let totalRotationRuns = (payload.runs || 0) + (payload.runsOnWicket || 0); 
  if (payload.extraType === 'WIDE') totalRotationRuns = Math.max(0, payload.extras - 1);

  if (totalRotationRuns % 2 !== 0 && !payload.isWicket && !inning.loneStrikerMode) {
      [nextStrikerId, nextNonStrikerId] = [nextNonStrikerId, nextStrikerId];
  }

  let nextBowlerId = inning.currentBowlerId;
  if (isLegalDelivery && newTotalBalls % 6 === 0) {
      if (!inning.loneStrikerMode) [nextStrikerId, nextNonStrikerId] = [nextNonStrikerId, nextStrikerId];
      nextBowlerId = null; 
  }

  // --- STRICT MATCH COMPLETION LOGIC ---
  const updatedInning: Inning = {
      ...inning,
      totalRuns: newTotalRuns,
      totalWickets: newTotalWickets,
      totalBalls: newTotalBalls,
      extras: newExtras,
      events: newEvents,
      thisOver: newThisOver,
      battingStats: newBattingStats, 
      bowlingStats: newBowlingStats, 
      currentStrikerId: nextStrikerId,
      currentNonStrikerId: nextNonStrikerId,
      currentBowlerId: nextBowlerId,
      isCompleted: false // Default, will verify below
  };

  let nextMatchStatus: 'SCHEDULED' | 'LIVE' | 'COMPLETED' = match.status;
  let nextInningIndex = match.currentInningIndex;
  let nextWinnerId = match.winnerTeamId;
  let nextAbandonmentReason = match.abandonmentReason;

  const battingTeamObj = match.teams.find(t => t.id === inning.battingTeamId);
  const totalPlayers = battingTeamObj?.players?.length || 11;
  const wicketsForAllOut = totalPlayers - 1;
  const maxBalls = match.oversPerInning * 6;

  // Completion Conditions
  const isAllOut = (newTotalWickets >= wicketsForAllOut) && !inning.loneStrikerMode;
  const isOversDone = newTotalBalls >= maxBalls;
  
  // 1. FIRST INNING LOGIC
  if (match.currentInningIndex === 0) {
      if (isAllOut || isOversDone) {
          updatedInning.isCompleted = true; // Lock first inning
          updatedInning.currentStrikerId = null;
          updatedInning.currentNonStrikerId = null;
          updatedInning.currentBowlerId = null;
          
          nextInningIndex = 1; // AUTOMATICALLY SWITCH TO 2ND INNING
      }
  }
  // 2. SECOND INNING LOGIC
  else if (match.currentInningIndex === 1) {
      const firstInningScore = match.innings[0].totalRuns;
      const target = firstInningScore + 1;
      const isTargetReached = newTotalRuns >= target;
      
      if (isAllOut || isOversDone || isTargetReached) {
          updatedInning.isCompleted = true; // Lock second inning
          updatedInning.currentStrikerId = null;
          updatedInning.currentNonStrikerId = null;
          updatedInning.currentBowlerId = null;

          nextMatchStatus = 'COMPLETED'; // HARD STOP
          
          if (newTotalRuns >= target) {
             nextWinnerId = updatedInning.battingTeamId;
             const wicketsLeft = wicketsForAllOut - newTotalWickets;
             nextAbandonmentReason = `Won by ${wicketsLeft} wickets`;
          } else if (newTotalRuns < firstInningScore) {
             nextWinnerId = match.innings[0].battingTeamId;
             const runDiff = firstInningScore - newTotalRuns;
             nextAbandonmentReason = `Won by ${runDiff} runs`;
          } else {
             nextWinnerId = null;
             nextAbandonmentReason = "Match Tied";
          }
      }
  }

  const newInnings = [...match.innings] as [Inning, Inning];
  newInnings[match.currentInningIndex] = updatedInning;

  return { 
    ...match, 
    innings: newInnings, 
    currentInningIndex: nextInningIndex,
    status: nextMatchStatus,
    winnerTeamId: nextWinnerId,
    abandonmentReason: nextAbandonmentReason
  };
};

const scoringReducer = (state: ScoringState, action: Action): ScoringState => {
  switch (action.type) {
    case 'LOAD_DATA':
      return { ...state, ...action.payload, isLoading: false };
    
    case 'CREATE_TEAM':
      if (!action.payload.name || action.payload.name.trim() === '') return state;
      StorageService.saveTeam(action.payload);
      return { ...state, teams: [...state.teams, action.payload] };

    case 'UPDATE_TEAM':
      StorageService.saveTeam(action.payload);
      return { ...state, teams: state.teams.map(t => t.id === action.payload.id ? action.payload : t) };

    case 'DELETE_TEAM':
      StorageService.deleteTeam(action.payload.teamId);
      return { ...state, teams: state.teams.filter(t => t.id !== action.payload.teamId) };

    case 'CREATE_MATCH':
      StorageService.saveMatch(action.payload);
      return { ...state, matches: [...state.matches, action.payload] };

    case 'START_MATCH': {
      const matchIndex = state.matches.findIndex(m => m.id === action.payload.matchId);
      if (matchIndex === -1) return state;
      const match = state.matches[matchIndex];
      const [t1, t2] = match.teams;
      let bId, oId;
      if (action.payload.tossDecision === 'BAT') {
        bId = action.payload.tossWinnerId === t1.id ? t1 : t2;
        oId = action.payload.tossWinnerId === t1.id ? t2 : t1;
      } else {
        oId = action.payload.tossWinnerId === t1.id ? t1 : t2;
        bId = action.payload.tossWinnerId === t1.id ? t2 : t1;
      }
      const i1 = GameLogic.createInitialInning(bId.id, oId.id, bId.players, oId.players);
      const i2 = GameLogic.createInitialInning(oId.id, bId.id, oId.players, bId.players);
      const startedMatch: Match = { ...match, status: 'LIVE', innings: [i1, i2] };
      
      StorageService.saveMatch(startedMatch);
      
      const updatedMatches = [...state.matches];
      updatedMatches[matchIndex] = startedMatch;
      return { ...state, matches: updatedMatches, activeMatchId: action.payload.matchId };
    }

    case 'RECORD_BALL': {
      if (!state.activeMatchId) return state;
      const idx = state.matches.findIndex(m => m.id === state.activeMatchId);
      if (idx === -1) return state;
      
      const match = state.matches[idx];
      
      // HARD STOP: If match is completed, allow NO scoring
      if (match.status === 'COMPLETED') return state;
      
      const inning = match.innings[match.currentInningIndex];
      // PRE-DELIVERY GUARD: If current inning is completed, allow NO scoring (Wait for manual override or undo)
      if (inning.isCompleted) return state;

      const updatedMatch = processBall(match, action.payload);
      StorageService.saveMatch(updatedMatch);
      
      if (updatedMatch.status === 'COMPLETED') {
          StorageService.clearActiveMatch();
      }

      const updatedMatches = [...state.matches];
      updatedMatches[idx] = updatedMatch;
      
      return { 
        ...state, 
        matches: updatedMatches, 
        activeMatchId: updatedMatch.status === 'COMPLETED' ? null : state.activeMatchId, // If completed, clear active ID to redirect to summary logic
        undoStack: [match, ...state.undoStack].slice(0, 10) 
      };
    }

    case 'UNDO_LAST_BALL': {
        if (state.undoStack.length === 0) return state;
        
        const previousState = state.undoStack[0];
        const newStack = state.undoStack.slice(1);
        
        // Sync local storage
        StorageService.saveMatch(previousState);
        
        const updatedMatches = state.matches.map(m => m.id === previousState.id ? previousState : m);
        
        return {
            ...state,
            matches: updatedMatches,
            undoStack: newStack,
            // Restore active ID if we undid a completion event
            activeMatchId: previousState.status === 'LIVE' ? previousState.id : state.activeMatchId 
        };
    }

    case 'FINALIZE_MATCH': {
        const idx = state.matches.findIndex(m => m.id === action.payload.matchId);
        if (idx === -1) return state;
        
        const finalized: Match = { 
            ...state.matches[idx], 
            status: 'COMPLETED', 
            winnerTeamId: action.payload.winnerTeamId,
            abandonmentReason: action.payload.reason || action.payload.winMargin || 'Match Finished'
        };
        
        StorageService.saveMatch(finalized);
        StorageService.clearActiveMatch();

        const updatedMatches = [...state.matches];
        updatedMatches[idx] = finalized;
        return { ...state, matches: updatedMatches, activeMatchId: null };
    }

    case 'SET_BATSMEN': {
        const idx = state.matches.findIndex(m => m.id === state.activeMatchId);
        if (idx === -1) return state;
        const match = state.matches[idx];
        const newInnings = [...match.innings] as [Inning, Inning];
        newInnings[match.currentInningIndex] = {
            ...newInnings[match.currentInningIndex],
            currentStrikerId: action.payload.strikerId || null,
            currentNonStrikerId: action.payload.nonStrikerId || null
        };
        const updated = { ...match, innings: newInnings };
        StorageService.saveMatch(updated);
        const updatedMatches = [...state.matches];
        updatedMatches[idx] = updated;
        return { ...state, matches: updatedMatches };
    }

    case 'SET_BOWLER': {
        const idx = state.matches.findIndex(m => m.id === state.activeMatchId);
        if (idx === -1) return state;
        const match = state.matches[idx];
        const newInnings = [...match.innings] as [Inning, Inning];
        newInnings[match.currentInningIndex] = {
            ...newInnings[match.currentInningIndex],
            currentBowlerId: action.payload.bowlerId || null
        };
        const updated = { ...match, innings: newInnings };
        StorageService.saveMatch(updated);
        const updatedMatches = [...state.matches];
        updatedMatches[idx] = updated;
        return { ...state, matches: updatedMatches };
    }

    case 'START_NEXT_INNING': {
        const idx = state.matches.findIndex(m => m.id === state.activeMatchId);
        if (idx === -1) return state;
        const updated = { ...state.matches[idx], currentInningIndex: 1 };
        StorageService.saveMatch(updated);
        const updatedMatches = [...state.matches];
        updatedMatches[idx] = updated;
        return { ...state, matches: updatedMatches };
    }

    case 'DECLARE_INNING_END': {
        const idx = state.matches.findIndex(m => m.id === action.payload.matchId);
        if (idx === -1) return state;
        const newInnings = [...state.matches[idx].innings] as [Inning, Inning];
        newInnings[state.matches[idx].currentInningIndex] = { ...newInnings[state.matches[idx].currentInningIndex], isCompleted: true };
        const updated = { ...state.matches[idx], innings: newInnings };
        StorageService.saveMatch(updated);
        const updatedMatches = [...state.matches];
        updatedMatches[idx] = updated;
        return { ...state, matches: updatedMatches };
    }

    case 'ALLOW_LONE_STRIKER': {
        const idx = state.matches.findIndex(m => m.id === state.activeMatchId);
        if (idx === -1) return state;
        const newInnings = [...state.matches[idx].innings] as [Inning, Inning];
        newInnings[state.matches[idx].currentInningIndex] = { ...newInnings[state.matches[idx].currentInningIndex], loneStrikerMode: true };
        const updated = { ...state.matches[idx], innings: newInnings };
        StorageService.saveMatch(updated);
        const updatedMatches = [...state.matches];
        updatedMatches[idx] = updated;
        return { ...state, matches: updatedMatches };
    }

    case 'END_MATCH':
        StorageService.clearActiveMatch();
        return { ...state, activeMatchId: null };

    default:
      return state;
  }
};

export const ScoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [state, dispatch] = useReducer(scoringReducer, {
    matches: [],
    teams: [],
    tournaments: [],
    activeMatchId: null,
    isLoading: true,
    undoStack: []
  });

  useEffect(() => {
    const loadAppData = async () => {
      let teams = StorageService.getTeams();
      // Logic for cloud fetch removed to ensure local-only mode
      dispatch({ 
        type: 'LOAD_DATA', 
        payload: { 
            teams: teams.filter(t => t && t.name && t.name.trim() !== ''), 
            matches: StorageService.getMatches(), 
            tournaments: StorageService.getTournaments(), 
            activeMatchId: StorageService.getActiveMatchId() 
        } 
      });
    };
    if (!loading) loadAppData();
  }, [user, loading]);

  return (
    <ScoringContext.Provider value={{ state, dispatch }}>
      {children}
    </ScoringContext.Provider>
  );
};

export const useScoring = () => {
  const context = useContext(ScoringContext);
  if (context === undefined) throw new Error("useScoring must be used within ScoringProvider");
  return context;
};