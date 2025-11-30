/**
 * League table types and interfaces
 */

export interface GameResult {
  id: string;
  gameDate: string; // YYYY-MM-DD format
  team1Name: string;
  team1Score: number;
  team2Name: string;
  team2Score: number;
  createdAt: any; // Firestore Timestamp
}

export interface TeamStanding {
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
}

