/**
 * Game reminder utilities
 * Handles 3-day reminder notifications before scheduled games
 */

import { Timestamp, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { FirestorePaths } from "./firestorePaths";
import { GameSchedule } from "./gameSchedule";

declare const __app_id: string;

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / oneDay);
}

/**
 * Get the next game date within the next 7 days
 */
export function getUpcomingGamesInNext7Days(schedule: GameSchedule | null): Array<{ date: Date; dayOfWeek: number; location?: string }> {
  if (!schedule || !schedule.schedule || Object.keys(schedule.schedule).length === 0) {
    return [];
  }

  const now = new Date();
  const upcomingGames: Array<{ date: Date; dayOfWeek: number; location?: string }> = [];

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + i);
    const dayOfWeek = checkDate.getDay();
    
    if (schedule.schedule[dayOfWeek]) {
      const [hours, minutes] = schedule.schedule[dayOfWeek].split(':').map(Number);
      const gameDate = new Date(checkDate);
      gameDate.setHours(hours, minutes, 0, 0);
      
      const location = schedule.location?.[dayOfWeek];
      upcomingGames.push({
        date: gameDate,
        dayOfWeek,
        location,
      });
    }
  }

  return upcomingGames;
}

/**
 * Check if a reminder should be sent for a game (3 days before)
 */
export function shouldSendReminder(gameDate: Date): boolean {
  const now = new Date();
  const daysUntil = daysBetween(now, gameDate);
  return daysUntil === 3;
}

/**
 * Check if reminder already sent for a game date
 */
export async function isReminderSent(db: any, gameDate: string): Promise<boolean> {
  if (!db) return false;

  try {
    const notificationsPath = FirestorePaths.notifications();
    const notificationsRef = collection(db, notificationsPath);
    const q = query(
      notificationsRef,
      where("type", "==", "game_reminder"),
      where("gameDate", "==", gameDate)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (err) {
    console.error("Error checking reminder status:", err);
    return false;
  }
}

/**
 * Send 3-day reminder notifications for upcoming games
 */
export async function sendGameReminders(
  db: any,
  schedule: GameSchedule | null,
  allPlayers: Array<{ id: string; userId?: string }>
): Promise<void> {
  if (!db || !schedule) return;

  try {
    const upcomingGames = getUpcomingGamesInNext7Days(schedule);
    
    for (const game of upcomingGames) {
      if (shouldSendReminder(game.date)) {
        const gameDateStr = game.date.toDateString();
        
        // Check if reminder already sent
        const alreadySent = await isReminderSent(db, gameDateStr);
        if (alreadySent) {
          continue;
        }

        // Format game date/time
        const gameTime = game.date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        const gameDateFormatted = game.date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Create notification message
        const locationText = game.location ? ` at ${game.location}` : "";
        const message = `Game reminder: Your next game is on ${gameDateFormatted} at ${gameTime}${locationText}. Don't forget to update your availability!`;

        // Create notification for all players
        const notificationsPath = FirestorePaths.notifications();
        const notificationsRef = collection(db, notificationsPath);
        
        await addDoc(notificationsRef, {
          type: "game_reminder",
          title: "Game Reminder - 3 Days",
          message,
          gameDate: gameDateStr,
          gameDateTime: Timestamp.fromDate(game.date),
          location: game.location || "",
          createdAt: Timestamp.now(),
          readBy: [],
        });

        // Also create individual user notifications for players with userId
        const userNotificationsPath = FirestorePaths.userNotifications();
        const userNotificationsRef = collection(db, userNotificationsPath);

        const notificationPromises = allPlayers
          .filter((player) => player.userId)
          .map((player) =>
            addDoc(userNotificationsRef, {
              userId: player.userId,
              type: "game_reminder",
              message,
              gameDate: gameDateStr,
              gameDateTime: Timestamp.fromDate(game.date),
              location: game.location || "",
              createdAt: Timestamp.now(),
              read: false,
            })
          );

        await Promise.all(notificationPromises);
      }
    }
  } catch (err) {
    console.error("Error sending game reminders:", err);
    throw err;
  }
}

