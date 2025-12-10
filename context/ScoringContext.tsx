
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Match, Team, BallEvent, WicketType, ExtraType, Inning, Player, Tournament } from '../types';
import * as GameLogic from '../services/gameLogic';
import * as StorageService from '../services/storageService';

// --- State Definition ---
interface ScoringState {
  matches: Match[];
  teams: Team[];
  tournaments: Tournament[];
  activeMatchId: string | null;
  isLoading: boolean;
  undoStack: Match[]; // History of last 3 states
}

// --- Actions ---
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
    } }
  | { type: 'UNDO_LAST_BALL' }
  | { type: 'SET_BATSMEN'; payload: { strikerId: string; nonStrikerId: string } }
  | { type: 'SET_BOWLER'; payload: { bowlerId: string } }
  | { type: 'START_NEXT_INNING' }
  | { type: 'DECLARE_INNING_END' }
  | { type: 'ALLOW_LONE_STRIKER' }
  | { type: 'END_MATCH' }
  | { type: 'CREATE_TOURNAMENT'; payload: Tournament }
  | { type: 'SET_MAN_OF_MATCH'; payload: { matchId: string; playerId: string } }
  | { type: 'SET_MAN_OF_SERIES'; payload: { tournamentId: string; playerId: string } };

// --- Context Setup ---
const ScoringContext = createContext<{
  state: ScoringState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

// --- Helper: Process Ball Logic ---
const processBall = (match: Match, payload: { runs: number; extras: number; extraType: ExtraType; isWicket: boolean; wicketType?: WicketType; wicketPlayerId?: string }): Match => {
  const currentInningIndex = match.currentInningIndex;
  const inning = match.innings[currentInningIndex];
  
  if (!inning.currentStrikerId) return match; 
  if (!inning.loneStrikerMode && !inning.currentNonStrikerId) return match; 

  // IMMUTABLE COPY: Create shallow copies of stats maps to prevent mutation of undoStack history
  const newBattingStats = { ...inning.battingStats };
  const newBowlingStats = { ...inning.bowlingStats };
  const newExtras = { ...inning.extras };

  const isLegalDelivery = payload.extraType !== 'WIDE' && payload.extraType !== 'NO_BALL';
  const totalRunsForBall = payload.runs + payload.extras;
  
  const newTotalRuns = inning.totalRuns + totalRunsForBall;
  const newTotalWickets = inning.totalWickets + (payload.isWicket ? 1 : 0);
  
  if (payload.extraType === 'WIDE') newExtras.wides += payload.extras;
  if (payload.extraType === 'NO_BALL') newExtras.noBalls += payload.extras;
  if (payload.extraType === 'BYE') newExtras.byes += payload.runs; 
  if (payload.extraType === 'LEG_BYE') newExtras.legByes += payload.runs;

  const newTotalBalls = inning.totalBalls + (isLegalDelivery ? 1 : 0);
  
  // Calculate updates for Striker
  // We use the COPY (newBattingStats) to get the initial state for calculation, but we won't mutate it yet.
  const strikerStats = { ...newBattingStats[inning.currentStrikerId] };
  
  if (isLegalDelivery && payload.extraType !== 'BYE' && payload.extraType !== 'LEG_BYE') {
     strikerStats.balls += 1;
  } else if (payload.extraType === 'NO_BALL') {
     strikerStats.balls += 1;
  }

  if (payload.extraType === 'NONE' || payload.extraType === 'NO_BALL') {
      strikerStats.runs += payload.runs;
      if (payload.runs === 4) strikerStats.fours += 1;
      if (payload.runs === 6) strikerStats.sixes += 1;
  }

  let nextStrikerId = inning.currentStrikerId;
  let nextNonStrikerId = inning.currentNonStrikerId;
  
  if (payload.isWicket) {
      const outPlayerId = payload.wicketPlayerId || inning.currentStrikerId;
      
      if (outPlayerId === inning.currentStrikerId) {
          // If striker is out, we commit the strikerStats we just calculated but mark as out
          strikerStats.isOut = true;
          strikerStats.wicketInfo = payload.wicketType?.toLowerCase() || 'out';
          newBattingStats[outPlayerId] = strikerStats;
          nextStrikerId = null; 
      } else {
          // If non-striker is out (e.g. run out), striker stays but stats updated
          newBattingStats[inning.currentStrikerId] = strikerStats;
          
          // Handle Non-Striker Out
          const outPlayerStats = { ...newBattingStats[outPlayerId] };
          outPlayerStats.isOut = true;
          outPlayerStats.wicketInfo = payload.wicketType?.toLowerCase() || 'out';
          newBattingStats[outPlayerId] = outPlayerStats;
          
          nextNonStrikerId = null; 
      }
  } else {
      // No wicket, simply commit the updated striker stats
      newBattingStats[inning.currentStrikerId] = strikerStats;
  }

  // Calculate updates for Bowler
  const bowlerStats = { ...newBowlingStats[inning.currentBowlerId!] };
  if (isLegalDelivery) bowlerStats.ballsBowled += 1;
  
  let runsAgainstBowler = 0;
  if (payload.extraType === 'WIDE') runsAgainstBowler += payload.extras;
  else if (payload.extraType === 'NO_BALL') runsAgainstBowler += payload.extras + payload.runs;
  else if (payload.extraType === 'NONE') runsAgainstBowler += payload.runs;

  bowlerStats.runsConceded += runsAgainstBowler;
  
  if (payload.isWicket && payload.wicketType !== 'RUN_OUT') {
      bowlerStats.wickets += 1;
  }
  if (payload.extraType === 'WIDE') bowlerStats.wides += payload.extras;
  if (payload.extraType === 'NO_BALL') bowlerStats.noBalls += 1;
  
  newBowlingStats[inning.currentBowlerId!] = bowlerStats;

  // Events & Over History
  const newBall: BallEvent = {
    id: Date.now().toString(),
    overNumber: Math.floor(inning.totalBalls / 6),
    ballNumber: (inning.totalBalls % 6) + 1,
    bowlerId: inning.currentBowlerId!,
    strikerId: inning.currentStrikerId,
    nonStrikerId: inning.currentNonStrikerId,
    runsScored: payload.runs,
    extras: payload.extras,
    extraType: payload.extraType,
    isWicket: payload.isWicket,
    wicketType: payload.wicketType,
    wicketPlayerId: payload.wicketPlayerId,
    timestamp: Date.now()
  };

  const newEvents = [...inning.events, newBall];
  const newThisOver = isLegalDelivery && (newTotalBalls % 6 === 0) ? [] : [...inning.thisOver, newBall];

  // Strike Rotation Logic
  let totalRotationRuns = payload.runs; 
  if (payload.extraType === 'WIDE') {
      // For Wides, extras contains penalty (1) + runs ran. So runs ran = extras - 1.
      totalRotationRuns = Math.max(0, payload.extras - 1);
  }

  if (totalRotationRuns % 2 !== 0) {
      if (!payload.isWicket && !inning.loneStrikerMode) {
        [nextStrikerId, nextNonStrikerId] = [nextNonStrikerId, nextStrikerId];
      }
  }

  let nextBowlerId = inning.currentBowlerId;

  if (isLegalDelivery && newTotalBalls % 6 === 0) {
      if (!inning.loneStrikerMode) {
          [nextStrikerId, nextNonStrikerId] = [nextNonStrikerId, nextStrikerId];
      }
      nextBowlerId = null; 
      newThisOver.length = 0; 
  }

  let isInningCompleted = inning.isCompleted;
  const maxLegalBalls = match.oversPerInning * 6;
  if (newTotalBalls >= maxLegalBalls) {
      isInningCompleted = true;
  }

  const battingTeam = match.teams.find(t => t.id === inning.battingTeamId);
  const totalPlayers = battingTeam ? battingTeam.players.length : 11;
  
  if (inning.loneStrikerMode) {
      if (newTotalWickets >= totalPlayers) {
          isInningCompleted = true;
      }
  } 

  let newStatus = match.status;
  let winnerId = match.winnerTeamId;
  
  if (currentInningIndex === 1) {
      const target = match.innings[0].totalRuns + 1;
      if (newTotalRuns >= target) {
          newStatus = 'COMPLETED';
          winnerId = inning.battingTeamId;
          isInningCompleted = true; 
      } else if (isInningCompleted) { 
           newStatus = 'COMPLETED';
           if (newTotalRuns < target - 1) {
              winnerId = match.innings[0].battingTeamId;
           } else if (newTotalRuns === target - 1) {
              winnerId = null;
           }
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
      battingStats: newBattingStats, // Use the new immutable map
      bowlingStats: newBowlingStats, // Use the new immutable map
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
      status: newStatus,
      winnerTeamId: winnerId
  };
};

// --- Reducer ---
const scoringReducer = (state: ScoringState, action: Action): ScoringState => {
  switch (action.type) {
    case 'LOAD_DATA':
      return { ...state, ...action.payload, isLoading: false };
    
    case 'CREATE_TEAM': {
      const newTeams = [...state.teams, action.payload];
      StorageService.saveTeam(action.payload);
      return { ...state, teams: newTeams };
    }

    case 'UPDATE_TEAM': {
        const updatedTeams = state.teams.map(t => t.id === action.payload.id ? action.payload : t);
        StorageService.saveTeam(action.payload);
        return { ...state, teams: updatedTeams };
    }

    case 'DELETE_TEAM': {
        const updatedTeams = state.teams.filter(t => t.id !== action.payload.teamId);
        StorageService.deleteTeam(action.payload.teamId);
        return { ...state, teams: updatedTeams };
    }

    case 'CREATE_MATCH': {
      const newMatches = [...state.matches, action.payload];
      StorageService.saveMatch(action.payload);
      return { ...state, matches: newMatches };
    }

    case 'START_MATCH': {
      const { matchId, tossWinnerId, tossDecision } = action.payload;
      const matchIndex = state.matches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return state;

      const match = state.matches[matchIndex];
      const team1 = match.teams[0];
      const team2 = match.teams[1];

      let battingTeam, bowlingTeam;
      if (tossDecision === 'BAT') {
        battingTeam = tossWinnerId === team1.id ? team1 : team2;
        bowlingTeam = tossWinnerId === team1.id ? team2 : team1;
      } else {
        bowlingTeam = tossWinnerId === team1.id ? team1 : team2;
        battingTeam = tossWinnerId === team1.id ? team2 : team1;
      }

      const inning1 = GameLogic.createInitialInning(battingTeam.id, bowlingTeam.id, battingTeam.players, bowlingTeam.players);
      const inning2 = GameLogic.createInitialInning(bowlingTeam.id, battingTeam.id, bowlingTeam.players, battingTeam.players);

      const startedMatch: Match = {
        ...match,
        tossWinnerId,
        tossDecision,
        status: 'LIVE',
        currentInningIndex: 0,
        innings: [inning1, inning2]
      };

      const updatedMatches = [...state.matches];
      updatedMatches[matchIndex] = startedMatch;
      StorageService.saveMatch(startedMatch);

      return { ...state, matches: updatedMatches, activeMatchId: matchId };
    }

    case 'RECORD_BALL': {
      if (!state.activeMatchId) return state;
      const matchIndex = state.matches.findIndex(m => m.id === state.activeMatchId);
      if (matchIndex === -1) return state;
      
      const currentMatch = state.matches[matchIndex];

      // PUSH TO UNDO STACK (Limit 3)
      // currentMatch acts as the snapshot because processBall now strictly returns a NEW object
      // and does not mutate nested properties of currentMatch.
      const newStack = [currentMatch, ...state.undoStack].slice(0, 3);

      const updatedMatch = processBall(currentMatch, action.payload);
      
      const updatedMatches = [...state.matches];
      updatedMatches[matchIndex] = updatedMatch;
      StorageService.saveMatch(updatedMatch);
      
      return { ...state, matches: updatedMatches, undoStack: newStack };
    }

    case 'UNDO_LAST_BALL': {
        if (!state.activeMatchId || state.undoStack.length === 0) return state;
        
        const previousMatchState = state.undoStack[0];
        const remainingStack = state.undoStack.slice(1);

        const matchIndex = state.matches.findIndex(m => m.id === state.activeMatchId);
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = previousMatchState;
        
        StorageService.saveMatch(previousMatchState);

        return { ...state, matches: updatedMatches, undoStack: remainingStack };
    }

    case 'SET_BATSMEN': {
        if (!state.activeMatchId) return state;
        const matchIndex = state.matches.findIndex(m => m.id === state.activeMatchId);
        const match = state.matches[matchIndex];
        const newInnings = [...match.innings] as [Inning, Inning];
        newInnings[match.currentInningIndex] = {
            ...newInnings[match.currentInningIndex],
            currentStrikerId: action.payload.strikerId,
            currentNonStrikerId: action.payload.nonStrikerId
        };
        const updatedMatch = { ...match, innings: newInnings };
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = updatedMatch;
        StorageService.saveMatch(updatedMatch);
        return { ...state, matches: updatedMatches };
    }
    case 'SET_BOWLER': {
        if (!state.activeMatchId) return state;
        const matchIndex = state.matches.findIndex(m => m.id === state.activeMatchId);
        const match = state.matches[matchIndex];
        const newInnings = [...match.innings] as [Inning, Inning];
        newInnings[match.currentInningIndex] = {
            ...newInnings[match.currentInningIndex],
            currentBowlerId: action.payload.bowlerId
        };
        const updatedMatch = { ...match, innings: newInnings };
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = updatedMatch;
        StorageService.saveMatch(updatedMatch);
        return { ...state, matches: updatedMatches };
    }
    case 'START_NEXT_INNING': {
        if (!state.activeMatchId) return state;
        const matchIndex = state.matches.findIndex(m => m.id === state.activeMatchId);
        const match = state.matches[matchIndex];
        if (match.currentInningIndex >= 1) return state;
        
        // Clear stack on inning change
        const updatedMatch = { ...match, currentInningIndex: 1 };
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = updatedMatch;
        StorageService.saveMatch(updatedMatch);
        return { ...state, matches: updatedMatches, undoStack: [] };
    }
    case 'DECLARE_INNING_END': {
        if (!state.activeMatchId) return state;
        const matchIndex = state.matches.findIndex(m => m.id === state.activeMatchId);
        const match = state.matches[matchIndex];
        const inningIndex = match.currentInningIndex;
        const newInnings = [...match.innings] as [Inning, Inning];
        newInnings[inningIndex] = { ...newInnings[inningIndex], isCompleted: true };
        let newStatus = match.status;
        let newWinnerId = match.winnerTeamId;
        if (inningIndex === 1) {
            newStatus = 'COMPLETED';
            const score1 = match.innings[0].totalRuns;
            const score2 = newInnings[1].totalRuns;
            if (score1 > score2) newWinnerId = match.innings[0].battingTeamId;
            else if (score2 > score1) newWinnerId = match.innings[1].battingTeamId;
            else newWinnerId = null;
        }
        const updatedMatch = { ...match, innings: newInnings, status: newStatus, winnerTeamId: newWinnerId };
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = updatedMatch;
        StorageService.saveMatch(updatedMatch);
        return { ...state, matches: updatedMatches, undoStack: [] };
    }
    case 'ALLOW_LONE_STRIKER': {
        if (!state.activeMatchId) return state;
        const matchIndex = state.matches.findIndex(m => m.id === state.activeMatchId);
        const match = state.matches[matchIndex];
        const inningIndex = match.currentInningIndex;
        let inning = match.innings[inningIndex];
        let newStrikerId = inning.currentStrikerId;
        if (!newStrikerId && inning.currentNonStrikerId) { newStrikerId = inning.currentNonStrikerId; }
        const newInning = { ...inning, loneStrikerMode: true, currentStrikerId: newStrikerId, currentNonStrikerId: null };
        const newInnings = [...match.innings] as [Inning, Inning];
        newInnings[inningIndex] = newInning;
        const updatedMatch = { ...match, innings: newInnings };
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = updatedMatch;
        StorageService.saveMatch(updatedMatch);
        return { ...state, matches: updatedMatches };
    }
    case 'END_MATCH': {
        if (!state.activeMatchId) return state;
        StorageService.clearActiveMatch();
        return { ...state, activeMatchId: null, undoStack: [] };
    }

    // --- TOURNAMENT ACTIONS ---
    case 'CREATE_TOURNAMENT': {
        const newTournaments = [...state.tournaments, action.payload];
        StorageService.saveTournament(action.payload);
        return { ...state, tournaments: newTournaments };
    }

    case 'SET_MAN_OF_MATCH': {
        const matchIndex = state.matches.findIndex(m => m.id === action.payload.matchId);
        if (matchIndex === -1) return state;
        const updatedMatch = { ...state.matches[matchIndex], manOfTheMatchId: action.payload.playerId };
        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = updatedMatch;
        StorageService.saveMatch(updatedMatch);
        return { ...state, matches: updatedMatches };
    }

    case 'SET_MAN_OF_SERIES': {
        const tourneyIndex = state.tournaments.findIndex(t => t.id === action.payload.tournamentId);
        if (tourneyIndex === -1) return state;
        const updatedTourney = { ...state.tournaments[tourneyIndex], manOfTheSeriesId: action.payload.playerId };
        const updatedTournaments = [...state.tournaments];
        updatedTournaments[tourneyIndex] = updatedTourney;
        StorageService.saveTournament(updatedTourney);
        return { ...state, tournaments: updatedTournaments };
    }

    default:
      return state;
  }
};

export const ScoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(scoringReducer, {
    matches: [],
    teams: [],
    tournaments: [],
    activeMatchId: null,
    isLoading: true,
    undoStack: []
  });

  useEffect(() => {
    let teams = StorageService.getTeams();
    const matches = StorageService.getMatches();
    const tournaments = StorageService.getTournaments();
    const activeMatchId = StorageService.getActiveMatchId();

    if (teams.length === 0) {
      const defaultTeams: Team[] = [
        {
          id: 'team_ind_default',
          name: 'India',
          shortName: 'IND',
          logoColor: 'bg-blue-100 text-blue-700',
          players: [
            { id: 'ind_1', name: 'Rohit Sharma', role: 'BATSMAN' },
            { id: 'ind_2', name: 'Virat Kohli', role: 'BATSMAN' },
            { id: 'ind_3', name: 'Hardik Pandya', role: 'ALL_ROUNDER' },
            { id: 'ind_4', name: 'Ravindra Jadeja', role: 'ALL_ROUNDER' },
            { id: 'ind_5', name: 'Jasprit Bumrah', role: 'BOWLER' }
          ]
        },
        {
          id: 'team_pak_default',
          name: 'Pakistan',
          shortName: 'PAK',
          logoColor: 'bg-emerald-100 text-emerald-700',
          players: [
            { id: 'pak_1', name: 'Babar Azam', role: 'BATSMAN' },
            { id: 'pak_2', name: 'Mohammad Rizwan', role: 'WICKET_KEEPER' },
            { id: 'pak_3', name: 'Shadab Khan', role: 'ALL_ROUNDER' },
            { id: 'pak_4', name: 'Shaheen Afridi', role: 'BOWLER' },
            { id: 'pak_5', name: 'Naseem Shah', role: 'BOWLER' }
          ]
        }
      ];
      
      // Save defaults so they persist
      defaultTeams.forEach(t => StorageService.saveTeam(t));
      teams = defaultTeams;
    }

    dispatch({ type: 'LOAD_DATA', payload: { teams, matches, tournaments, activeMatchId } });
  }, []);

  return (
    <ScoringContext.Provider value={{ state, dispatch }}>
      {children}
    </ScoringContext.Provider>
  );
};

export const useScoring = () => {
  const context = useContext(ScoringContext);
  if (!context) throw new Error("useScoring must be used within ScoringProvider");
  return context;
};
