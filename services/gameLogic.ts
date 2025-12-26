
// Add missing imports for BattingStats and BowlingStats
import { BallEvent, Inning, ExtraType, Match, Team, Player, Tournament, PointsTableEntry, PlayerTournamentStats, BattingStats, BowlingStats } from '../types';
import { GoogleGenAI } from "@google/genai";

export const createInitialInning = (battingTeamId: string, bowlingTeamId: string, battingTeamPlayers: Player[], bowlingTeamPlayers: Player[]): Inning => {
  const batStats: Record<string, any> = {};
  (battingTeamPlayers || []).forEach(p => {
    batStats[p.id] = { playerId: p.id, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
  });

  const bowlStats: Record<string, any> = {};
  (bowlingTeamPlayers || []).forEach(p => {
    bowlStats[p.id] = { playerId: p.id, overs: 0, ballsBowled: 0, maidens: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0 };
  });

  return {
    battingTeamId,
    bowlingTeamId,
    totalRuns: 0,
    totalWickets: 0,
    oversBowled: 0,
    totalBalls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    thisOver: [],
    events: [],
    battingStats: batStats as Record<string, BattingStats>,
    bowlingStats: bowlStats as Record<string, BowlingStats>,
    currentStrikerId: null,
    currentNonStrikerId: null,
    currentBowlerId: null,
    isCompleted: false,
    loneStrikerMode: false
  };
};

export const calculateRunRate = (runs: number, balls: number): string => {
  if (!balls || balls === 0) return "0.00";
  const overs = balls / 6;
  return (runs / overs).toFixed(2);
};

export const getOversDisplay = (legalBalls: number): string => {
  const overs = Math.floor((legalBalls || 0) / 6);
  const balls = (legalBalls || 0) % 6;
  return `${overs}.${balls}`;
};

export const getStrikeRate = (runs: number, balls: number): string => {
  if (!balls || balls === 0) return "0.00";
  return (((runs || 0) / balls) * 100).toFixed(2);
};

export const getEconomy = (runs: number, balls: number): string => {
  if (!balls || balls === 0) return "0.00";
  const overs = balls / 6;
  return ((runs || 0) / overs).toFixed(2);
};

// --- PREDICTION & INSIGHTS ---

export const calculateProjectedScore = (currentRuns: number, ballsBowled: number, totalOvers: number) => {
    if (!ballsBowled || ballsBowled === 0) return { current: 0, plusOne: 0, minusOne: 0 };
    
    const oversBowled = ballsBowled / 6;
    const crr = currentRuns / oversBowled;
    const remainingOvers = (totalOvers || 0) - oversBowled;
    
    const project = (rate: number) => Math.floor(currentRuns + (remainingOvers * rate));

    return {
        current: project(crr),
        plusOne: project(crr + 1),
        minusOne: project(Math.max(0, crr - 1))
    };
};

export const calculateWinProbability = (target: number, currentRuns: number, ballsBowled: number, wicketsLost: number, totalOvers: number, totalWickets: number = 10) => {
    const runsNeeded = target - currentRuns;
    const ballsRemaining = ((totalOvers || 0) * 6) - (ballsBowled || 0);
    const wicketsInHand = (totalWickets || 10) - (wicketsLost || 0);

    if (runsNeeded <= 0) return 100; 
    if (wicketsInHand === 0 && runsNeeded > 0) return 0; 
    if (ballsRemaining <= 0 && runsNeeded > 0) return 0; 

    const rrr = (runsNeeded / ballsRemaining) * 6;
    const crr = ballsBowled > 0 ? (currentRuns / ballsBowled) * 6 : 6; 

    let prob = 50;
    const rateDiff = crr - rrr;
    prob += rateDiff * 10; 

    if (wicketsInHand <= 3) prob -= 20;
    if (wicketsInHand <= 1) prob -= 30;
    if (ballsRemaining < 30 && rrr > 10) prob -= 15;

    return Math.min(Math.max(Math.round(prob), 0), 100);
};

export const getAIMatchAnalysis = async (match: Match): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a legendary cricket commentator. Provide a short, 1-sentence analysis of this match state: ${JSON.stringify(match)}`,
    });
    return response.text || "What a brilliant game of cricket we have here!";
  } catch (error) {
    console.error("Gemini AI error:", error);
    return "The match is delicately poised!";
  }
};

// --- AWARDS CALCULATION ---

export interface MVPStats {
    playerId: string;
    points: number;
    details: string;
}

export const calculateMVP = (match: Match): MVPStats[] => {
    const points: Record<string, number> = {};
    
    // Explicitly iterate over the innings tuple to avoid never[] inference from || [] on tuples
    const innings = match.innings;
    innings.forEach(inn => {
        if (!inn) return;
        // Batting Points - Explicitly type stat as BattingStats to avoid unknown errors
        Object.values(inn.battingStats).forEach((stat: BattingStats) => {
            let p = 0;
            p += (stat.runs || 0) * 1; 
            p += (stat.fours || 0) * 1; 
            p += (stat.sixes || 0) * 2; 
            if (stat.runs >= 50) p += 10;
            if (stat.runs >= 100) p += 20;
            
            if (stat.balls >= 10) {
                const sr = (stat.runs / stat.balls) * 100;
                if (sr > 150) p += 5;
            }

            points[stat.playerId] = (points[stat.playerId] || 0) + p;
        });

        // Bowling Points - Explicitly type stat as BowlingStats to avoid unknown errors
        Object.values(inn.bowlingStats).forEach((stat: BowlingStats) => {
            let p = 0;
            p += (stat.wickets || 0) * 20; 
            p += (stat.maidens || 0) * 10; 
            if (stat.wickets >= 3) p += 10;
            if (stat.wickets >= 5) p += 20;

            if (stat.ballsBowled >= 12) {
                const overs = stat.ballsBowled / 6;
                const eco = stat.runsConceded / overs;
                if (eco < 6) p += 10;
                else if (eco < 8) p += 5;
            }
            
            points[stat.playerId] = (points[stat.playerId] || 0) + p;
        });
    });

    return Object.entries(points)
        .map(([id, pts]) => ({ playerId: id, points: pts, details: `${pts} pts` }))
        .sort((a, b) => b.points - a.points);
};

// --- TOURNAMENT LOGIC ---

const ballsToOversDecimal = (balls: number): number => {
    return (balls || 0) / 6;
};

export const calculatePointsTable = (tournament: Tournament, matches: Match[], allTeams: Team[]): Record<string, PointsTableEntry[]> => {
    const table: Record<string, Record<string, PointsTableEntry>> = {};
    
    (tournament.groups || []).forEach(group => {
        table[group] = {};
        const groupTeams = (tournament.teams || []).filter(t => t.groupId === group);
        groupTeams.forEach(gt => {
            const teamDetails = (allTeams || []).find(t => t.id === gt.teamId);
            if (teamDetails) {
                table[group][gt.teamId] = {
                    teamId: gt.teamId,
                    teamName: teamDetails.name,
                    shortName: teamDetails.shortName,
                    played: 0, won: 0, lost: 0, tied: 0, noResult: 0, points: 0, nrr: 0,
                    runsScored: 0, oversFaced: 0, runsConceded: 0, oversBowled: 0
                };
            }
        });
    });

    const tourneyMatches = (matches || []).filter(m => m && m.tournamentId === tournament.id && m.status === 'COMPLETED');
    
    tourneyMatches.forEach(match => {
        if (!match.groupId || !table[match.groupId]) return;
        const groupTable = table[match.groupId];
        
        // Use direct array access to avoid inference issues with optional chaining on fixed-size tuples
        const t1 = match.teams[0];
        const t2 = match.teams[1];
        
        if (!t1 || !t2 || !groupTable[t1.id] || !groupTable[t2.id]) return;

        groupTable[t1.id].played++;
        groupTable[t2.id].played++;

        if (!match.winnerTeamId) {
             groupTable[t1.id].tied++;
             groupTable[t2.id].tied++;
             groupTable[t1.id].points += 1;
             groupTable[t2.id].points += 1;
        } else {
            if (match.winnerTeamId === t1.id) {
                groupTable[t1.id].won++;
                groupTable[t1.id].points += 2;
                groupTable[t2.id].lost++;
            } else {
                groupTable[t2.id].won++;
                groupTable[t2.id].points += 2;
                groupTable[t1.id].lost++;
            }
        }

        const inn1 = match.innings[0];
        if (inn1) {
            const team1Bat = inn1.battingTeamId;
            const team1Bowl = inn1.bowlingTeamId;
            
            if (groupTable[team1Bat] && groupTable[team1Bowl]) {
                const team1PlayersCount = (match.teams as Team[]).find(t=>t.id===team1Bat)?.players?.length || 11;
                const isTeam1AllOut = inn1.totalWickets >= team1PlayersCount - 1;
                const team1OversFaced = isTeam1AllOut ? match.oversPerInning * 6 : inn1.totalBalls;

                groupTable[team1Bat].runsScored += inn1.totalRuns;
                groupTable[team1Bat].oversFaced += team1OversFaced;
                groupTable[team1Bowl].runsConceded += inn1.totalRuns;
                groupTable[team1Bowl].oversBowled += team1OversFaced;
            }
        }

        const inn2 = match.innings[1];
        if (inn2) {
             const team2Bat = inn2.battingTeamId;
             const team2Bowl = inn2.bowlingTeamId;
             
             if (groupTable[team2Bat] && groupTable[team2Bowl]) {
                const team2PlayersCount = (match.teams as Team[]).find(t=>t.id===team2Bat)?.players?.length || 11;
                const isTeam2AllOut = inn2.totalWickets >= team2PlayersCount - 1;
                const team2OversFaced = isTeam2AllOut ? match.oversPerInning * 6 : inn2.totalBalls;

                groupTable[team2Bat].runsScored += inn2.totalRuns;
                groupTable[team2Bat].oversFaced += team2OversFaced;
                groupTable[team2Bowl].runsConceded += inn2.totalRuns;
                groupTable[team2Bowl].oversBowled += team2OversFaced;
             }
        }
    });

    const result: Record<string, PointsTableEntry[]> = {};
    
    Object.keys(table).forEach(group => {
        const rows = Object.values(table[group]);
        rows.forEach(row => {
            const batRate = row.oversFaced > 0 ? row.runsScored / ballsToOversDecimal(row.oversFaced) : 0;
            const bowlRate = row.oversBowled > 0 ? row.runsConceded / ballsToOversDecimal(row.oversBowled) : 0;
            row.nrr = parseFloat((batRate - bowlRate).toFixed(3));
        });

        result[group] = rows.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.nrr - a.nrr;
        });
    });

    return result;
};

export const calculatePlayerStats = (matches: Match[], allTeams: Team[]): { batsmen: PlayerTournamentStats[], bowlers: PlayerTournamentStats[] } => {
    const playerStats: Record<string, PlayerTournamentStats> = {};

    const getOrInitPlayer = (pid: string, pname: string, tname: string) => {
        if (!playerStats[pid]) {
            playerStats[pid] = {
                playerId: pid, playerName: pname, teamName: tname,
                runs: 0, inningsBat: 0, ballsFaced: 0, fours: 0, sixes: 0, highScore: 0, notOuts: 0, average: 0, strikeRate: 0,
                wickets: 0, oversBowled: 0, runsConceded: 0, economy: 0, bestFigures: ""
            };
        }
        return playerStats[pid];
    }

    (matches || []).forEach(match => {
        if (!match || (match.status !== 'COMPLETED' && match.status !== 'LIVE')) return; 

        match.innings.forEach(inning => {
            if (!inning) return;
            const batTeam = match.teams.find(t => t.id === inning.battingTeamId);
            const bowlTeam = match.teams.find(t => t.id === inning.bowlingTeamId);
            
            // Batting Stats - Explicitly type bs as BattingStats to avoid unknown errors
            Object.values(inning.battingStats).forEach((bs: BattingStats) => {
                if (bs.balls > 0 || bs.isOut) { 
                    const p = batTeam?.players?.find(pl => pl.id === bs.playerId);
                    if (p) {
                        const stat = getOrInitPlayer(p.id, p.name, batTeam?.name || '');
                        stat.inningsBat++;
                        stat.runs += (bs.runs || 0);
                        stat.ballsFaced += (bs.balls || 0);
                        stat.fours += (bs.fours || 0);
                        stat.sixes += (bs.sixes || 0);
                        if (!bs.isOut) stat.notOuts++;
                        if (bs.runs > stat.highScore) stat.highScore = bs.runs;
                    }
                }
            });

            // Bowling Stats - Explicitly type bs as BowlingStats to avoid unknown errors
            Object.values(inning.bowlingStats).forEach((bs: BowlingStats) => {
                if (bs.ballsBowled > 0) {
                    const p = bowlTeam?.players?.find(pl => pl.id === bs.playerId);
                    if (p) {
                        const stat = getOrInitPlayer(p.id, p.name, bowlTeam?.name || '');
                        stat.wickets += (bs.wickets || 0);
                        stat.runsConceded += (bs.runsConceded || 0);
                        stat.oversBowled += (bs.ballsBowled || 0);
                        
                        const [bestW, bestR] = stat.bestFigures ? stat.bestFigures.split('/').map(Number) : [0, 1000];
                        if (bs.wickets > bestW || (bs.wickets === bestW && bs.runsConceded < bestR)) {
                            stat.bestFigures = `${bs.wickets}/${bs.runsConceded}`;
                        }
                    }
                }
            });
        });
    });

    const allStats = Object.values(playerStats).map(s => {
        const dismissals = s.inningsBat - s.notOuts;
        s.average = dismissals > 0 ? parseFloat((s.runs / dismissals).toFixed(2)) : s.runs;
        s.strikeRate = s.ballsFaced > 0 ? parseFloat(((s.runs / s.ballsFaced) * 100).toFixed(2)) : 0;
        
        const overs = s.oversBowled / 6;
        s.economy = overs > 0 ? parseFloat((s.runsConceded / overs).toFixed(2)) : 0;
        return s;
    });

    return {
        batsmen: [...allStats].sort((a, b) => b.runs - a.runs),
        bowlers: [...allStats].sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)
    };
};
