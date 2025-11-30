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

