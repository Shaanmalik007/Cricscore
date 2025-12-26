import { db, auth } from '../lib/firebase';
// @ts-ignore
import { collection, doc, setDoc, updateDoc, onSnapshot, query, where, getDocs, getDoc, increment, orderBy, limit, serverTimestamp, deleteDoc } from "firebase/firestore";
import { Match, MatchCheers, BallEvent, Team } from '../types';

const MATCHES_COLLECTION = 'matches';

const sanitizeData = (data: any) => {
    try {
        return JSON.parse(JSON.stringify(data, (key, value) => {
            return value === undefined ? null : value;
        }));
    } catch (e) {
        return {};
    }
};

// --- NON-BLOCKING BACKGROUND WRITES ---

/**
 * Syncs minimal match metadata to Firestore.
 * Strictly non-blocking. If Firestore fails or permissions are missing,
 * the app continues normally.
 */
export const saveMatchToFirestore = (match: Match) => {
  // HARD GUARD: Do not attempt to sync if match is already completed
  if (!match || match.status === 'COMPLETED') return;

  try {
    const creatorId = auth.currentUser?.uid || match.createdBy;
    if (!creatorId) return;

    const matchRef = doc(db, MATCHES_COLLECTION, match.id);
    
    // Minimal data sync to avoid payload/permission issues
    const syncData = sanitizeData({
      id: match.id,
      name: match.name,
      status: match.status,
      createdBy: creatorId,
      teams: match.teams.map(t => ({ id: t.id, name: t.name, shortName: t.shortName })),
      currentInningIndex: match.currentInningIndex,
      isPublic: match.isPublic,
      gameId: match.gameId,
      updatedAt: serverTimestamp(),
      // Current score for live list
      lastScore: match.innings[match.currentInningIndex] ? {
          runs: match.innings[match.currentInningIndex].totalRuns,
          wickets: match.innings[match.currentInningIndex].totalWickets,
          balls: match.innings[match.currentInningIndex].totalBalls
      } : null
    });

    // Fire and forget - do not await
    setDoc(matchRef, syncData, { merge: true }).catch(() => {
        // Silent catch: Permission or network errors must not block the app
    });
  } catch (err) {
    // Catch sync setup errors
  }
};

/**
 * DISABLED: Ball logging removed to prevent Firestore permission errors from blocking the UI.
 */
export const addBallToFirestore = (matchId: string, ball: BallEvent) => {
    return; // NO-OP
};

/**
 * Marks match as completed in Firestore. Minimal write.
 */
export const finalizeMatchInFirestore = (matchId: string, result: { winnerTeamId: string | null, winMargin?: string }) => {
    try {
        const matchRef = doc(db, MATCHES_COLLECTION, matchId);
        updateDoc(matchRef, {
            status: 'COMPLETED',
            winnerTeamId: result.winnerTeamId,
            abandonmentReason: result.winMargin,
            completedAt: serverTimestamp(),
        }).catch(() => {
            // Silent catch
        });
    } catch (err) {
        // Catch sync setup errors
    }
};

// --- USER DATA PERSISTENCE (NON-BLOCKING) ---

export const saveUserTeam = (userId: string, team: Team) => {
  try {
    const teamRef = doc(db, 'users', userId, 'Teams', team.id);
    setDoc(teamRef, sanitizeData(team), { merge: true }).catch(() => {});
  } catch (err) {}
};

export const deleteUserTeam = (userId: string, teamId: string) => {
  try {
    const teamRef = doc(db, 'users', userId, 'Teams', teamId);
    deleteDoc(teamRef).catch(() => {});
  } catch (err) {}
};

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  try {
    const teamsRef = collection(db, 'users', userId, 'Teams');
    const snapshot = await getDocs(teamsRef);
    return snapshot.docs.map(doc => doc.data() as Team);
  } catch (error) {
    return [];
  }
};

/**
 * Saves a final snapshot of the match to the user's private history.
 * Non-blocking.
 */
export const saveMatchHistorySnapshot = (userId: string, match: Match) => {
  try {
    const historyRef = doc(db, 'users', userId, 'Matches', match.id);
    const snapshot = sanitizeData({
      id: match.id,
      matchName: match.name,
      teams: match.teams,
      startTime: match.date,
      completedAt: new Date().toISOString(),
      result: {
        winnerTeamId: match.winnerTeamId || null,
        winMargin: match.abandonmentReason || 'Finished'
      },
      finalInnings: match.innings.map(inn => ({
          runs: inn.totalRuns,
          wickets: inn.totalWickets,
          balls: inn.totalBalls
      }))
    });
    setDoc(historyRef, snapshot).catch(() => {});
  } catch (err) {}
};

export const getUserMatchHistory = async (userId: string): Promise<any[]> => {
  try {
    const historyRef = collection(db, 'users', userId, 'Matches');
    const snapshot = await getDocs(query(historyRef, limit(20)));
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    return [];
  }
};

export const getMatchFromHistory = async (userId: string, matchId: string): Promise<any | null> => {
  try {
    const matchRef = doc(db, 'users', userId, 'Matches', matchId);
    const docSnap = await getDoc(matchRef);
    return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } : null;
  } catch (error) {
    return null;
  }
};

export const deleteMatchHistorySnapshot = async (userId: string, matchId: string) => {
  try {
    const matchRef = doc(db, 'users', userId, 'Matches', matchId);
    await deleteDoc(matchRef);
  } catch (err) {
      throw err;
  }
};

export const sendCheer = (matchId: string, type: keyof MatchCheers) => {
    try {
        const matchRef = doc(db, MATCHES_COLLECTION, matchId);
        updateDoc(matchRef, { [`cheers.${type}`]: increment(1) }).catch(() => {});
    } catch (err) {}
};

// --- READS ---

export const getMatchBalls = async (matchId: string): Promise<BallEvent[]> => {
    return []; // Managed locally
};

export const subscribeToMatch = (matchId: string, onUpdate: (match: Match) => void, onNotFound?: () => void) => {
    const matchRef = doc(db, MATCHES_COLLECTION, matchId);
    return onSnapshot(matchRef, (docSnap) => {
        if (docSnap.exists()) onUpdate(docSnap.data() as Match);
        else if (onNotFound) onNotFound();
    }, () => {});
};

export const subscribeToMatchByGameId = (gameId: string, onUpdate: (match: Match) => void, onNotFound?: () => void) => {
    const matchesRef = collection(db, MATCHES_COLLECTION);
    const q = query(matchesRef, where('gameId', '==', gameId), where('isPublic', '==', true), limit(1));
    return onSnapshot(q, (querySnap) => {
        if (!querySnap.empty) onUpdate(querySnap.docs[0].data() as Match);
        else if (onNotFound) onNotFound();
    }, () => {});
};

export const getLiveMatches = async (): Promise<Match[]> => {
    try {
        const matchesRef = collection(db, MATCHES_COLLECTION);
        const q = query(matchesRef, where('status', '==', 'LIVE'), where('isPublic', '==', true), limit(3));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as Match);
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