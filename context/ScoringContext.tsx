import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Match, Team, ExtraType, Inning, BallEvent, WicketType, Tournament } from '../types';
import * as GameLogic from '../services/gameLogic';
import * as StorageService from '../services/storageService';
import * as FirestoreService from '../services/firestoreService';
import { auth, db } from '../lib/firebase';
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
  | { type: 'DECLARE_INNING_END' }
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
  const currentInningIndex = match.currentInningIndex;
  const inning = match.innings[currentInningIndex];
  
  if (!inning || !inning.currentStrikerId || !inning.currentBowlerId) return match; 

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
          if (!newBattingStats[outPlayerId]) {
              newBattingStats[outPlayerId] = { playerId: outPlayerId, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
          }
          const outPlayerStats = { ...newBattingStats[outPlayerId] };
          outPlayerStats.isOut = true;
          outPlayerStats.wicketInfo = wInfo;
          newBattingStats[outPlayerId] = outPlayerStats;
          nextNonStrikerId = null; 
          newBattingStats[inning.currentStrikerId] = strikerStats;
      }
  } else {
      newBattingStats[inning.currentStrikerId] = strikerStats;
  }

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

  let isInningCompleted = inning.isCompleted;
  const maxLegalBalls = match.oversPerInning * 6;
  if (newTotalBalls >= maxLegalBalls) isInningCompleted = true;

  const battingTeamObj = match.teams.find(t => t.id === inning.battingTeamId);
  const totalPlayers = battingTeamObj ? battingTeamObj.players.length : 11;
  if (newTotalWickets >= totalPlayers - 1 && !inning.loneStrikerMode) isInningCompleted = true;

  // --- AUTOCOMPLETE LOGIC: Target Chased ---
  let isMatchCompleted = match.status === 'COMPLETED';
  let winnerId = match.winnerTeamId;

  if (match.currentInningIndex === 1) {
    const target = match.innings[0].totalRuns + 1;
    if (newTotalRuns >= target) {
      isInningCompleted = true;
      isMatchCompleted = true;
      winnerId = inning.battingTeamId;
    }
  }

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
      isCompleted: isInningCompleted
  };

  const newInnings = [...match.innings] as [Inning, Inning];
  newInnings[currentInningIndex] = updatedInning;

  return { 
    ...match, 
    innings: newInnings, 
    status: isMatchCompleted ? 'COMPLETED' : match.status,
    winnerTeamId: winnerId
  };
};

const scoringReducer = (state: ScoringState, action: Action): ScoringState => {
  switch (action.type) {
    case 'LOAD_DATA':
      return { ...state, ...action.payload, isLoading: false };
    
    case 'CREATE_TEAM':
      StorageService.saveTeam(action.payload);
      if (auth.currentUser) {
          FirestoreService.saveUserTeam(auth.currentUser.uid, action.payload);
      }
      return { ...state, teams: [...state.teams, action.payload] };

    case 'UPDATE_TEAM':
      StorageService.saveTeam(action.payload);
      if (auth.currentUser) {
          FirestoreService.saveUserTeam(auth.currentUser.uid, action.payload);
      }
      return { 
        ...state, 
        teams: state.teams.map(t => t.id === action.payload.id ? action.payload : t) 
      };

    case 'DELETE_TEAM':
      StorageService.deleteTeam(action.payload.teamId);
      if (auth.currentUser) {
          FirestoreService.deleteUserTeam(auth.currentUser.uid, action.payload.teamId);
      }
      return { 
        ...state, 
        teams: state.teams.filter(t => t.id !== action.payload.teamId) 
      };

    case 'CREATE_MATCH':
      StorageService.saveMatch(action.payload);
      FirestoreService.saveMatchToFirestore(action.payload, auth.currentUser?.uid);
      return { ...state, matches: [...state.matches, action.payload] };

    case 'START_MATCH': {
      const matchIndex = state.matches.findIndex(m => m.id === action.payload.matchId);
      if (matchIndex === -1) return state;
      const match = state.matches[matchIndex];
      const [t1, t2] = match.teams;
      let battingTeam, bowlingTeam;
      if (action.payload.tossDecision === 'BAT') {
        battingTeam = action.payload.tossWinnerId === t1.id ? t1 : t2;
        bowlingTeam = action.payload.tossWinnerId === t1.id ? t2 : t1;
      } else {
        bowlingTeam = action.payload.tossWinnerId === t1.id ? t1 : t2;
        battingTeam = action.payload.tossWinnerId === t1.id ? t2 : t1;
      }
      const inning1 = GameLogic.createInitialInning(battingTeam.id, bowlingTeam.id, battingTeam.players, bowlingTeam.players);
      const inning2 = GameLogic.createInitialInning(bowlingTeam.id, battingTeam.id, bowlingTeam.players, battingTeam.players);
      const startedMatch: Match = { ...match, status: 'LIVE', innings: [inning1, inning2] };
      StorageService.saveMatch(startedMatch);
      FirestoreService.saveMatchToFirestore(startedMatch, auth.currentUser?.uid);
      const updatedMatches = [...state.matches];
      updatedMatches[matchIndex] = startedMatch;
      return { ...state, matches: updatedMatches, activeMatchId: action.payload.matchId };
    }

    case 'RECORD_BALL': {
      if (!state.activeMatchId) return state;
      const matchIndex = state.matches.findIndex(m => m.id === state.activeMatchId);
      if (matchIndex === -1) return state;
      const currentMatch = state.matches[matchIndex];
      const updatedMatch = processBall(currentMatch, action.payload);
      
      const currentInn = updatedMatch.innings[updatedMatch.currentInningIndex];
      const lastBall = currentInn.events?.[currentInn.events.length - 1];
      if (lastBall) FirestoreService.addBallToFirestore(updatedMatch.id, lastBall);
      
      // Handle Auto-Completion Firestore sync
      if (updatedMatch.status === 'COMPLETED' && currentMatch.status === 'LIVE') {
        const battingTeamObj = updatedMatch.teams.find(t => t.id === currentInn.battingTeamId);
        const winMargin = `${(battingTeamObj?.players?.length || 11) - 1 - currentInn.totalWickets} wickets`;
        
        FirestoreService.finalizeMatchInFirestore(updatedMatch.id, { 
            winnerTeamId: updatedMatch.winnerTeamId,
            winMargin: winMargin,
            status: 'COMPLETED'
        });
        
        if (auth.currentUser) {
          FirestoreService.saveMatchHistorySnapshot(auth.currentUser.uid, updatedMatch, winMargin);
        }
        StorageService.clearActiveMatch();
      } else {
        StorageService.saveMatch(updatedMatch);
        FirestoreService.saveMatchToFirestore(updatedMatch, auth.currentUser?.uid);
      }
      
      const updatedMatches = [...state.matches];
      updatedMatches[matchIndex] = updatedMatch;
      return { 
        ...state, 
        matches: updatedMatches, 
        activeMatchId: updatedMatch.status === 'COMPLETED' ? null : state.activeMatchId,
        undoStack: [currentMatch, ...state.undoStack].slice(0, 5) 
      };
    }

    case 'UNDO_LAST_BALL': {
        if (state.undoStack.length === 0) return state;
        const previousMatch = state.undoStack[0];
        const newStack = state.undoStack.slice(1);
        
        StorageService.saveMatch(previousMatch);
        FirestoreService.saveMatchToFirestore(previousMatch, auth.currentUser?.uid);
        
        return { 
          ...state, 
          matches: state.matches.map(m => m.id === previousMatch.id ? previousMatch : m), 
          undoStack: newStack,
          activeMatchId: previousMatch.id // Re-activate if it was undo from completed
        };
    }

    case 'FINALIZE_MATCH': {
        const matchIndex = state.matches.findIndex(m => m.id === action.payload.matchId);
        if (matchIndex === -1) return state;
        const currentMatch = state.matches[matchIndex];
        const finalizedMatch = { 
            ...currentMatch, 
            status: 'COMPLETED' as const, 
            winnerTeamId: action.payload.winnerTeamId,
            abandonmentReason: action.payload.reason
        };
        StorageService.saveMatch(finalizedMatch);
        FirestoreService.finalizeMatchInFirestore(action.payload.matchId, { 
            winnerTeamId: action.payload.winnerTeamId,
            winMargin: action.payload.winMargin,
            abandonmentReason: action.payload.reason
        });
        
        if (auth.currentUser) {
          FirestoreService.saveMatchHistorySnapshot(auth.currentUser.uid, finalizedMatch, action.payload.winMargin);
        }

        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = finalizedMatch;
        StorageService.clearActiveMatch();
        return { ...state, matches: updatedMatches, activeMatchId: null };
    }

    case 'SET_BATSMEN': {
        const matchIndex = state.matches.findIndex(m => m.id === state.activeMatchId);
        if (matchIndex === -1) return state;
        const match = state.matches[matchIndex];
        const newInnings = [...match.innings] as [Inning, Inning];
        newInnings[match.currentInningIndex] = {
            ...newInnings[match.currentInningIndex],
            currentStrikerId: action.payload.strikerId || null,
            currentNonStrikerId: action.payload.nonStrikerId || null
        };
        const updatedMatch = { ...match, innings: newInnings };
        StorageService.saveMatch(updatedMatch);
        FirestoreService.saveMatchToFirestore(updatedMatch, auth.currentUser?.uid);
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = updatedMatch;
        return { ...state, matches: updatedMatches };
    }

    case 'SET_BOWLER': {
        const matchIndex = state.matches.findIndex(m => m.id === state.activeMatchId);
        if (matchIndex === -1) return state;
        const match = state.matches[matchIndex];
        const newInnings = [...match.innings] as [Inning, Inning];
        newInnings[match.currentInningIndex] = {
            ...newInnings[match.currentInningIndex],
            currentBowlerId: action.payload.bowlerId || null
        };
        const updatedMatch = { ...match, innings: newInnings };
        StorageService.saveMatch(updatedMatch);
        FirestoreService.saveMatchToFirestore(updatedMatch, auth.currentUser?.uid);
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = updatedMatch;
        return { ...state, matches: updatedMatches };
    }

    case 'START_NEXT_INNING': {
        const matchIndex = state.matches.findIndex(m => m.id === state.activeMatchId);
        if (matchIndex === -1) return state;
        const match = state.matches[matchIndex];
        const updatedMatch = { ...match, currentInningIndex: 1 };
        StorageService.saveMatch(updatedMatch);
        FirestoreService.saveMatchToFirestore(updatedMatch, auth.currentUser?.uid);
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = updatedMatch;
        return { ...state, matches: updatedMatches };
    }

    case 'DECLARE_INNING_END': {
        const matchIndex = state.matches.findIndex(m => m.id === state.activeMatchId);
        if (matchIndex === -1) return state;
        const match = state.matches[matchIndex];
        const newInnings = [...match.innings] as [Inning, Inning];
        newInnings[match.currentInningIndex] = { ...newInnings[match.currentInningIndex], isCompleted: true };
        const updatedMatch = { ...match, innings: newInnings };
        StorageService.saveMatch(updatedMatch);
        FirestoreService.saveMatchToFirestore(updatedMatch, auth.currentUser?.uid);
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = updatedMatch;
        return { ...state, matches: updatedMatches };
    }

    case 'ALLOW_LONE_STRIKER': {
        const matchIndex = state.matches.findIndex(m => m.id === state.activeMatchId);
        if (matchIndex === -1) return state;
        const match = state.matches[matchIndex];
        const newInnings = [...match.innings] as [Inning, Inning];
        newInnings[match.currentInningIndex] = { ...newInnings[match.currentInningIndex], loneStrikerMode: true };
        const updatedMatch = { ...match, innings: newInnings };
        StorageService.saveMatch(updatedMatch);
        FirestoreService.saveMatchToFirestore(updatedMatch, auth.currentUser?.uid);
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = updatedMatch;
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
      
      if (user) {
        const firestoreTeams = await FirestoreService.getUserTeams(user.uid);
        if (firestoreTeams && firestoreTeams.length > 0) {
          teams = firestoreTeams;
          teams.forEach(t => StorageService.saveTeam(t));
        }
      }
      
      const matches = StorageService.getMatches() || [];
      const tournaments = StorageService.getTournaments() || [];
      const activeMatchId = StorageService.getActiveMatchId();
      dispatch({ type: 'LOAD_DATA', payload: { teams, matches, tournaments, activeMatchId } });
    };

    if (!loading) {
        loadAppData();
    }
  }, [user, loading]);

  return (
    <ScoringContext.Provider value={{ state, dispatch }}>
      {children}
    </ScoringContext.Provider>
  );
};

export const useScoring = () => {
  const context = useContext(ScoringContext);
  if (context === undefined) {
    throw new Error("useScoring must be used within ScoringProvider");
  }
  return context;
};