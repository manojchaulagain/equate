/**
 * Utility functions for awarding game-related points
 */

import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, addDoc } from "firebase/firestore";

declare const __app_id: string;

/**
 * Award points to a player for playing in a game
 */
export async function awardGameAttendancePoints(
  db: any,
  playerId: string,
  playerName: string,
  gameDate: string
): Promise<void> {
  if (!db) return;

  try {
    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const pointsPath = `artifacts/${appId}/public/data/playerPoints/${playerId}`;
    const pointsRef = doc(db, pointsPath);
    const existingDoc = await getDoc(pointsRef);

    let existingPoints = 0;
    let existingHistory: any[] = [];

    if (existingDoc.exists()) {
      const data = existingDoc.data();
      existingPoints = data.totalPoints || 0;
      existingHistory = data.pointsHistory || [];
    }

    // Check if points were already awarded for this game date
    const alreadyAwarded = existingHistory.some(
      (entry: any) =>
        entry.reason === "Played in game" &&
        entry.matchDate === gameDate &&
        entry.automatic === true
    );

    if (alreadyAwarded) {
      return; // Already awarded
    }

    const newTotal = existingPoints + 2;
    const newHistoryEntry = {
      points: 2,
      reason: "Played in game",
      addedBy: "System",
      addedAt: Timestamp.now(),
      matchDate: gameDate,
      automatic: true,
    };

    await setDoc(
      pointsRef,
      {
        playerId: playerId,
        playerName: playerName,
        totalPoints: newTotal,
        pointsHistory: [...existingHistory, newHistoryEntry],
      },
      { merge: false }
    );
  } catch (err) {
    console.error("Error awarding game attendance points:", err);
    throw err;
  }
}

/**
 * Get date string in YYYY-MM-DD format
 */
export function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a game day has passed (game time has elapsed)
 */
export function isGameDayPassed(gameDate: Date, gameTime: string): boolean {
  const now = new Date();
  const [hours, minutes] = gameTime.split(':').map(Number);
  const gameDateTime = new Date(gameDate);
  gameDateTime.setHours(hours, minutes, 0, 0);
  return now > gameDateTime;
}

/**
 * Check if today was a game day and the game has passed
 */
export function isTodayGameDayPassed(schedule: { [day: number]: string } | null): boolean {
  if (!schedule) return false;
  
  const now = new Date();
  const today = now.getDay();
  const gameTime = schedule[today];
  
  if (!gameTime) return false;
  
  return isGameDayPassed(now, gameTime);
}

/**
 * Get today's date string if it was a game day
 */
export function getTodayGameDateString(schedule: { [day: number]: string } | null): string | null {
  if (isTodayGameDayPassed(schedule)) {
    return getDateString(new Date());
  }
  return null;
}

/**
 * Process and award MOTM for a game day after midnight
 * This should be called after midnight on a game day to award MOTM to the player with most votes
 */
export async function processMOTMAwards(
  db: any,
  gameDate: string
): Promise<void> {
  if (!db) return;

  try {
    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    
    // Check if MOTM has already been awarded for this game date
    const motmAwardsPath = `artifacts/${appId}/public/data/motmAwards`;
    const motmAwardsRef = collection(db, motmAwardsPath);
    const existingAwardQuery = query(motmAwardsRef, where("gameDate", "==", gameDate));
    const existingAwardSnapshot = await getDocs(existingAwardQuery);
    
    if (!existingAwardSnapshot.empty) {
      // MOTM already awarded for this game date
      return;
    }

    // Get all nominations for this game date
    const motmPath = `artifacts/${appId}/public/data/manOfTheMatch`;
    const motmRef = collection(db, motmPath);
    const nominationsQuery = query(motmRef, where("gameDate", "==", gameDate));
    const nominationsSnapshot = await getDocs(nominationsQuery);

    if (nominationsSnapshot.empty) {
      // No nominations for this game date
      return;
    }

    // Count votes for each player
    const voteCounts: { [playerId: string]: { name: string; count: number } } = {};
    nominationsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const playerId = data.nominatedPlayerId;
      if (!voteCounts[playerId]) {
        voteCounts[playerId] = {
          name: data.nominatedPlayerName,
          count: 0,
        };
      }
      voteCounts[playerId].count++;
    });

    // Find player(s) with maximum votes
    const maxVotes = Math.max(...Object.values(voteCounts).map(v => v.count));
    const winners = Object.entries(voteCounts).filter(([_, data]) => data.count === maxVotes);

    if (winners.length === 0) {
      return;
    }

    // If there's a tie, award to all tied players (or just the first one - you can adjust this logic)
    // For now, we'll award to the first player with max votes
    const [winnerPlayerId, winnerData] = winners[0];

    // Record the MOTM award
    await addDoc(motmAwardsRef, {
      gameDate: gameDate,
      playerId: winnerPlayerId,
      playerName: winnerData.name,
      voteCount: maxVotes,
      awardedAt: Timestamp.now(),
    });

    // Update player's MOTM award count in their points document
    const pointsPath = `artifacts/${appId}/public/data/playerPoints/${winnerPlayerId}`;
    const pointsRef = doc(db, pointsPath);
    const existingDoc = await getDoc(pointsRef);

    let existingMotmAwards = 0;
    let existingHistory: any[] = [];

    if (existingDoc.exists()) {
      const data = existingDoc.data();
      existingMotmAwards = data.motmAwards || 0;
      existingHistory = data.pointsHistory || [];
    }

    const newMotmAwards = existingMotmAwards + 1;

    await setDoc(
      pointsRef,
      {
        playerId: winnerPlayerId,
        playerName: winnerData.name,
        motmAwards: newMotmAwards,
        totalPoints: existingDoc.exists() ? (existingDoc.data().totalPoints || 0) : 0,
        pointsHistory: existingHistory,
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Error processing MOTM awards:", err);
    throw err;
  }
}

