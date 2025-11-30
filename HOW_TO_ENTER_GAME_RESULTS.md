# How to Enter Game Results

## Overview
Admins can enter game scores after a game has been completed. The scores are used to calculate league standings (points, wins, draws, losses).

## When Can You Enter Scores?
The "Enter Score" button becomes available:
- **After the game time has passed** (at least 2 hours after the scheduled game time)
- **On the game day** (until midnight)
- **On the day after the game** (until midnight)
- **Only if teams have been generated** (at least 2 teams must exist)

## How to Enter Scores

### Step 1: Navigate to the Game Complete Panel
1. After a game is played, the **Game Complete** panel will appear at the top of the app
2. This panel shows when:
   - At least 2 hours have passed since the game time
   - You're viewing on the game day or the day after

### Step 2: Click "Enter Score" Button
1. In the Game Complete panel, you'll see 4 action buttons:
   - **Man of the Match** (Yellow)
   - **Give Kudos** (Pink)
   - **Rate Players** (Orange)
   - **Enter Score** (Green) ← Click this one
2. The "Enter Score" button is only visible to **admins** when teams have been generated

### Step 3: Fill Out the Score Input Form
1. A modal will open with the following fields:
   - **Game Date**: Automatically filled with the game date
   - **Team 1**: Select the first team from the dropdown
   - **Team 1 Score**: Enter the number of goals scored by Team 1
   - **Team 2**: Select the second team from the dropdown
   - **Team 2 Score**: Enter the number of goals scored by Team 2

2. Make sure:
   - You select two **different** teams
   - Scores are **non-negative numbers** (0 or higher)
   - You're entering the correct teams for this game date

### Step 4: Save the Result
1. Click the **"Save Game Result"** button
2. The system will:
   - Check if a score already exists for these teams on this date (prevents duplicates)
   - Save the game result to Firestore
   - Automatically update the league table

### Step 5: View Updated League Table
1. Navigate to the **Leaderboard** tab
2. The **League Table** is displayed at the top, showing:
   - Team positions (ranked by points)
   - Games Played (P)
   - Wins (W)
   - Draws (D)
   - Losses (L)
   - Total Points (Pts)

## League Points System
- **Win**: 3 points
- **Draw**: 1 point (for both teams)
- **Loss**: 0 points

## Notes
- Only **one score entry** per game date is allowed (duplicate prevention)
- The league table updates automatically after saving a score
- Teams are sorted by:
  1. Total Points (descending)
  2. Number of Wins (if points are tied)
  3. Goal Difference (if points and wins are tied)
  4. Alphabetical order (if all above are tied)

## Troubleshooting
- **"Enter Score" button not visible?**
  - Make sure you're logged in as an admin
  - Check that teams have been generated (at least 2 teams)
  - Verify the game time has passed (2+ hours after game time)
  - Ensure you're viewing on the game day or the day after

- **Can't submit score?**
  - Verify you selected two different teams
  - Check that scores are valid numbers (0 or higher)
  - Make sure a score hasn't already been entered for these teams on this date

- **League table not updating?**
  - Refresh the page
  - Check that the score was saved successfully (no error messages)
  - Verify the score was entered for the correct game date

