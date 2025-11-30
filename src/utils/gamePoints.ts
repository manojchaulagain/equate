/**
 * Utility functions for awarding game-related points
 */

import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

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

