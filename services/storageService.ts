
import { Match, Team, Tournament } from '../types';

const STORAGE_KEYS = {
  MATCHES: 'cricscore_matches',
  TEAMS: 'cricscore_teams',
  ACTIVE_MATCH: 'cricscore_active_match',
  TOURNAMENTS: 'cricscore_tournaments'
};

export const saveTeam = (team: Team) => {
  const teams = getTeams();
  const existingIndex = teams.findIndex(t => t.id === team.id);
  if (existingIndex >= 0) {
    teams[existingIndex] = team;
  } else {
    teams.push(team);
  }
  localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
};

export const deleteTeam = (teamId: string) => {
  const teams = getTeams();
  const updatedTeams = teams.filter(t => t.id !== teamId);
  localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(updatedTeams));
};

export const getTeams = (): Team[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TEAMS);
  return data ? JSON.parse(data) : [];
};

export const saveMatch = (match: Match) => {
  const matches = getMatches();
  const existingIndex = matches.findIndex(m => m.id === match.id);
  if (existingIndex >= 0) {
    matches[existingIndex] = match;
  } else {
    matches.push(match);
  }
  localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
  // Also save as active match for continuity
  if (match.status === 'LIVE') {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_MATCH, match.id);
  }
};

export const getMatches = (): Match[] => {
  const data = localStorage.getItem(STORAGE_KEYS.MATCHES);
  return data ? JSON.parse(data) : [];
};

export const getMatchById = (id: string): Match | undefined => {
  const matches = getMatches();
  return matches.find(m => m.id === id);
};

export const getActiveMatchId = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_MATCH);
};

export const clearActiveMatch = () => {
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_MATCH);
};

// --- TOURNAMENT STORAGE ---

export const saveTournament = (tournament: Tournament) => {
  const tournaments = getTournaments();
  const existingIndex = tournaments.findIndex(t => t.id === tournament.id);
  if (existingIndex >= 0) {
    tournaments[existingIndex] = tournament;
  } else {
    tournaments.push(tournament);
  }
  localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(tournaments));
};

export const getTournaments = (): Tournament[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TOURNAMENTS);
  return data ? JSON.parse(data) : [];
};
