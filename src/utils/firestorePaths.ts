/**
 * Centralized Firestore path utilities
 * This prevents code duplication and makes it easier to maintain paths
 */

declare const __app_id: string;

/**
 * Get the app ID with fallback
 */
export function getAppId(): string {
  return typeof __app_id !== "undefined" ? __app_id : "default-app-id";
}

/**
 * Get base path for all app data
 */
export function getBasePath(): string {
  return `artifacts/${getAppId()}/public/data`;
}

/**
 * Firestore collection/document paths
 */
export const FirestorePaths = {
  players: () => `${getBasePath()}/soccer_players`,
  playerPoints: () => `${getBasePath()}/playerPoints`,
  teams: () => `${getBasePath()}/teams/current`,
  gameSchedule: () => `${getBasePath()}/gameSchedule/config`,
  users: () => `${getBasePath()}/users`,
  notifications: () => `${getBasePath()}/notifications`,
  userNotifications: () => `${getBasePath()}/userNotifications`,
  kudos: () => `${getBasePath()}/kudos`,
  motm: () => `${getBasePath()}/manOfTheMatch`,
  motmAwards: () => `${getBasePath()}/motmAwards`,
  goalsAssistsSubmissions: () => `${getBasePath()}/goalsAssistsSubmissions`,
  questions: () => `${getBasePath()}/questions`,
  completedGames: () => `${getBasePath()}/completedGames/status`,
  gameResults: () => `${getBasePath()}/gameResults`,
  teamAssignments: () => `${getBasePath()}/teamAssignments/current`,
} as const;

