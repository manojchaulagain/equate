# Team Names and Enter Score Button Fix

## Changes Made

### 1. Team Names - Now "Red Team" and "Blue Team"
- Updated `src/App.tsx` to explicitly name teams as "Red Team" and "Blue Team" when 2 teams are generated
- When you generate teams, the first team will always be named "Red Team" and the second will be "Blue Team"

### 2. Enter Score Button Visibility

The "Enter Score" button will appear in the **Game Complete** panel when ALL of the following conditions are met:

#### Required Conditions:
1. ✅ **User is an admin** (`userRole === "admin"`)
2. ✅ **Teams have been generated** (at least 2 teams exist with `name` property)
3. ✅ **Game Complete panel is visible** (this panel appears when):
   - A game has been scheduled for today or yesterday
   - At least 2 hours have passed since the game time
   - You're viewing on the game day or the day after the game

#### Where to Find the Button:
- The button appears in the **Game Complete** panel at the top of the app (above the tabs)
- It's the 4th button in the actions grid:
  1. Man of the Match (Yellow)
  2. Give Kudos (Pink)
  3. Rate Players (Orange)
  4. **Enter Score (Green)** ← This one

#### Troubleshooting:

**If you don't see the "Enter Score" button:**

1. **Check if Game Complete panel is showing:**
   - The panel should show "Game Complete!" with an amber/yellow background
   - If you see "Today's Game" or "Next Game" instead, the Game Complete panel hasn't appeared yet
   - Wait until at least 2 hours after the game time has passed

2. **Check if teams are generated:**
   - Go to the Teams tab to verify teams exist
   - Teams should be named "Red Team" and "Blue Team"
   - At least 2 teams must exist

3. **Check if you're logged in as admin:**
   - Verify your user role is "admin" in the system
   - Check your profile or admin settings

4. **Check the browser console:**
   - Open browser DevTools (F12)
   - Look for any errors related to teams or GameInfoPanel

#### Testing the Button:

To test the Enter Score button:

1. **As an admin**, generate teams (go to Availability tab → Generate Teams)
2. **Ensure a game is scheduled** for today in the game schedule (Admin tab)
3. **Wait until 2+ hours after the game time** OR manually adjust the game time to be in the past
4. The Game Complete panel should appear at the top
5. The green "Enter Score" button should be visible in the actions grid

#### Debug Information:

If the button still doesn't appear, check these values in the browser console:

```javascript
// Check teams
console.log('Teams:', teams);
console.log('Teams length:', teams?.length);
console.log('Team names:', teams?.map(t => t.name));

// Check user role
console.log('User role:', userRole);
console.log('Is admin:', userRole === 'admin');

// Check game status
console.log('Game schedule:', gameSchedule);
console.log('Today game:', todayGame);
console.log('Show Game Complete Panel:', showGameCompletePanel);
```

## Files Modified:

1. `src/App.tsx` - Updated team name generation to use "Red Team" and "Blue Team"
2. `src/components/games/GameInfoPanel.tsx` - Added Array.isArray check for teams

## Next Steps:

1. Generate new teams to see the "Red Team" and "Blue Team" names
2. Wait for a game to complete (or adjust game schedule for testing)
3. Verify the Enter Score button appears in the Game Complete panel

