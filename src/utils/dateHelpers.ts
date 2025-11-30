/**
 * Utility functions for date operations
 */

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString();
}

/**
 * Get milliseconds until next minute (for polling intervals)
 */
export function getMsUntilNextMinute(): number {
  const now = new Date();
  const nextMinute = new Date(now);
  nextMinute.setMinutes(now.getMinutes() + 1);
  nextMinute.setSeconds(0);
  nextMinute.setMilliseconds(0);
  return nextMinute.getTime() - now.getTime();
}

/**
 * Check if the current date is on the game day or the day after the game day
 * This allows panels to be visible until midnight of the day after the game
 */
export function isOnGameDayOrDayAfter(gameDate: Date, currentDate: Date): boolean {
  const gameDay = new Date(gameDate);
  gameDay.setHours(0, 0, 0, 0);
  
  const nextDay = new Date(gameDay);
  nextDay.setDate(gameDay.getDate() + 1);
  
  const currentDay = new Date(currentDate);
  currentDay.setHours(0, 0, 0, 0);
  
  // Check if current date is the game day
  const isGameDay = currentDay.getTime() === gameDay.getTime();
  
  // Check if current date is the day after the game day
  const isDayAfter = currentDay.getTime() === nextDay.getTime();
  
  return isGameDay || isDayAfter;
}

