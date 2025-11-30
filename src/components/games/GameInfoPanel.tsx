import React, { useState, useEffect } from "react";
import { Calendar, MapPin, CheckCircle2, Trophy, Star, Heart, Award, ArrowRight } from "lucide-react";
import { calculateNextGame, getTodayGame } from "../../utils/gameSchedule";
import { useGameSchedule } from "../../hooks/useGameSchedule";
import { isSameDay, isOnGameDayOrDayAfter } from "../../utils/dateHelpers";

interface GameInfoPanelProps {
  db: any;
  onNavigateToLeaderboard?: () => void;
  onOpenMOTM?: () => void;
  onOpenKudos?: () => void;
  onOpenPoints?: () => void;
}

const GameInfoPanel: React.FC<GameInfoPanelProps> = ({
  db,
  onNavigateToLeaderboard,
  onOpenMOTM,
  onOpenKudos,
  onOpenPoints,
}) => {
  // Use shared hook for game schedule
  const gameSchedule = useGameSchedule(db);
  
  const [nextGame, setNextGame] = useState<{ date: Date; formatted: string; dayOfWeek?: number } | null>(null);
  const [todayGame, setTodayGame] = useState<{ date: Date; formatted: string; dayOfWeek: number } | null>(null);
  const [fieldLocation, setFieldLocation] = useState<string | null>(null);
  const [gamePlayed, setGamePlayed] = useState(false);
  const [showGameCompletePanel, setShowGameCompletePanel] = useState(false);

  // Update game played status and today's game every minute
  useEffect(() => {
    if (!gameSchedule) return;

    const checkGameStatus = () => {
      const now = new Date();
      
      // Get today's game info (if today is a game day)
      const today = getTodayGame(gameSchedule);
      
      // Check for yesterday's game (if yesterday was a game day)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDayOfWeek = yesterday.getDay();
      let yesterdayGame = null;
      if (gameSchedule.schedule && gameSchedule.schedule[yesterdayDayOfWeek]) {
        const [hours, minutes] = gameSchedule.schedule[yesterdayDayOfWeek].split(':').map(Number);
        const yesterdayGameTime = new Date(yesterday);
        yesterdayGameTime.setHours(hours, minutes, 0, 0);
        
        // Format yesterday's game date string
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayName = dayNames[yesterdayGameTime.getDay()];
        const month = monthNames[yesterdayGameTime.getMonth()];
        const day = yesterdayGameTime.getDate();
        const timeStr = yesterdayGameTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        yesterdayGame = {
          date: yesterdayGameTime,
          formatted: `${dayName}, ${month} ${day} at ${timeStr}`,
          dayOfWeek: yesterdayDayOfWeek,
        };
      }
      
      // Determine which game to show
      let validTodayGame = null;
      
      // Check if today is a game day - show until midnight of next day
      if (today) {
        const gameTime = new Date(today.date);
        if (isOnGameDayOrDayAfter(gameTime, now)) {
          validTodayGame = today;
        }
      }
      
      // If no valid today game, check if yesterday was a game day
      // If we're on the day after a game, show yesterday's game
      if (!validTodayGame && yesterdayGame) {
        const yesterdayGameTime = new Date(yesterdayGame.date);
        if (isOnGameDayOrDayAfter(yesterdayGameTime, now)) {
          validTodayGame = yesterdayGame;
        }
      }
      
      setTodayGame(validTodayGame);
      
      // Calculate next game - only show if we're past the day after any game day
      let next = null;
      if (!validTodayGame) {
        // Only show next game if we're not showing today's or yesterday's game
        next = calculateNextGame(gameSchedule);
      } else {
        // Don't show next game if we're still showing today's or yesterday's game
        // Check if we're past the day after the game day (2 days after the game)
        const gameTimeToCheck = new Date(validTodayGame.date);
        const twoDaysAfter = new Date(gameTimeToCheck);
        twoDaysAfter.setDate(gameTimeToCheck.getDate() + 2);
        twoDaysAfter.setHours(0, 0, 0, 0);
        
        const currentDay = new Date(now);
        currentDay.setHours(0, 0, 0, 0);
        
        // Only show next game if we're past the day after the game (i.e., 2+ days after)
        if (currentDay.getTime() >= twoDaysAfter.getTime()) {
          next = calculateNextGame(gameSchedule);
        }
      }
      
      setNextGame(next);
      
      // Check if game was played (2 hours after game time) and we're on game day or day after
      if (validTodayGame) {
        const gameTime = new Date(validTodayGame.date);
        const twoHoursAfterGame = new Date(gameTime.getTime() + 2 * 60 * 60 * 1000);
        
        // Check if it's been 2 hours since game time
        const hasBeenTwoHours = now.getTime() >= twoHoursAfterGame.getTime();
        
        // Show panel if 2 hours have passed AND we're on the game day or the day after
        const shouldShow = hasBeenTwoHours && isOnGameDayOrDayAfter(gameTime, now);
        setGamePlayed(shouldShow);
        setShowGameCompletePanel(shouldShow);
      } else {
        setGamePlayed(false);
        setShowGameCompletePanel(false);
      }
      
      // Update location based on which game is showing
      const gameToShow = validTodayGame || next;
      if (gameToShow && typeof gameToShow.dayOfWeek === 'number' && gameSchedule.location && gameSchedule.location[gameToShow.dayOfWeek]) {
        setFieldLocation(gameSchedule.location[gameToShow.dayOfWeek]);
      } else {
        setFieldLocation(null);
      }
    };

    // Check immediately
    checkGameStatus();

    // Check every minute to update when day changes at midnight
    const interval = setInterval(checkGameStatus, 60 * 1000);

    return () => clearInterval(interval);
  }, [gameSchedule]);

  // Don't render if no game scheduled
  if (!todayGame && !nextGame) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-3 md:px-4 mb-4">
      <div className={`w-full rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl backdrop-blur-sm relative overflow-hidden transition-all duration-300 ${
        showGameCompletePanel
          ? "bg-gradient-to-br from-amber-50/95 via-yellow-50/95 to-orange-50/95 border-2 border-amber-300/70 shadow-amber-200/20"
          : (gamePlayed && todayGame)
            ? "bg-gradient-to-br from-emerald-50/95 via-green-50/95 to-teal-50/95 border-2 border-emerald-300/70 shadow-emerald-200/20"
            : "bg-gradient-to-br from-indigo-100/95 via-purple-100/95 to-pink-100/95 border-2 border-indigo-300/70 shadow-indigo-200/20"
      }`}>
        <div className={`absolute inset-0 ${
          showGameCompletePanel
            ? "bg-gradient-to-r from-amber-500/5 via-yellow-500/5 to-orange-500/5"
            : (gamePlayed && todayGame)
              ? "bg-gradient-to-r from-emerald-500/5 via-green-500/5 to-teal-500/5"
              : "bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5"
        }`}></div>
        
        {/* Game Info Section */}
        <div className="relative z-10 p-5 sm:p-6 md:p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5 lg:gap-8">
            {/* Left side - Game info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className={`p-4 sm:p-5 rounded-2xl shadow-xl flex-shrink-0 relative transition-transform hover:scale-110 ${
                showGameCompletePanel
                  ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30"
                  : (gamePlayed && todayGame)
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30"
                    : "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30"
              }`}>
                {showGameCompletePanel ? (
                  <Trophy className="text-white" size={28} />
                ) : (gamePlayed && todayGame) ? (
                  <CheckCircle2 className="text-white" size={28} />
                ) : (
                  <Calendar className="text-white" size={28} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm sm:text-base font-bold uppercase tracking-wide mb-2 flex flex-wrap items-center gap-2 ${
                  showGameCompletePanel ? "text-amber-700" : (gamePlayed && todayGame) ? "text-emerald-700" : "text-slate-700"
                }`}>
                  <span>{showGameCompletePanel ? "Game Complete!" : todayGame ? "Today's Game" : "Next Game"}</span>
                  {(gamePlayed && todayGame && !showGameCompletePanel) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold shadow-sm">
                      <CheckCircle2 size={12} />
                      Played
                    </span>
                  )}
                </p>
                <p className={`text-lg sm:text-xl md:text-2xl font-bold break-words ${
                  showGameCompletePanel
                    ? "bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent"
                    : (gamePlayed && todayGame)
                      ? "bg-gradient-to-r from-emerald-700 via-green-700 to-teal-700 bg-clip-text text-transparent"
                      : "bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 bg-clip-text text-transparent"
                }`}>
                  {(todayGame || nextGame)?.formatted}
                </p>
                {showGameCompletePanel && (
                  <p className="text-sm sm:text-base text-slate-600 mt-2 font-medium">
                    Share your thoughts about today's game
                  </p>
                )}
              </div>
            </div>
            
            {/* Right side - Location */}
            {fieldLocation && (
              <div className="flex items-center gap-4 lg:pl-8 lg:border-l-2 border-indigo-300/50 lg:min-w-[220px]">
                <div className={`p-4 sm:p-5 rounded-2xl shadow-xl flex-shrink-0 transition-transform hover:scale-110 ${
                  showGameCompletePanel
                    ? "bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-500/30"
                    : "bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/30"
                }`}>
                  <MapPin className="text-white" size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Location
                  </p>
                  <p className={`text-lg sm:text-xl font-bold break-words ${
                    showGameCompletePanel
                      ? "bg-gradient-to-r from-orange-700 via-red-700 to-rose-700 bg-clip-text text-transparent"
                      : "bg-gradient-to-r from-purple-700 via-pink-700 to-rose-700 bg-clip-text text-transparent"
                  }`}>
                    {fieldLocation}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Game Complete Actions Section - Only show if game is played */}
        {showGameCompletePanel && todayGame && (
          <div className="relative z-10 px-5 sm:px-6 md:px-8 pb-5 sm:pb-6 md:pb-8 pt-0 border-t-2 border-amber-200/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {onOpenMOTM && (
                <button
                  onClick={onOpenMOTM}
                  className="group flex items-center justify-between p-5 bg-white/90 hover:bg-white border-2 border-amber-200/60 hover:border-amber-400 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Star className="text-white" size={22} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-800 mb-1">Man of the Match</p>
                      <p className="text-sm text-slate-600">Nominate the best player</p>
                    </div>
                  </div>
                  <ArrowRight className="text-amber-600 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-3" size={20} />
                </button>
              )}

              {onOpenKudos && (
                <button
                  onClick={onOpenKudos}
                  className="group flex items-center justify-between p-5 bg-white/90 hover:bg-white border-2 border-amber-200/60 hover:border-amber-400 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Heart className="text-white" size={22} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-800 mb-1">Give Kudos</p>
                      <p className="text-sm text-slate-600">Appreciate teammates</p>
                    </div>
                  </div>
                  <ArrowRight className="text-amber-600 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-3" size={20} />
                </button>
              )}

              {onOpenPoints && (
                <button
                  onClick={onOpenPoints}
                  className="group flex items-center justify-between p-5 bg-white/90 hover:bg-white border-2 border-amber-200/60 hover:border-amber-400 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Award className="text-white" size={22} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-800 mb-1">Rate Players</p>
                      <p className="text-sm text-slate-600">Add performance points</p>
                    </div>
                  </div>
                  <ArrowRight className="text-amber-600 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-3" size={20} />
                </button>
              )}
            </div>
            
            {/* View Leaderboard Button */}
            {onNavigateToLeaderboard && (
              <div className="pt-5 border-t-2 border-amber-200/50">
                <button
                  onClick={onNavigateToLeaderboard}
                  className="w-full md:w-auto md:max-w-md mx-auto md:mx-0 flex items-center justify-center gap-3 px-6 py-3.5 text-lg font-bold text-white bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-700 hover:via-orange-700 hover:to-red-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Trophy className="w-6 h-6" />
                  <span>View Leaderboard</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameInfoPanel;

