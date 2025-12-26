import { db, auth } from '../lib/firebase';
// Fix: Modular imports from 'firebase/firestore' should be named correctly. 
// @ts-ignore
import { collection, doc, setDoc, updateDoc, onSnapshot, query, where, getDocs, increment, orderBy, limit, serverTimestamp, addDoc, deleteDoc } from "firebase/firestore";
import { Match, MatchCheers, BallEvent, Team } from '../types';
import * as GameLogic from './gameLogic';

const MATCHES_COLLECTION = 'matches';

// Helper to remove undefined fields which Firestore rejects
const sanitizeData = (data: any) => {
    const clean = JSON.parse(JSON.stringify(data));
    return clean;
};

// --- WRITES ---

export const saveMatchToFirestore = async (match: Match, userId?: string) => {
  try {
    const matchRef = doc(db, MATCHES_COLLECTION, match.id);
    const creatorId = userId || match.createdBy || auth.currentUser?.uid;
    
    if (!creatorId) return;

    const rawData = {
        ...match,
        createdBy: creatorId,
        cheers: match.cheers || { clap: 0, fire: 0, celebrate: 0, wow: 0 }
    };
    
    const matchData = sanitizeData(rawData);
    await setDoc(matchRef, matchData, { merge: true });
  } catch (error: any) {
    console.error("Error saving match to Firestore:", error.message);
  }
};

export const addBallToFirestore = async (matchId: string, ball: BallEvent) => {
    try {
        const ballsRef = collection(db, MATCHES_COLLECTION, matchId, 'balls');
        await addDoc(ballsRef, sanitizeData(ball));
    } catch (error: any) {
        console.error("Error logging ball to Firestore:", error.message);
    }
};

export const finalizeMatchInFirestore = async (matchId: string, result: any) => {
    try {
        const matchRef = doc(db, MATCHES_COLLECTION, matchId);
        // Ensure createdBy is not lost and merge logic is clean
        await updateDoc(matchRef, {
            ...sanitizeData(result),
            status: 'COMPLETED',
            completedAt: serverTimestamp(),
        });
    } catch (error: any) {
        console.error("Error finalizing match in Firestore:", error.message);
    }
};

// --- USER DATA PERSISTENCE ---

export const saveUserTeam = async (userId: string, team: Team) => {
  try {
    const teamRef = doc(db, 'users', userId, 'Teams', team.id);
    // Do not sanitize the whole object at once if it contains serverTimestamps
    const teamData = {
      ...sanitizeData(team),
      createdBy: userId,
      createdAt: team.isDefault ? null : serverTimestamp(),
      updatedAt: serverTimestamp(),
      isDefault: team.isDefault || false
    };
    await setDoc(teamRef, teamData, { merge: true });
  } catch (error: any) {
    console.error("Error saving user team to Firestore:", error);
  }
};

export const deleteUserTeam = async (userId: string, teamId: string) => {
  try {
    const teamRef = doc(db, 'users', userId, 'Teams', teamId);
    await deleteDoc(teamRef);
  } catch (error: any) {
    console.error("Error deleting user team from Firestore:", error);
  }
};

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  try {
    const teamsRef = collection(db, 'users', userId, 'Teams');
    const snapshot = await getDocs(teamsRef);
    return snapshot.docs.map(doc => doc.data() as Team);
  } catch (error) {
    console.error("Error fetching user teams:", error);
    return [];
  }
};

export const saveMatchHistorySnapshot = async (userId: string, match: Match, winMargin?: string) => {
  try {
    const historyRef = doc(db, 'users', userId, 'Matches', match.id);
    const snapshot = {
      id: match.id,
      matchName: match.name,
      gameId: match.gameId || null,
      createdBy: userId,
      teams: {
        teamA: { id: match.teams[0].id, name: match.teams[0].name, shortName: match.teams[0].shortName },
        teamB: { id: match.teams[1].id, name: match.teams[1].name, shortName: match.teams[1].shortName }
      },
      startTime: match.date,
      completedAt: serverTimestamp(),
      finalScore: match.innings.map(inn => ({
        runs: inn.totalRuns,
        wickets: inn.totalWickets,
        overs: GameLogic.getOversDisplay(inn.totalBalls)
      })),
      inningsSummary: match.innings.map(inn => ({
        battingTeam: inn.battingTeamId,
        totalRuns: inn.totalRuns,
        totalWickets: inn.totalWickets,
        totalBalls: inn.totalBalls
      })),
      result: {
        winnerTeamId: match.winnerTeamId || null,
        winMargin: winMargin || (match.abandonmentReason ? `Abandoned: ${match.abandonmentReason}` : 'Tie/No Result')
      }
    };
    await setDoc(historyRef, snapshot); // Using setDoc for history as it's a new snapshot
  } catch (error: any) {
    console.error("Error saving match history snapshot:", error);
  }
};

export const getUserMatchHistory = async (userId: string): Promise<any[]> => {
  try {
    const historyRef = collection(db, 'users', userId, 'Matches');
    const q = query(historyRef, orderBy('completedAt', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error fetching user match history:", error);
    return [];
  }
};

export const deleteMatchHistorySnapshot = async (userId: string, matchId: string) => {
  try {
    const matchRef = doc(db, 'users', userId, 'Matches', matchId);
    await deleteDoc(matchRef);
  } catch (error) {
    console.error("Error deleting match history snapshot:", error);
    throw error;
  }
};

export const sendCheer = async (matchId: string, type: keyof MatchCheers) => {
    try {
        const matchRef = doc(db, MATCHES_COLLECTION, matchId);
        await updateDoc(matchRef, {
            [`cheers.${type}`]: increment(1)
        });
    } catch (error: any) {
        if (error.code === 'permission-denied') return;
        console.error("Error sending cheer:", error);
    }
}

// --- READS ---

export const getMatchBalls = async (matchId: string): Promise<BallEvent[]> => {
    try {
        const ballsRef = collection(db, MATCHES_COLLECTION, matchId, 'balls');
        const q = query(ballsRef, orderBy('timestamp', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as BallEvent);
    } catch (error) {
        console.error("Error fetching balls:", error);
        return [];
    }
};

export const subscribeToMatch = (matchId: string, onUpdate: (match: Match) => void, onNotFound?: () => void) => {
    const matchRef = doc(db, MATCHES_COLLECTION, matchId);
    return onSnapshot(matchRef, (docSnap) => {
        if (docSnap.exists()) {
            onUpdate(docSnap.data() as Match);
        } else if (onNotFound) {
            onNotFound();
        }
    });
};

export const subscribeToMatchByGameId = (gameId: string, onUpdate: (match: Match) => void, onNotFound?: () => void) => {
    const matchesRef = collection(db, MATCHES_COLLECTION);
    const q = query(matchesRef, where('gameId', '==', gameId), limit(1));
    return onSnapshot(q, (querySnap) => {
        if (!querySnap.empty) {
            onUpdate(querySnap.docs[0].data() as Match);
        } else if (onNotFound) {
            onNotFound();
        }
    });
};

export const getLiveMatches = async (): Promise<Match[]> => {
    try {
        const matchesRef = collection(db, MATCHES_COLLECTION);
        const q = query(matchesRef, where('status', '==', 'LIVE'), where('isPublic', '==', true));
        const snapshot = await getDocs(q);
        const matches = snapshot.docs.map(doc => doc.data() as Match);
        return matches
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 3);
    } catch (error) {
        return [];
    }
};

export const searchMatches = async (searchTerm: string): Promise<Match[]> => {
    try {
        const matchesRef = collection(db, MATCHES_COLLECTION);
        let q = query(matchesRef, where('isPublic', '==', true), limit(50));
        const snapshot = await getDocs(q);
        const results: Match[] = [];
        snapshot.forEach(doc => {
            const m = doc.data() as Match;
            if (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.gameId === searchTerm) {
                results.push(m);
            }
        });
        return results;
    } catch (error) {
        return [];
    }
};
