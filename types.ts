export type PlayerRole = 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  players: Player[];
  logoColor?: string;
  isDefault?: boolean; // New: To identify system default teams
}

export type WicketType = 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET' | 'RETIRED';

export type ExtraType = 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'NONE';

export interface BallEvent {
  id: string;
  overNumber: number;
  ballNumber: number;
  bowlerId: string;
  strikerId: string;
  nonStrikerId: string | null;
  runsScored: number;
  extras: number;
  extraType: ExtraType;
  isWicket: boolean;
  wicketType?: WicketType;
  wicketPlayerId?: string;
  fielderName?: string;
  runsOnWicket?: number;
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
  wicketInfo?: string;
}

export interface BowlingStats {
  playerId: string;
  overs: number;
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
  oversBowled: number;
  totalBalls: number;
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

export interface MatchLocation {
  lat: number;
  lng: number;
  city?: string;
  groundName?: string;
}

export interface MatchCheers {
  clap: number;
  fire: number;
  celebrate: number;
  wow: number;
}

export interface Match {
  id: string;
  gameId?: string;
  isPublic?: boolean;
  location?: MatchLocation;
  cheers?: MatchCheers;
  createdBy?: string;
  name: string;
  date: string;
  type: 'T20' | 'ODI' | 'TEST' | 'CUSTOM';
  oversPerInning: number;
  teams: [Team, Team];
  tossWinnerId: string | null;
  tossDecision: 'BAT' | 'BOWL' | null;
  tossCallerId?: string;
  tossCall?: 'HEADS' | 'TAILS';
  tossResult?: 'HEADS' | 'TAILS';
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  currentInningIndex: number;
  innings: [Inning, Inning];
  winnerTeamId?: string | null;
  tournamentId?: string;
  groupId?: string;
  manOfTheMatchId?: string;
  abandonmentReason?: string; // New: Why match was ended manually
}

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
  groups: string[];
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
  runsScored: number;
  oversFaced: number;
  runsConceded: number;
  oversBowled: number;
}

export interface PlayerTournamentStats {
  playerId: string;
  playerName: string;
  teamName: string;
  runs: number;
  inningsBat: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  highScore: number;
  notOuts: number;
  average: number;
  strikeRate: number;
  wickets: number;
  oversBowled: number;
  runsConceded: number;
  economy: number;
  bestFigures: string;
}