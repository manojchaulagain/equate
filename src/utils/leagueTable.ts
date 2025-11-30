/**
 * League table utilities - calculate standings from game results
 */

import { GameResult, TeamStanding } from "../types/league";

/**
 * Calculate league standings from game results
 * Points: Win = 3, Draw = 1, Loss = 0
 */
export function calculateStandings(gameResults: GameResult[]): TeamStanding[] {
  const standingsMap = new Map<string, TeamStanding>();

  // Initialize all teams
  gameResults.forEach((result) => {
    if (!standingsMap.has(result.team1Name)) {
      standingsMap.set(result.team1Name, {
        teamName: result.team1Name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
      });
    }
    if (!standingsMap.has(result.team2Name)) {
      standingsMap.set(result.team2Name, {
        teamName: result.team2Name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
      });
    }
  });

  // Process each game result
  gameResults.forEach((result) => {
    const team1Standing = standingsMap.get(result.team1Name)!;
    const team2Standing = standingsMap.get(result.team2Name)!;

    // Increment games played for both teams
    team1Standing.played++;
    team2Standing.played++;

    // Determine result
    if (result.team1Score > result.team2Score) {
      // Team 1 wins
      team1Standing.won++;
      team1Standing.points += 3;
      team2Standing.lost++;
    } else if (result.team2Score > result.team1Score) {
      // Team 2 wins
      team2Standing.won++;
      team2Standing.points += 3;
      team1Standing.lost++;
    } else {
      // Draw
      team1Standing.drawn++;
      team1Standing.points += 1;
      team2Standing.drawn++;
      team2Standing.points += 1;
    }
  });

  // Convert to array and sort by points (descending), then by wins, then by goal difference
  const standings = Array.from(standingsMap.values());
  standings.sort((a, b) => {
    // Primary sort: points
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    // Secondary sort: wins
    if (b.won !== a.won) {
      return b.won - a.won;
    }
    // Tertiary sort: goal difference (need to calculate from results)
    const aGoalDiff = calculateGoalDifference(a.teamName, gameResults);
    const bGoalDiff = calculateGoalDifference(b.teamName, gameResults);
    if (bGoalDiff !== aGoalDiff) {
      return bGoalDiff - aGoalDiff;
    }
    // If still tied, sort alphabetically
    return a.teamName.localeCompare(b.teamName);
  });

  return standings;
}

/**
 * Calculate goal difference for a team
 */
function calculateGoalDifference(teamName: string, gameResults: GameResult[]): number {
  let goalsFor = 0;
  let goalsAgainst = 0;

  gameResults.forEach((result) => {
    if (result.team1Name === teamName) {
      goalsFor += result.team1Score;
      goalsAgainst += result.team2Score;
    } else if (result.team2Name === teamName) {
      goalsFor += result.team2Score;
      goalsAgainst += result.team1Score;
    }
  });

  return goalsFor - goalsAgainst;
}

