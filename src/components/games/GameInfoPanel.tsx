import React, { useState, useEffect } from "react";
import { Calendar, MapPin, CheckCircle2, Trophy, Star, Heart, Award, ArrowRight, Target, X, Send } from "lucide-react";
import { calculateNextGame, getTodayGame } from "../../utils/gameSchedule";
import { useGameSchedule } from "../../hooks/useGameSchedule";
import { isOnGameDayOrDayAfter } from "../../utils/dateHelpers";
import { Team, PlayerAvailability } from "../../types/player";
import GameScoreInput from "./GameScoreInput";
import { collection, addDoc, doc, getDoc, setDoc, Timestamp, getDocs } from "firebase/firestore";
import { FirestorePaths } from "../../utils/firestorePaths";
import { getTodayGameDateString, canSubmitGoalsAssists, getGameDateStringForSubmission } from "../../utils/gamePoints";

interface GameInfoPanelProps {
  db: any;
  teams?: Team[];
  userRole?: string;
  userId?: string;
  userEmail?: string;
  players?: PlayerAvailability[];
  onNavigateToLeaderboard?: () => void;
}

const GameInfoPanel: React.FC<GameInfoPanelProps> = ({
  db,
  teams = [],
  userRole = "user",
  userId = "",
  userEmail = "",
  players = [],
  onNavigateToLeaderboard,
}) => {
  // Use shared hook for game schedule
  const gameSchedule = useGameSchedule(db);
  
  const [nextGame, setNextGame] = useState<{ date: Date; formatted: string; dayOfWeek?: number } | null>(null);
  const [todayGame, setTodayGame] = useState<{ date: Date; formatted: string; dayOfWeek: number } | null>(null);
  const [fieldLocation, setFieldLocation] = useState<string | null>(null);
  const [gamePlayed, setGamePlayed] = useState(false);
  const [showGameCompletePanel, setShowGameCompletePanel] = useState(false);
  const [showScoreInput, setShowScoreInput] = useState(false);
  
  // Modal states
  const [showMOTMModal, setShowMOTMModal] = useState(false);
  const [showKudosModal, setShowKudosModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showGoalsAssistsModal, setShowGoalsAssistsModal] = useState(false);
  
  // MOTM modal state
  const [motmSelectedPlayer, setMotmSelectedPlayer] = useState<string>("");
  const [motmReason, setMotmReason] = useState<string>("");
  const [motmError, setMotmError] = useState<string | null>(null);
  const [motmSubmitting, setMotmSubmitting] = useState(false);
  const [motmSuccess, setMotmSuccess] = useState<string | null>(null);
  
  // Kudos modal state
  const [kudosSelectedPlayer, setKudosSelectedPlayer] = useState<string>("");
  const [kudosMessage, setKudosMessage] = useState<string>("");
  const [kudosError, setKudosError] = useState<string | null>(null);
  const [kudosSubmitting, setKudosSubmitting] = useState(false);
  
  // Points modal state
  const [pointsSelectedPlayer, setPointsSelectedPlayer] = useState<string>("");
  const [points, setPoints] = useState<string>("");
  const [pointsReason, setPointsReason] = useState<string>("");
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [pointsSubmitting, setPointsSubmitting] = useState(false);
  const [pointsSuccess, setPointsSuccess] = useState<string | null>(null);
  
  // Goals & Assists modal state
  const [goalsAssistsSelectedPlayer, setGoalsAssistsSelectedPlayer] = useState<string>("");
  const [goals, setGoals] = useState<string>("0");
  const [assists, setAssists] = useState<string>("0");
  const [goalsAssistsError, setGoalsAssistsError] = useState<string | null>(null);
  const [goalsAssistsSubmitting, setGoalsAssistsSubmitting] = useState(false);
  const [goalsAssistsSuccess, setGoalsAssistsSuccess] = useState<string | null>(null);
  
  const isAdmin = userRole === "admin";
  
  // Get available players for modals (MOTM, Kudos, Points - can't be self or registered)
  const getAvailablePlayers = () => {
    if (isAdmin) {
      return players;
    }
    return players.filter(
      (player) => player.userId !== userId && player.registeredBy !== userId
    );
  };
  
  const availablePlayers = getAvailablePlayers();
  
  // Get available players for Goals & Assists (can be self or registered players for regular users)
  const getAvailablePlayersForGoalsAssists = () => {
    if (isAdmin) {
      return players; // Admins can submit for all players
    }
    return players.filter(
      (player) => player.userId === userId || player.registeredBy === userId
    );
  };
  
  const availablePlayersForGoalsAssists = getAvailablePlayersForGoalsAssists();
  
  // Check if user can submit goals & assists
  const canSubmitGoalsAssistsToday = canSubmitGoalsAssists(gameSchedule?.schedule || null);
  const todayGameDateForSubmission = gameSchedule ? getGameDateStringForSubmission(gameSchedule.schedule) : null;

  // Debug logging for Enter Score button visibility
  useEffect(() => {
    if (showGameCompletePanel) {
      console.log('GameInfoPanel Debug - Enter Score Button:', {
        isAdmin,
        userRole,
        teams,
        teamsIsArray: Array.isArray(teams),
        teamsLength: teams?.length,
        teamsWithNames: teams?.filter(t => t?.name)?.map(t => t.name),
        showGameCompletePanel,
        todayGame,
      });
    }
  }, [showGameCompletePanel, isAdmin, userRole, teams, todayGame]);

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

  // Handle MOTM submission
  const handleMOTMSubmit = async () => {
    if (!motmSelectedPlayer) {
      setMotmError("Please select a player.");
      return;
    }

    if (!db || !userId || !userEmail) {
      setMotmError("Missing required information.");
      return;
    }

    setMotmError(null);
    setMotmSubmitting(true);

    try {
      const motmPath = FirestorePaths.motm();
      const motmRef = collection(db, motmPath);

      const player = players.find((p) => p.id === motmSelectedPlayer);
      if (!player) {
        throw new Error("Player not found");
      }

      const todayDateStr = getTodayGameDateString(gameSchedule?.schedule || null) || new Date().toDateString();

      await addDoc(motmRef, {
        gameDate: todayDateStr,
        nominatedPlayerId: motmSelectedPlayer,
        nominatedPlayerName: player.name,
        nominatedBy: userId,
        nominatedByEmail: userEmail,
        reason: motmReason.trim() || undefined,
        createdAt: Timestamp.now(),
      });

      // Create notification for the player who was nominated
      if (player.userId) {
        const notificationsPath = FirestorePaths.userNotifications();
        const notificationsRef = collection(db, notificationsPath);
        await addDoc(notificationsRef, {
          userId: player.userId,
          type: "motm",
          message: `${userEmail} nominated you for Man of the Match!`,
          fromUserEmail: userEmail,
          relatedPlayerId: motmSelectedPlayer,
          relatedPlayerName: player.name,
          createdAt: Timestamp.now(),
          read: false,
        });
      }

      setMotmSuccess("Nomination submitted successfully!");
      setMotmSelectedPlayer("");
      setMotmReason("");
      setShowMOTMModal(false);
      setTimeout(() => setMotmSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error submitting nomination:", err);
      setMotmError(`Failed to submit nomination: ${err.message}`);
    } finally {
      setMotmSubmitting(false);
    }
  };

  // Handle Kudos submission
  const handleKudosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kudosSelectedPlayer || !kudosMessage.trim()) {
      setKudosError("Please select a player and enter a message.");
      return;
    }

    if (!db || !userId || !userEmail) {
      setKudosError("Missing required information.");
      return;
    }

    setKudosError(null);
    setKudosSubmitting(true);

    try {
      const kudosPath = FirestorePaths.kudos();
      const kudosRef = collection(db, kudosPath);

      const player = players.find((p) => p.id === kudosSelectedPlayer);
      if (!player) {
        throw new Error("Player not found");
      }

      await addDoc(kudosRef, {
        fromUserId: userId,
        fromUserEmail: userEmail,
        toPlayerId: kudosSelectedPlayer,
        toPlayerName: player.name,
        message: kudosMessage.trim(),
        createdAt: Timestamp.now(),
      });

      // Create notification for the player who received kudos
      if (player.userId) {
        const notificationsPath = FirestorePaths.userNotifications();
        const notificationsRef = collection(db, notificationsPath);
        await addDoc(notificationsRef, {
          userId: player.userId,
          type: "kudos",
          message: `${userEmail} gave you kudos!`,
          fromUserEmail: userEmail,
          relatedPlayerId: kudosSelectedPlayer,
          relatedPlayerName: player.name,
          createdAt: Timestamp.now(),
          read: false,
        });
      }

      setKudosSelectedPlayer("");
      setKudosMessage("");
      setShowKudosModal(false);
      setKudosError(null);
    } catch (err: any) {
      console.error("Error submitting kudos:", err);
      setKudosError("Failed to submit kudos. Please try again.");
    } finally {
      setKudosSubmitting(false);
    }
  };

  // Handle Points submission
  const handlePointsSubmit = async () => {
    if (!pointsSelectedPlayer || !points || !pointsReason.trim()) {
      setPointsError("Please fill in all fields.");
      return;
    }

    if (!db || !userId || !userEmail) {
      setPointsError("Missing required information.");
      return;
    }

    const pointsNum = parseInt(points);
    if (isNaN(pointsNum) || pointsNum < 1 || pointsNum > 5) {
      setPointsError("Points must be between 1 and 5.");
      return;
    }

    setPointsError(null);
    setPointsSubmitting(true);

    try {
      const pointsPath = `${FirestorePaths.playerPoints()}/${pointsSelectedPlayer}`;
      const pointsRef = doc(db, pointsPath);

      const player = players.find((p) => p.id === pointsSelectedPlayer);
      if (!player) {
        throw new Error("Player not found");
      }

      const existingDoc = await getDoc(pointsRef);
      
      let existingPoints = 0;
      let existingHistory: any[] = [];

      if (existingDoc.exists()) {
        const data = existingDoc.data();
        existingPoints = data.totalPoints || 0;
        existingHistory = data.pointsHistory || [];
      }

      const todayDateStr = new Date().toDateString();
      const newTotal = existingPoints + pointsNum;
      const newHistoryEntry = {
        points: pointsNum,
        reason: pointsReason.trim(),
        addedBy: userEmail,
        addedAt: Timestamp.now(),
        matchDate: todayDateStr,
      };

      await setDoc(
        pointsRef,
        {
          playerId: pointsSelectedPlayer,
          playerName: player.name,
          totalPoints: newTotal,
          pointsHistory: [...existingHistory, newHistoryEntry],
        },
        { merge: false }
      );

      setPointsSuccess("Points added successfully!");
      setPointsSelectedPlayer("");
      setPoints("");
      setPointsReason("");
      setShowPointsModal(false);
      setTimeout(() => setPointsSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error adding points:", err);
      setPointsError(`Failed to add points: ${err.message}`);
    } finally {
      setPointsSubmitting(false);
    }
  };

  // Handle Goals & Assists submission
  const handleGoalsAssistsSubmit = async () => {
    if (!goalsAssistsSelectedPlayer || !todayGameDateForSubmission) {
      setGoalsAssistsError("Please select a player and ensure a game was played recently.");
      return;
    }

    const goalsNum = parseInt(goals);
    const assistsNum = parseInt(assists);

    if (isNaN(goalsNum) || goalsNum < 0) {
      setGoalsAssistsError("Goals must be a non-negative number.");
      return;
    }

    if (isNaN(assistsNum) || assistsNum < 0) {
      setGoalsAssistsError("Assists must be a non-negative number.");
      return;
    }

    if (goalsNum === 0 && assistsNum === 0) {
      setGoalsAssistsError("Please enter at least one goal or assist.");
      return;
    }

    setGoalsAssistsError(null);
    setGoalsAssistsSubmitting(true);

    try {
      const submissionsPath = FirestorePaths.goalsAssistsSubmissions();
      const submissionsRef = collection(db, submissionsPath);

      const player = players.find((p) => p.id === goalsAssistsSelectedPlayer);
      if (!player) {
        throw new Error("Player not found");
      }

      // Check if there's already a pending submission for this player and game date
      const allSnapshot = await getDocs(submissionsRef);
      const existing = allSnapshot.docs.find((doc) => {
        const data = doc.data();
        return (
          data.playerId === goalsAssistsSelectedPlayer &&
          data.gameDate === todayGameDateForSubmission &&
          data.status === "pending"
        );
      });

      if (existing) {
        setGoalsAssistsError("You have already submitted stats for this player for this game. Please wait for admin approval.");
        setGoalsAssistsSubmitting(false);
        return;
      }

      await addDoc(submissionsRef, {
        playerId: goalsAssistsSelectedPlayer,
        playerName: player.name,
        gameDate: todayGameDateForSubmission,
        goals: goalsNum,
        assists: assistsNum,
        submittedBy: userId,
        submittedByEmail: userEmail,
        status: "pending",
        createdAt: Timestamp.now(),
      });

      setGoalsAssistsSuccess("Stats submitted successfully! Waiting for admin approval.");
      setGoalsAssistsSelectedPlayer("");
      setGoals("0");
      setAssists("0");
      setShowGoalsAssistsModal(false);
      setTimeout(() => setGoalsAssistsSuccess(null), 5000);
    } catch (err: any) {
      console.error("Error submitting stats:", err);
      setGoalsAssistsError(`Failed to submit stats: ${err.message}`);
    } finally {
      setGoalsAssistsSubmitting(false);
    }
  };

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
          <div className="relative z-10 px-5 sm:px-6 md:px-8 pb-5 sm:pb-6 md:pb-8 pt-6 border-t-2 border-amber-200/50">
            {/* Section Header */}
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full"></div>
                <span>Post-Game Actions</span>
              </h3>
              <p className="text-sm text-slate-600 ml-4">Celebrate achievements and record game statistics</p>
            </div>

            {/* Action Buttons Grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4 lg:gap-6 mb-8`}>
              {/* Man of the Match */}
              <button
                onClick={() => setShowMOTMModal(true)}
                className="group relative overflow-hidden flex flex-col items-center justify-center p-6 lg:p-8 bg-gradient-to-br from-white via-amber-50/30 to-yellow-50/40 hover:from-white hover:via-amber-50/50 hover:to-yellow-50/60 border-2 border-yellow-200/60 hover:border-yellow-400/80 rounded-3xl shadow-lg hover:shadow-2xl hover:shadow-yellow-500/20 transition-all duration-300 transform hover:scale-[1.03] hover:-translate-y-1 active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"></div>
                <div className="relative z-10 w-full">
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-4 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Star className="text-white" size={28} />
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-2 text-center">Man of the Match</h4>
                  <p className="text-sm text-slate-600 text-center mb-4">Nominate the best player</p>
                  <div className="flex items-center justify-center gap-2 text-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-sm font-semibold">Nominate</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {/* Give Kudos */}
              <button
                onClick={() => setShowKudosModal(true)}
                className="group relative overflow-hidden flex flex-col items-center justify-center p-6 lg:p-8 bg-gradient-to-br from-white via-pink-50/30 to-rose-50/40 hover:from-white hover:via-pink-50/50 hover:to-rose-50/60 border-2 border-pink-200/60 hover:border-pink-400/80 rounded-3xl shadow-lg hover:shadow-2xl hover:shadow-pink-500/20 transition-all duration-300 transform hover:scale-[1.03] hover:-translate-y-1 active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"></div>
                <div className="relative z-10 w-full">
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-4 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Heart className="text-white" size={28} />
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-2 text-center">Give Kudos</h4>
                  <p className="text-sm text-slate-600 text-center mb-4">Appreciate teammates</p>
                  <div className="flex items-center justify-center gap-2 text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-sm font-semibold">Appreciate</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {/* Rate Players */}
              <button
                onClick={() => setShowPointsModal(true)}
                className="group relative overflow-hidden flex flex-col items-center justify-center p-6 lg:p-8 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/40 hover:from-white hover:via-amber-50/50 hover:to-orange-50/60 border-2 border-amber-200/60 hover:border-amber-400/80 rounded-3xl shadow-lg hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300 transform hover:scale-[1.03] hover:-translate-y-1 active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"></div>
                <div className="relative z-10 w-full">
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Award className="text-white" size={28} />
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-2 text-center">Rate Players</h4>
                  <p className="text-sm text-slate-600 text-center mb-4">Add performance points</p>
                  <div className="flex items-center justify-center gap-2 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-sm font-semibold">Rate</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {/* Goals & Assists */}
              <button
                onClick={() => {
                  if (!canSubmitGoalsAssistsToday || availablePlayersForGoalsAssists.length === 0) {
                    return;
                  }
                  setShowGoalsAssistsModal(true);
                }}
                disabled={!canSubmitGoalsAssistsToday || availablePlayersForGoalsAssists.length === 0}
                className={`group relative overflow-hidden flex flex-col items-center justify-center p-6 lg:p-8 border-2 rounded-3xl shadow-lg transition-all duration-300 transform ${
                  canSubmitGoalsAssistsToday && availablePlayersForGoalsAssists.length > 0
                    ? 'bg-gradient-to-br from-white via-emerald-50/30 to-green-50/40 hover:from-white hover:via-emerald-50/50 hover:to-green-50/60 border-emerald-200/60 hover:border-emerald-400/80 hover:shadow-2xl hover:shadow-emerald-500/20 hover:scale-[1.03] hover:-translate-y-1 active:scale-[0.98] cursor-pointer'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200/60 opacity-60 cursor-not-allowed'
                }`}
              >
                {canSubmitGoalsAssistsToday && availablePlayersForGoalsAssists.length > 0 && (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"></div>
                )}
                <div className="relative z-10 w-full">
                  <div className="flex items-center justify-center mb-4">
                    <div className={`p-4 rounded-2xl shadow-xl transition-all duration-300 ${
                      canSubmitGoalsAssistsToday && availablePlayersForGoalsAssists.length > 0
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 group-hover:scale-110 group-hover:rotate-3'
                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                    }`}>
                      <Target className="text-white" size={28} />
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-2 text-center">Goals & Assists</h4>
                  <p className="text-sm text-slate-600 text-center mb-4">
                    {!canSubmitGoalsAssistsToday
                      ? "Available after game"
                      : availablePlayersForGoalsAssists.length === 0
                      ? "No players available"
                      : "Submit player stats"}
                  </p>
                  {canSubmitGoalsAssistsToday && availablePlayersForGoalsAssists.length > 0 && (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-sm font-semibold">Submit</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </button>

              {/* Enter Score - Admin Only */}
              {isAdmin && (
                <button
                  onClick={() => {
                    if (!Array.isArray(teams) || teams.length < 2 || !teams.every(t => t?.name)) {
                      alert('Please generate teams first. You need at least 2 teams with names to enter scores.');
                      return;
                    }
                    setShowScoreInput(true);
                  }}
                  disabled={!Array.isArray(teams) || teams.length < 2 || !teams.every(t => t?.name)}
                  className={`group relative overflow-hidden flex flex-col items-center justify-center p-6 lg:p-8 border-2 rounded-3xl shadow-lg transition-all duration-300 transform ${
                    Array.isArray(teams) && teams.length >= 2 && teams.every(t => t?.name)
                      ? 'bg-gradient-to-br from-white via-green-50/30 to-emerald-50/40 hover:from-white hover:via-green-50/50 hover:to-emerald-50/60 border-green-200/60 hover:border-green-400/80 hover:shadow-2xl hover:shadow-green-500/20 hover:scale-[1.03] hover:-translate-y-1 active:scale-[0.98] cursor-pointer'
                      : 'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200/60 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {Array.isArray(teams) && teams.length >= 2 && teams.every(t => t?.name) && (
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"></div>
                  )}
                  <div className="relative z-10 w-full">
                    <div className="flex items-center justify-center mb-4">
                      <div className={`p-4 rounded-2xl shadow-xl transition-all duration-300 ${
                        Array.isArray(teams) && teams.length >= 2 && teams.every(t => t?.name)
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 group-hover:scale-110 group-hover:rotate-3'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                      <Target className="text-white" size={28} />
                      </div>
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 mb-2 text-center">Enter Score</h4>
                    <p className="text-sm text-slate-600 text-center mb-4">
                      {!Array.isArray(teams) || teams.length < 2
                        ? "Generate teams first"
                        : !teams.every(t => t?.name)
                        ? "Teams need names"
                        : "Record game result"}
                    </p>
                    {Array.isArray(teams) && teams.length >= 2 && teams.every(t => t?.name) && (
                      <div className="flex items-center justify-center gap-2 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-sm font-semibold">Enter</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </button>
              )}
            </div>
            
            {/* View Statistics Button */}
            {onNavigateToLeaderboard && (
              <div className="pt-6 border-t-2 border-amber-200/50">
                <button
                  onClick={onNavigateToLeaderboard}
                  className="w-full md:w-auto md:max-w-md mx-auto md:mx-0 flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-700 hover:via-orange-700 hover:to-red-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-amber-500/30 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Trophy className="w-6 h-6" />
                  <span>View Statistics</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* MOTM Nomination Modal */}
      {showMOTMModal && todayGame && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMOTMModal(false);
              setMotmError(null);
              setMotmSelectedPlayer("");
              setMotmReason("");
            }
          }}
        >
          <div 
            className="bg-gradient-to-br from-slate-50/98 via-white/98 to-slate-50/98 backdrop-blur-xl w-[calc(100%-2rem)] max-w-full sm:max-w-2xl mx-4 my-4 sm:my-8 max-h-[90vh] sm:max-h-[85vh] rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.4)] border-2 border-yellow-200/60 p-5 sm:p-6 md:p-8 relative overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background elements */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-24 -right-24 w-56 h-56 bg-yellow-300/30 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-amber-300/30 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl"></div>
            </div>
            
            <button
              onClick={() => {
                setShowMOTMModal(false);
                setMotmError(null);
                setMotmSelectedPlayer("");
                setMotmReason("");
              }}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-white/95 backdrop-blur-sm border-2 border-slate-200/60 rounded-full shadow-lg hover:shadow-xl hover:bg-white hover:border-slate-300 transition-all duration-200 hover:scale-110 active:scale-95 group"
              type="button"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-500 flex items-center justify-center shadow-xl shadow-yellow-500/30">
                  <Star className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-yellow-700 via-amber-700 to-orange-700 bg-clip-text text-transparent mb-1">
                    Nominate Man of the Match
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">Recognize outstanding performance</p>
                </div>
              </div>

              <div className="mb-8 p-5 bg-gradient-to-r from-yellow-50/80 via-amber-50/80 to-orange-50/80 backdrop-blur-sm border-2 border-yellow-200/60 rounded-2xl shadow-lg">
                <p className="text-xs font-bold uppercase tracking-wide text-yellow-700 mb-2">Game Date</p>
                <p className="text-base sm:text-lg text-yellow-800 font-bold">{todayGame.formatted}</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                    Select Player
                  </label>
                  <select
                    value={motmSelectedPlayer}
                    onChange={(e) => {
                      setMotmSelectedPlayer(e.target.value);
                      setMotmError(null);
                    }}
                    className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl focus:ring-4 focus:ring-yellow-500/30 focus:border-yellow-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-yellow-300"
                    required
                    disabled={motmSubmitting}
                  >
                    <option value="">Choose a player...</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                  {!isAdmin && availablePlayers.length === 0 && (
                    <p className="mt-3 text-xs text-slate-500 italic flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                      You cannot nominate yourself or players you registered.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                    Reason <span className="text-xs font-normal text-slate-500">(Optional)</span>
                  </label>
                  <textarea
                    value={motmReason}
                    onChange={(e) => {
                      setMotmReason(e.target.value);
                      setMotmError(null);
                    }}
                    placeholder="Why did this player deserve Man of the Match? Share your thoughts..."
                    rows={5}
                    className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl focus:ring-4 focus:ring-yellow-500/30 focus:border-yellow-500 transition-all duration-200 resize-none bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-yellow-300 placeholder:text-slate-400"
                    disabled={motmSubmitting}
                  />
                </div>

                {motmError && (
                  <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300/80 rounded-xl text-sm font-bold shadow-lg flex items-start gap-3 animate-in fade-in duration-200">
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-red-800">{motmError}</span>
                  </div>
                )}

                {motmSuccess && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300/80 rounded-xl text-sm font-bold shadow-lg flex items-start gap-3 animate-in fade-in duration-200">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-green-800">{motmSuccess}</span>
                  </div>
                )}

                <button
                  onClick={handleMOTMSubmit}
                  disabled={motmSubmitting || !motmSelectedPlayer}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 text-base font-black text-white bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 hover:from-yellow-700 hover:via-amber-700 hover:to-orange-700 rounded-2xl transition-all duration-300 shadow-xl shadow-yellow-500/30 hover:shadow-2xl hover:shadow-yellow-500/40 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Star size={22} /> 
                  <span>{motmSubmitting ? 'Submitting...' : 'Submit Nomination'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kudos Modal */}
      {showKudosModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowKudosModal(false);
              setKudosError(null);
              setKudosSelectedPlayer("");
              setKudosMessage("");
            }
          }}
        >
          <div 
            className="bg-gradient-to-br from-slate-50/98 via-white/98 to-slate-50/98 backdrop-blur-xl w-[calc(100%-2rem)] max-w-full sm:max-w-2xl mx-4 my-4 sm:my-8 max-h-[90vh] sm:max-h-[85vh] rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.4)] border-2 border-pink-200/60 p-5 sm:p-6 md:p-8 relative overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background elements */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-24 -right-24 w-56 h-56 bg-pink-300/30 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-rose-300/30 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-fuchsia-200/20 rounded-full blur-3xl"></div>
            </div>
            
            <button
              onClick={() => {
                setShowKudosModal(false);
                setKudosError(null);
                setKudosSelectedPlayer("");
                setKudosMessage("");
              }}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-white/95 backdrop-blur-sm border-2 border-slate-200/60 rounded-full shadow-lg hover:shadow-xl hover:bg-white hover:border-slate-300 transition-all duration-200 hover:scale-110 active:scale-95 group"
              type="button"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-pink-500/30">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-pink-700 via-rose-700 to-fuchsia-700 bg-clip-text text-transparent mb-1">
                    Give Kudos
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">Appreciate your teammates</p>
                </div>
              </div>

              <form onSubmit={handleKudosSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                    Select Player
                  </label>
                  <select
                    value={kudosSelectedPlayer}
                    onChange={(e) => {
                      setKudosSelectedPlayer(e.target.value);
                      setKudosError(null);
                    }}
                    className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl focus:ring-4 focus:ring-pink-500/30 focus:border-pink-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-pink-300"
                    required
                    disabled={kudosSubmitting}
                  >
                    <option value="">Choose a player...</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                  {!isAdmin && availablePlayers.length === 0 && (
                    <p className="mt-3 text-xs text-slate-500 italic flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                      You cannot give kudos to yourself or players you registered.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                    Your Message
                  </label>
                  <textarea
                    value={kudosMessage}
                    onChange={(e) => {
                      setKudosMessage(e.target.value);
                      setKudosError(null);
                    }}
                    placeholder="Share your appreciation... e.g., Great goal today! Amazing teamwork in defense..."
                    rows={5}
                    className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl focus:ring-4 focus:ring-pink-500/30 focus:border-pink-500 transition-all duration-200 resize-none bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-pink-300 placeholder:text-slate-400"
                    required
                    disabled={kudosSubmitting}
                  />
                </div>

                {kudosError && (
                  <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300/80 rounded-xl text-sm font-bold shadow-lg flex items-start gap-3 animate-in fade-in duration-200">
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-red-800">{kudosError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 text-base font-black text-white bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 hover:from-pink-700 hover:via-rose-700 hover:to-fuchsia-700 rounded-2xl transition-all duration-300 shadow-xl shadow-pink-500/30 hover:shadow-2xl hover:shadow-pink-500/40 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  disabled={kudosSubmitting}
                >
                  <Send size={22} /> 
                  <span>{kudosSubmitting ? 'Sending...' : 'Send Kudos'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Points Modal */}
      {showPointsModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPointsModal(false);
              setPointsError(null);
              setPointsSelectedPlayer("");
              setPoints("");
              setPointsReason("");
            }
          }}
        >
          <div 
            className="bg-gradient-to-br from-slate-50/98 via-white/98 to-slate-50/98 backdrop-blur-xl w-[calc(100%-2rem)] max-w-full sm:max-w-2xl mx-4 my-4 sm:my-8 max-h-[90vh] sm:max-h-[85vh] rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.4)] border-2 border-amber-200/60 p-5 sm:p-6 md:p-8 relative overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background elements */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-24 -right-24 w-56 h-56 bg-amber-300/30 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-orange-300/30 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-200/20 rounded-full blur-3xl"></div>
            </div>
            
            <button
              onClick={() => {
                setShowPointsModal(false);
                setPointsError(null);
                setPointsSelectedPlayer("");
                setPoints("");
                setPointsReason("");
              }}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-white/95 backdrop-blur-sm border-2 border-slate-200/60 rounded-full shadow-lg hover:shadow-xl hover:bg-white hover:border-slate-300 transition-all duration-200 hover:scale-110 active:scale-95 group"
              type="button"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 flex items-center justify-center shadow-xl shadow-amber-500/30">
                  <Award className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-yellow-700 bg-clip-text text-transparent mb-1">
                    Rate Player Performance
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">Add performance points (1-5)</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Select Player
                  </label>
                  <select
                    value={pointsSelectedPlayer}
                    onChange={(e) => {
                      setPointsSelectedPlayer(e.target.value);
                      setPointsError(null);
                    }}
                    className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl focus:ring-4 focus:ring-amber-500/30 focus:border-amber-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-amber-300"
                    required
                    disabled={pointsSubmitting}
                  >
                    <option value="">Choose a player...</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                  {!isAdmin && availablePlayers.length === 0 && (
                    <p className="mt-3 text-xs text-slate-500 italic flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                      You cannot add points for yourself or players you registered.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Points <span className="text-xs font-normal text-slate-500">(1-5)</span>
                  </label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => {
                      setPoints(e.target.value);
                      setPointsError(null);
                    }}
                    placeholder="Enter points from 1 to 5"
                    min="1"
                    max="5"
                    className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl focus:ring-4 focus:ring-amber-500/30 focus:border-amber-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-amber-300 placeholder:text-slate-400"
                    required
                    disabled={pointsSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Performance Note
                  </label>
                  <textarea
                    value={pointsReason}
                    onChange={(e) => {
                      setPointsReason(e.target.value);
                      setPointsError(null);
                    }}
                    placeholder="Describe the performance... e.g., Great goal, Excellent defense, Man of the match performance..."
                    rows={5}
                    className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl focus:ring-4 focus:ring-amber-500/30 focus:border-amber-500 transition-all duration-200 resize-none bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-amber-300 placeholder:text-slate-400"
                    required
                    disabled={pointsSubmitting}
                  />
                </div>

                {pointsError && (
                  <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300/80 rounded-xl text-sm font-bold shadow-lg flex items-start gap-3 animate-in fade-in duration-200">
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-red-800">{pointsError}</span>
                  </div>
                )}

                {pointsSuccess && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300/80 rounded-xl text-sm font-bold shadow-lg flex items-start gap-3 animate-in fade-in duration-200">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-green-800">{pointsSuccess}</span>
                  </div>
                )}

                <button
                  onClick={handlePointsSubmit}
                  disabled={pointsSubmitting || !pointsSelectedPlayer || !points || !pointsReason.trim()}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 text-base font-black text-white bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 hover:from-amber-700 hover:via-orange-700 hover:to-yellow-700 rounded-2xl transition-all duration-300 shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/40 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Award size={22} /> 
                  <span>{pointsSubmitting ? 'Adding...' : 'Add Points'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goals & Assists Submission Modal */}
      {showGoalsAssistsModal && canSubmitGoalsAssistsToday && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowGoalsAssistsModal(false);
              setGoalsAssistsError(null);
              setGoalsAssistsSelectedPlayer("");
              setGoals("0");
              setAssists("0");
            }
          }}
        >
          <div 
            className="bg-gradient-to-br from-slate-50/98 via-white/98 to-slate-50/98 backdrop-blur-xl w-[calc(100%-2rem)] max-w-full sm:max-w-2xl mx-4 my-4 sm:my-8 max-h-[90vh] sm:max-h-[85vh] rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.4)] border-2 border-emerald-200/60 p-5 sm:p-6 md:p-8 relative overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background elements */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-24 -right-24 w-56 h-56 bg-green-300/30 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-emerald-300/30 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl"></div>
            </div>
            
            <button
              onClick={() => {
                setShowGoalsAssistsModal(false);
                setGoalsAssistsError(null);
                setGoalsAssistsSelectedPlayer("");
                setGoals("0");
                setAssists("0");
              }}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-white/95 backdrop-blur-sm border-2 border-slate-200/60 rounded-full shadow-lg hover:shadow-xl hover:bg-white hover:border-slate-300 transition-all duration-200 hover:scale-110 active:scale-95 group"
              type="button"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 flex items-center justify-center shadow-xl shadow-green-500/30">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-green-700 via-emerald-700 to-teal-700 bg-clip-text text-transparent mb-1">
                    Submit Goals & Assists
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">Record player statistics</p>
                </div>
              </div>

              {todayGameDateForSubmission && (
                <div className="mb-8 p-5 bg-gradient-to-r from-green-50/80 via-emerald-50/80 to-teal-50/80 backdrop-blur-sm border-2 border-green-200/60 rounded-2xl shadow-lg">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-700 mb-2">Game Date</p>
                  <p className="text-base sm:text-lg text-green-800 font-bold">{todayGameDateForSubmission}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Select Player
                  </label>
                  <select
                    value={goalsAssistsSelectedPlayer}
                    onChange={(e) => {
                      setGoalsAssistsSelectedPlayer(e.target.value);
                      setGoalsAssistsError(null);
                    }}
                    className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl focus:ring-4 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-green-300"
                    required
                    disabled={goalsAssistsSubmitting}
                  >
                    <option value="">Choose a player...</option>
                    {availablePlayersForGoalsAssists.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Goals Scored
                  </label>
                  <input
                    type="number"
                    value={goals}
                    onChange={(e) => {
                      setGoals(e.target.value);
                      setGoalsAssistsError(null);
                    }}
                    placeholder="Enter number of goals"
                    min="0"
                    className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl focus:ring-4 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-green-300 placeholder:text-slate-400"
                    required
                    disabled={goalsAssistsSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Assists Made
                  </label>
                  <input
                    type="number"
                    value={assists}
                    onChange={(e) => {
                      setAssists(e.target.value);
                      setGoalsAssistsError(null);
                    }}
                    placeholder="Enter number of assists"
                    min="0"
                    className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl focus:ring-4 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-green-300 placeholder:text-slate-400"
                    required
                    disabled={goalsAssistsSubmitting}
                  />
                </div>

                {goalsAssistsError && (
                  <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300/80 rounded-xl text-sm font-bold shadow-lg flex items-start gap-3 animate-in fade-in duration-200">
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-red-800">{goalsAssistsError}</span>
                  </div>
                )}

                {goalsAssistsSuccess && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300/80 rounded-xl text-sm font-bold shadow-lg flex items-start gap-3 animate-in fade-in duration-200">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-green-800">{goalsAssistsSuccess}</span>
                  </div>
                )}

                <button
                  onClick={handleGoalsAssistsSubmit}
                  disabled={goalsAssistsSubmitting || !goalsAssistsSelectedPlayer || (parseInt(goals) === 0 && parseInt(assists) === 0)}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 text-base font-black text-white bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 rounded-2xl transition-all duration-300 shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Target size={22} /> 
                  <span>{goalsAssistsSubmitting ? 'Submitting...' : 'Submit Stats'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Score Input Modal */}
      {showScoreInput && todayGame && teams.length >= 2 && (
        <GameScoreInput
          db={db}
          teams={teams}
          gameDate={todayGame.date}
          onSuccess={() => {
            setShowScoreInput(false);
          }}
          onClose={() => setShowScoreInput(false)}
        />
      )}
    </div>
  );
};

export default GameInfoPanel;

