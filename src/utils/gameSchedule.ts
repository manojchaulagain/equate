/**
 * Utility functions for calculating next game date/time from schedule
 */

export interface GameSchedule {
  schedule: { [day: number]: string }; // Map of day (0-6) to time string (HH:MM)
  location?: { [day: number]: string }; // Map of day (0-6) to location string
}

/**
 * Get today's game info if today is a game day
 */
export function getTodayGame(schedule: GameSchedule | null): { date: Date; formatted: string; dayOfWeek: number } | null {
  if (!schedule || !schedule.schedule || Object.keys(schedule.schedule).length === 0) {
    return null;
  }

  const now = new Date();
  const scheduleMap = schedule.schedule;
  const today = now.getDay();
  
  if (scheduleMap[today]) {
    const [hours, minutes] = scheduleMap[today].split(':').map(Number);
    const todayGameTime = new Date(now);
    todayGameTime.setHours(hours, minutes, 0, 0);
    
    return {
      date: todayGameTime,
      formatted: formatGameDateTime(todayGameTime),
      dayOfWeek: today,
    };
  }
  
  return null;
}

/**
 * Calculate the next game date and time based on the schedule
 * This returns the next game from tomorrow onwards (not today)
 */
export function calculateNextGame(schedule: GameSchedule | null): { date: Date; formatted: string; dayOfWeek?: number } | null {
  if (!schedule || !schedule.schedule || Object.keys(schedule.schedule).length === 0) {
    return null;
  }

  const now = new Date();
  const scheduleMap = schedule.schedule;
  
  // Get today's day of week (0 = Sunday, 6 = Saturday)
  const today = now.getDay();
  
  // Check if there's a game today
  if (scheduleMap[today]) {
    const [hours, minutes] = scheduleMap[today].split(':').map(Number);
    const todayGameTime = new Date(now);
    todayGameTime.setHours(hours, minutes, 0, 0);
    
    // If game time hasn't passed yet, show it as next game
    if (todayGameTime > now) {
      return {
        date: todayGameTime,
        formatted: formatGameDateTime(todayGameTime),
        dayOfWeek: today,
      };
    }
    // If game time has passed today, don't show next game until tomorrow
    // Return null so next game only shows from tomorrow
    return null;
  }
  
  // Look for the next game day in the current week
  let nextGameDate: Date | null = null;
  let nextGameDay: number | null = null;
  let minDaysUntil = Infinity;
  
  for (let i = 1; i <= 7; i++) {
    const checkDay = (today + i) % 7;
    if (scheduleMap[checkDay]) {
      const [hours, minutes] = scheduleMap[checkDay].split(':').map(Number);
      const gameDate = new Date(now);
      gameDate.setDate(now.getDate() + i);
      gameDate.setHours(hours, minutes, 0, 0);
      
      if (i < minDaysUntil) {
        minDaysUntil = i;
        nextGameDate = gameDate;
        nextGameDay = checkDay;
      }
    }
  }
  
  // If no game found in next 7 days, find the earliest day in the schedule
  if (!nextGameDate) {
    const sortedDays = Object.keys(scheduleMap).map(Number).sort((a, b) => a - b);
    if (sortedDays.length > 0) {
      const earliestDay = sortedDays[0];
      const daysUntil = earliestDay >= today 
        ? earliestDay - today 
        : 7 - today + earliestDay;
      
      const [hours, minutes] = scheduleMap[earliestDay].split(':').map(Number);
      nextGameDate = new Date(now);
      nextGameDate.setDate(now.getDate() + daysUntil);
      nextGameDate.setHours(hours, minutes, 0, 0);
      nextGameDay = earliestDay;
    }
  }
  
  if (!nextGameDate) {
    return null;
  }
  
  return {
    date: nextGameDate,
    formatted: formatGameDateTime(nextGameDate),
    dayOfWeek: nextGameDay ?? undefined,
  };
}

/**
 * Format game date and time for display
 */
function formatGameDateTime(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  let dateStr = '';
  if (isToday) {
    dateStr = 'Today';
  } else if (isTomorrow) {
    dateStr = 'Tomorrow';
  } else {
    const dayName = dayNames[date.getDay()];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    dateStr = `${dayName}, ${month} ${day}`;
  }
  
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  return `${dateStr} at ${timeStr}`;
}

