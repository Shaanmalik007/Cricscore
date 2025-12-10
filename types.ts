
export type PlayerRole = 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
}

export interface Team {
  id: string;
  name: string;
  shortName: string; // e.g., IND, AUS
  players: Player[];
  logoColor?: string;
}

export type WicketType = 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET' | 'RETIRED';

export type ExtraType = 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'NONE';

export interface BallEvent {
  id: string;
  overNumber: number; // 0-indexed
  ballNumber: number; // 1-indexed within over
  bowlerId: string;
  strikerId: string;
  nonStrikerId: string | null; // Nullable for Lone Striker mode
  runsScored: number; // Runs off bat
  extras: number; // Extra runs
  extraType: ExtraType;
  isWicket: boolean;
  wicketType?: WicketType;
  wicketPlayerId?: string; // Who got out
  timestamp: number;
  commentary?: string;
}

export interface BattingStats {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  wicketInfo?: string; // e.g., "b. Starc"
}

export interface BowlingStats {
  playerId: string;
  overs: number; // calculated as balls / 6
  ballsBowled: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  wides: number;
  noBalls: number;
}

export interface Inning {
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  totalWickets: number;
  oversBowled: number; // e.g. 14.2 is 14.333 internally or stored as balls
  totalBalls: number; // Legal balls bowled
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
  thisOver: BallEvent[];
  events: BallEvent[];
  battingStats: Record<string, BattingStats>;
  bowlingStats: Record<string, BowlingStats>;
  currentStrikerId: string | null;
  currentNonStrikerId: string | null;
  currentBowlerId: string | null;
  isCompleted: boolean;
  loneStrikerMode: boolean;
}

export interface Match {
  id: string;
  name: string;
  date: string;
  type: 'T20' | 'ODI' | 'TEST' | 'CUSTOM';
  oversPerInning: number;
  teams: [Team, Team];
  tossWinnerId: string | null;
  tossDecision: 'BAT' | 'BOWL' | null;
  // Toss Simulation Data
  tossCallerId?: string;
  tossCall?: 'HEADS' | 'TAILS';
  tossResult?: 'HEADS' | 'TAILS';
  
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  currentInningIndex: number; // 0 or 1
  innings: [Inning, Inning];
  winnerTeamId?: string | null;
  // Tournament Extensions
  tournamentId?: string;
  groupId?: string; // "Group A", "Group B"
  manOfTheMatchId?: string;
}

// --- TOURNAMENT TYPES ---

export interface TournamentTeamEntry {
  teamId: string;
  groupId: string;
}

export interface Tournament {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  format: 'T20' | 'ODI' | 'T10' | 'CUSTOM';
  overs: number;
  groups: string[]; // ["Group A", "Group B"]
  teams: TournamentTeamEntry[];
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  manOfTheSeriesId?: string;
}

export interface PointsTableEntry {
  teamId: string;
  teamName: string;
  shortName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  nrr: number;
  // For NRR Calc
  runsScored: number;
  oversFaced: number; // in balls
  runsConceded: number;
  oversBowled: number; // in balls
}

export interface PlayerTournamentStats {
  playerId: string;
  playerName: string;
  teamName: string;
  // Batting
  runs: number;
  inningsBat: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  highScore: number;
  notOuts: number;
  average: number;
  strikeRate: number;
  // Bowling
  wickets: number;
  oversBowled: number; // balls
  runsConceded: number;
  economy: number;
  bestFigures: string; // "3/24"
}
