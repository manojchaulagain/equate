import React, { useState, useMemo, useEffect } from "react";
import { ListChecks, Trophy, Edit2, UserPlus, Trash2, Calendar, MapPin, CheckCircle2, Star, Heart, Award, ArrowRight, X, Send, Plus } from "lucide-react";
import { PlayerAvailability, Player } from "../../types/player";
import { POSITION_LABELS, SKILL_LABELS } from "../../constants/player";
import EditPlayerModal from "../players/EditPlayerModal";
import AddPlayerModal from "../players/AddPlayerModal";
import { doc, onSnapshot, collection, addDoc, Timestamp, getDoc, setDoc } from "firebase/firestore";
import { calculateNextGame, getTodayGame, GameSchedule } from "../../utils/gameSchedule";
import { isTodayGameDayPassed, getTodayGameDateString } from "../../utils/gamePoints";

declare const __app_id: string;

const TEAM_COUNT_OPTIONS = [2, 3, 4, 5, 6];

interface WeeklyAvailabilityPollProps {
  availability: PlayerAvailability[];
  loading: boolean;
  availableCount: number;
  onToggleAvailability: (playerId: string) => void | Promise<void>;
  onGenerateTeams: () => void;
  onUpdatePlayer: (playerId: string, updates: { position?: any; skillLevel?: any }) => Promise<void>;
  onDeletePlayer: (playerId: string) => Promise<void>;
  onAddPlayer: (player: Omit<Player, "id">) => Promise<void>;
  error: string | null;
  disabled?: boolean;
  isAdmin?: boolean;
  teamCount: number;
  onTeamCountChange: (count: number) => void;
  minPlayersRequired: number;
  canGenerateTeams: boolean;
  currentUserId: string | null;
  db?: any;
  isActive?: boolean;
  onNavigateToLeaderboard?: () => void;
  userEmail?: string;
  userRole?: string;
}

const WeeklyAvailabilityPoll: React.FC<WeeklyAvailabilityPollProps> = ({
  availability,
  loading,
  availableCount,
  onToggleAvailability,
  onGenerateTeams,
  onUpdatePlayer,
  onDeletePlayer,
  onAddPlayer,
  error,
  disabled = false,
  isAdmin = false,
  teamCount,
  onTeamCountChange,
  minPlayersRequired,
  canGenerateTeams,
  currentUserId,
  db,
  isActive = false,
  onNavigateToLeaderboard,
  userEmail = "",
  userRole = "user",
}) => {
  const [editingPlayer, setEditingPlayer] = useState<PlayerAvailability | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<PlayerAvailability | null>(null);
  const [gameSchedule, setGameSchedule] = useState<GameSchedule | null>(null);
  const [nextGame, setNextGame] = useState<{ date: Date; formatted: string; dayOfWeek?: number } | null>(null);
  const [todayGame, setTodayGame] = useState<{ date: Date; formatted: string; dayOfWeek: number } | null>(null);
  const [fieldLocation, setFieldLocation] = useState<string | null>(null);
  const [gamePlayed, setGamePlayed] = useState(false);
  const [showGameCompletePanel, setShowGameCompletePanel] = useState(false);
  
  // Modal states
  const [showMOTMModal, setShowMOTMModal] = useState(false);
  const [showKudosModal, setShowKudosModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  
  // MOTM state
  const [motmSelectedPlayer, setMotmSelectedPlayer] = useState<string>("");
  const [motmReason, setMotmReason] = useState<string>("");
  const [motmSubmitting, setMotmSubmitting] = useState(false);
  const [motmError, setMotmError] = useState<string | null>(null);
  const [motmSuccess, setMotmSuccess] = useState<string | null>(null);
  
  // Kudos state
  const [kudosSelectedPlayer, setKudosSelectedPlayer] = useState<string>("");
  const [kudosMessage, setKudosMessage] = useState<string>("");
  const [kudosSubmitting, setKudosSubmitting] = useState(false);
  const [kudosError, setKudosError] = useState<string | null>(null);
  
  // Points state
  const [pointsSelectedPlayer, setPointsSelectedPlayer] = useState<string>("");
  const [points, setPoints] = useState<string>("");
  const [pointsReason, setPointsReason] = useState<string>("");
  const [pointsSubmitting, setPointsSubmitting] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [pointsSuccess, setPointsSuccess] = useState<string | null>(null);

  // Fetch game schedule and calculate next game
  useEffect(() => {
    if (!db) return;

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const schedulePath = `artifacts/${appId}/public/data/gameSchedule/config`;
    const scheduleRef = doc(db, schedulePath);

    const unsubscribe = onSnapshot(
      scheduleRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as GameSchedule;
          setGameSchedule(data);
          
          // Get today's game info (if today is a game day)
          const today = getTodayGame(data);
          const now = new Date();
          
          // Check if today's game is still valid (until midnight)
          let validTodayGame = null;
          if (today) {
            const gameTime = new Date(today.date);
            const gameDateStr = gameTime.toDateString();
            const currentDateStr = now.toDateString();
            const isSameDay = currentDateStr === gameDateStr;
            
            // Only show today's game if it's still the same day (until midnight)
            if (isSameDay) {
              validTodayGame = today;
            }
          }
          
          setTodayGame(validTodayGame);
          
          // Check if game was played (2 hours after game time) and still same day
          if (validTodayGame) {
            const gameTime = new Date(validTodayGame.date);
            const twoHoursAfterGame = new Date(gameTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours in milliseconds
            
            // Check if it's been 2 hours since game time
            const hasBeenTwoHours = now.getTime() >= twoHoursAfterGame.getTime();
            
            // Check if it's still the same day as the game (until midnight)
            const gameDateStr = gameTime.toDateString();
            const currentDateStr = now.toDateString();
            const isSameDay = currentDateStr === gameDateStr;
            
            // Show panel if 2 hours have passed AND it's still the same day
            const shouldShowPanel = hasBeenTwoHours && isSameDay;
            setGamePlayed(shouldShowPanel);
            setShowGameCompletePanel(shouldShowPanel);
          } else {
            setGamePlayed(false);
            setShowGameCompletePanel(false);
          }
          
          // Calculate next game (from tomorrow onwards, or today if today's game has passed midnight)
          const next = calculateNextGame(data);
          setNextGame(next);
          
          // Get location - prioritize today's game, then next game
          const gameToShow = validTodayGame || next;
          if (gameToShow && typeof gameToShow.dayOfWeek === 'number' && data.location && data.location[gameToShow.dayOfWeek]) {
            setFieldLocation(data.location[gameToShow.dayOfWeek]);
          } else {
            setFieldLocation(null);
          }
        } else {
          setGameSchedule(null);
          setNextGame(null);
          setTodayGame(null);
          setFieldLocation(null);
          setGamePlayed(false);
        }
      },
      (err) => {
        console.error("Error fetching game schedule:", err);
      }
    );

    return () => unsubscribe();
  }, [db]);

  // Update game played status and today's game every minute to check if 2 hours have passed and still same day
  useEffect(() => {
    if (!gameSchedule) return;

    const checkGameStatus = () => {
      const now = new Date();
      
      // Get today's game info (if today is a game day)
      const today = getTodayGame(gameSchedule);
      
      // Check if today's game is still valid (until midnight)
      let validTodayGame = null;
      if (today) {
        const gameTime = new Date(today.date);
        const gameDateStr = gameTime.toDateString();
        const currentDateStr = now.toDateString();
        const isSameDay = currentDateStr === gameDateStr;
        
        // Only show today's game if it's still the same day (until midnight)
        if (isSameDay) {
          validTodayGame = today;
        }
      }
      
      setTodayGame(validTodayGame);
      
      // Recalculate next game in case today's game is no longer valid
      const next = calculateNextGame(gameSchedule);
      setNextGame(next);
      
      // Check if game was played (2 hours after game time) and still same day
      if (validTodayGame) {
        const gameTime = new Date(validTodayGame.date);
        const twoHoursAfterGame = new Date(gameTime.getTime() + 2 * 60 * 60 * 1000);
        
        // Check if it's been 2 hours since game time
        const hasBeenTwoHours = now.getTime() >= twoHoursAfterGame.getTime();
        
        // Check if it's still the same day as the game (until midnight)
        const gameDateStr = gameTime.toDateString();
        const currentDateStr = now.toDateString();
        const isSameDay = currentDateStr === gameDateStr;
        
        // Show panel if 2 hours have passed AND it's still the same day
        const shouldShow = hasBeenTwoHours && isSameDay;
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

  // Get available players for MOTM, Kudos, and Points
  const getAvailablePlayers = () => {
    const isAdmin = userRole === "admin";
    if (isAdmin) {
      return availability;
    }
    return availability.filter(
      (player) => player.userId !== currentUserId && player.registeredBy !== currentUserId
    );
  };

  const availablePlayers = getAvailablePlayers();

  // Handle MOTM nomination
  const handleMOTMSubmit = async () => {
    if (!motmSelectedPlayer) {
      setMotmError("Please select a player.");
      return;
    }

    if (!db || !currentUserId || !userEmail) {
      setMotmError("Missing required information.");
      return;
    }

    setMotmError(null);
    setMotmSubmitting(true);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const motmPath = `artifacts/${appId}/public/data/manOfTheMatch`;
      const motmRef = collection(db, motmPath);

      const player = availability.find((p) => p.id === motmSelectedPlayer);
      if (!player) {
        throw new Error("Player not found");
      }

      const todayDateStr = getTodayGameDateString(gameSchedule?.schedule || null) || new Date().toDateString();

      await addDoc(motmRef, {
        gameDate: todayDateStr,
        nominatedPlayerId: motmSelectedPlayer,
        nominatedPlayerName: player.name,
        nominatedBy: currentUserId,
        nominatedByEmail: userEmail,
        reason: motmReason.trim() || undefined,
        createdAt: Timestamp.now(),
      });

      // Create notification for the player who was nominated
      if (player.userId) {
        const notificationsPath = `artifacts/${appId}/public/data/userNotifications`;
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
  const handleKudosSubmit = async () => {
    if (!kudosSelectedPlayer || !kudosMessage.trim()) {
      setKudosError("Please select a player and enter a message.");
      return;
    }

    if (!db || !currentUserId || !userEmail) {
      setKudosError("Missing required information.");
      return;
    }

    setKudosError(null);
    setKudosSubmitting(true);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const kudosPath = `artifacts/${appId}/public/data/kudos`;
      const kudosRef = collection(db, kudosPath);

      const player = availability.find((p) => p.id === kudosSelectedPlayer);
      if (!player) {
        throw new Error("Player not found");
      }

      await addDoc(kudosRef, {
        fromUserId: currentUserId,
        fromUserEmail: userEmail,
        toPlayerId: kudosSelectedPlayer,
        toPlayerName: player.name,
        message: kudosMessage.trim(),
        createdAt: Timestamp.now(),
      });

      // Create notification for the player who received kudos
      if (player.userId) {
        const notificationsPath = `artifacts/${appId}/public/data/userNotifications`;
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

    if (!db || !currentUserId || !userEmail) {
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
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const pointsPath = `artifacts/${appId}/public/data/playerPoints/${pointsSelectedPlayer}`;
      const pointsRef = doc(db, pointsPath);

      const player = availability.find((p) => p.id === pointsSelectedPlayer);
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

  // Check if user can toggle availability for a player
  const canToggleAvailability = (player: PlayerAvailability): boolean => {
    if (isAdmin) return true; // Admins can toggle all players
    if (!currentUserId) return false; // Must be logged in
    
    // User can toggle if:
    // 1. Player is themselves (userId matches)
    // 2. Player was registered by them (registeredBy matches)
    return player.userId === currentUserId || player.registeredBy === currentUserId;
  };

  // Sort availability: logged-in user's player first, then players registered by them, then others sorted by name
  const sortedAvailability = useMemo(() => {
    if (!currentUserId) {
      // If no user is logged in, just sort all players by name
      return [...availability].sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
    }
    
    const userPlayer = availability.find(p => p.userId === currentUserId);
    const registeredByUser = availability.filter(
      p => p.userId !== currentUserId && p.registeredBy === currentUserId
    );
    const otherPlayers = availability.filter(
      p => p.userId !== currentUserId && p.registeredBy !== currentUserId
    );
    
    // Sort other players alphabetically by name (case-insensitive)
    const sortedOtherPlayers = [...otherPlayers].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
    
    return [...(userPlayer ? [userPlayer] : []), ...registeredByUser, ...sortedOtherPlayers];
  }, [availability, currentUserId]);

  const handleEditClick = (e: React.MouseEvent, player: PlayerAvailability) => {
    e.stopPropagation(); // Prevent toggling availability when clicking edit
    setEditingPlayer(player);
  };

  const handleDeleteClick = (e: React.MouseEvent, player: PlayerAvailability) => {
    e.stopPropagation(); // Prevent toggling availability when clicking delete
    setPlayerToDelete(player);
  };

  const handleConfirmDelete = async () => {
    if (playerToDelete) {
      await onDeletePlayer(playerToDelete.id);
      setPlayerToDelete(null);
    }
  };

  const handleSaveEdit = async (playerId: string, updates: { position: any; skillLevel: any }) => {
    await onUpdatePlayer(playerId, updates);
    setEditingPlayer(null);
  };
  return (
    <div className={`relative overflow-hidden backdrop-blur-xl p-4 sm:p-6 rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.15)] -mt-[1px] ${
      isActive 
        ? "bg-gradient-to-br from-indigo-50/95 via-purple-50/95 to-indigo-50/95 border-l-2 border-r-2 border-b-2 border-indigo-500/70" 
        : "bg-white/90 border border-white/70 border-t-0"
    }`}>
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-cyan-200/50 blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-200/50 blur-[80px]" />
      </div>
      <div className="relative z-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
            <ListChecks className="text-indigo-600 flex-shrink-0" size={20} /> 
            <span className="whitespace-nowrap">Weekly Availability Poll</span>
          </h2>
          {!todayGame && !nextGame && (
            <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
              Toggle players who are available to play this week.
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={disabled}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-2xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:shadow-none flex items-center justify-center whitespace-nowrap w-full sm:w-auto transform hover:scale-105 text-sm sm:text-base"
        >
          <UserPlus className="mr-2" size={16} /> <span className="sm:inline">Register Player</span>
        </button>
      </div>

      {/* Game Info Panel - Full width below header */}
      {(todayGame || nextGame) && (
        <div className={`w-full rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl backdrop-blur-sm relative overflow-hidden transition-all duration-300 mb-6 ${
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
          {showGameCompletePanel && todayGame && onNavigateToLeaderboard && (
            <div className="relative z-10 px-5 sm:px-6 md:px-8 pb-5 sm:pb-6 md:pb-8 pt-0 border-t-2 border-amber-200/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <button
                          onClick={() => setShowMOTMModal(true)}
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

                        <button
                          onClick={() => setShowKudosModal(true)}
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

                        <button
                          onClick={() => setShowPointsModal(true)}
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
                      </div>
                      
              {/* View Leaderboard Button */}
              <div className="pt-5 border-t-2 border-amber-200/50">
                <button
                  onClick={onNavigateToLeaderboard}
                  className="w-full md:w-auto md:max-w-md mx-auto md:mx-0 flex items-center justify-center gap-3 px-6 py-3.5 text-lg font-bold text-white bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-700 hover:via-orange-700 hover:to-red-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Trophy className="w-6 h-6" />
                  <span>View Leaderboard</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center p-8 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl border border-indigo-200">
          <p className="text-indigo-700 font-semibold text-lg">Loading players from Firestore...</p>
        </div>
      )}

      {!loading && availability.length === 0 ? (
        <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-blue-50 rounded-2xl border-2 border-dashed border-indigo-200">
          <p className="text-slate-600 mb-4 font-medium">No players registered yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={disabled}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-2xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:shadow-none flex items-center mx-auto transform hover:scale-105"
          >
            <UserPlus className="mr-2" size={18} /> Register Player
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto p-4 custom-scrollbar">
          {sortedAvailability.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
                canToggleAvailability(player)
                  ? "cursor-pointer transform hover:scale-[1.02]"
                  : "cursor-not-allowed opacity-75"
              } ${
                player.isAvailable
                  ? "bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-300 shadow-md"
                  : "bg-gradient-to-r from-slate-100 to-gray-100 border-2 border-slate-300 shadow-sm"
              } ${canToggleAvailability(player) && player.isAvailable ? "hover:shadow-lg" : ""} ${canToggleAvailability(player) && !player.isAvailable ? "hover:opacity-90" : ""}`}
              onClick={() => {
                if (canToggleAvailability(player)) {
                  onToggleAvailability(player.id);
                }
              }}
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className={`font-bold text-base sm:text-lg ${player.isAvailable ? "text-slate-800" : "text-slate-600"} truncate`}>
                  {player.name}
                </p>
                <p className={`text-xs mt-1 ${player.isAvailable ? "text-slate-600" : "text-slate-500"} break-words`}>
                  <span className="hidden sm:inline">{player.position} ({POSITION_LABELS[player.position]}) • </span>
                  <span className="sm:hidden">{player.position} • </span>
                  Skill: {player.skillLevel} ({SKILL_LABELS[player.skillLevel]})
                </p>
              </div>
              <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 flex-shrink-0">
                {isAdmin && (
                  <>
                    <button
                      onClick={(e) => handleEditClick(e, player)}
                      className="p-2 sm:p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
                      title="Edit player"
                    >
                      <Edit2 size={14} className="sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, player)}
                      className="p-2 sm:p-2.5 bg-gradient-to-br from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
                      title="Delete player"
                    >
                      <Trash2 size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </>
                )}
                {canToggleAvailability(player) ? (
                  <div className="flex items-center bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 shadow-inner border-2 border-slate-400">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleAvailability(player.id);
                      }}
                      className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 min-w-[55px] sm:min-w-[70px] md:min-w-[75px] ${
                        !player.isAvailable
                          ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg border-2 border-red-700 transform scale-105"
                          : "text-red-700 hover:bg-red-50 border-2 border-transparent hover:border-red-200"
                      }`}
                    >
                      Out
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleAvailability(player.id);
                      }}
                      className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 min-w-[55px] sm:min-w-[70px] md:min-w-[75px] ${
                        player.isAvailable
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg border-2 border-emerald-700 transform scale-105"
                          : "text-emerald-700 hover:bg-emerald-50 border-2 border-transparent hover:border-emerald-200"
                      }`}
                    >
                      Playing
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 shadow-inner border-2 border-slate-400 opacity-75">
                    <div className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold min-w-[55px] sm:min-w-[70px] md:min-w-[75px] text-center ${
                      player.isAvailable
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg border-2 border-emerald-700"
                        : "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg border-2 border-red-700"
                    }`}>
                      {player.isAvailable ? "Playing" : "Out"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t-2 border-indigo-200 flex flex-col gap-4 bg-gradient-to-r from-slate-50 to-blue-50 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-3 sm:pb-2 rounded-b-xl sm:rounded-b-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700">
              Total Available:
            </p>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xl sm:text-2xl font-extrabold px-3 sm:px-4 py-1 sm:py-1.5 rounded-2xl shadow-lg">
              {availableCount}
            </span>
          </div>
          {isAdmin && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <label className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wide">
                Teams to Generate
              </label>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                <select
                  value={teamCount}
                  onChange={(e) => onTeamCountChange(Number(e.target.value))}
                  className="border-2 border-indigo-200 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700 bg-white shadow-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  disabled={disabled}
                >
                  {TEAM_COUNT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} Teams
                    </option>
                  ))}
                </select>
                <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Red & Blue when set to 2
                </span>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">
                  Need at least {minPlayersRequired} players •{" "}
                  {canGenerateTeams
                    ? "Ready to generate"
                    : `${Math.max(minPlayersRequired - availableCount, 0)} more needed`}
                </span>
              </div>
            </div>
          )}
        </div>
        {isAdmin ? (
          <button
            onClick={onGenerateTeams}
            disabled={!canGenerateTeams || loading || disabled}
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white font-bold py-2.5 sm:py-3.5 px-4 sm:px-6 md:px-8 rounded-2xl hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center justify-center disabled:bg-gray-400 disabled:shadow-none transform hover:scale-105 disabled:transform-none w-full text-sm sm:text-base"
          >
            <Trophy className="mr-2" size={18} /> <span>Generate Teams</span>
          </button>
        ) : (
          <p className="text-xs sm:text-sm text-slate-500 italic font-medium bg-slate-100 px-3 sm:px-4 py-2 rounded-xl text-center sm:text-left w-full">
            Only admins can generate teams
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-2xl text-sm font-semibold shadow-md">
          {error}
        </div>
      )}

      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSave={handleSaveEdit}
        />
      )}

      {showAddModal && (
        <AddPlayerModal
          onClose={() => setShowAddModal(false)}
          onAddPlayer={onAddPlayer}
        />
      )}

      {/* Delete Confirmation Modal */}
      {playerToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-50/95 via-white/95 to-slate-50/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.3)] border-2 border-red-200/60 max-w-md w-full p-5 sm:p-6 md:p-7 relative my-auto animate-in slide-in-from-bottom-4 duration-300">
            {/* Decorative background elements */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-red-200/30 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-rose-200/30 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Delete Player?
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 mb-6 pl-1">
                Are you sure you want to delete <span className="font-semibold text-slate-800">{playerToDelete.name}</span>? This action cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
                <button
                  onClick={() => setPlayerToDelete(null)}
                  className="px-5 py-2.5 bg-slate-200/80 text-slate-800 font-semibold rounded-xl hover:bg-slate-300 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Player
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOTM Modal */}
      {showMOTMModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
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
            className="bg-gradient-to-br from-slate-50/95 via-white/95 to-slate-50/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.3)] border-2 border-slate-200/60 max-w-md w-full p-5 sm:p-6 md:p-7 relative my-auto max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-yellow-200/30 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-amber-200/30 rounded-full blur-3xl"></div>
            </div>
            
            <button
              onClick={() => {
                setShowMOTMModal(false);
                setMotmError(null);
                setMotmSelectedPlayer("");
                setMotmReason("");
              }}
              className="absolute top-4 right-4 p-2 hover:bg-slate-200/60 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 z-20"
              type="button"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Nominate Man of the Match
                </h2>
              </div>

              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200/60 rounded-xl shadow-sm">
                <p className="text-sm font-semibold text-yellow-800 mb-1">Game:</p>
                <p className="text-sm text-yellow-700 font-medium">Today's Game</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Player
                  </label>
                  <select
                    value={motmSelectedPlayer}
                    onChange={(e) => {
                      setMotmSelectedPlayer(e.target.value);
                      setMotmError(null);
                    }}
                    className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition duration-150 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                    required
                    disabled={motmSubmitting}
                  >
                    <option value="">Select a player</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                  {userRole !== "admin" && availablePlayers.length === 0 && (
                    <p className="mt-2 text-xs text-slate-500 italic">
                      You cannot nominate yourself or players you registered.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={motmReason}
                    onChange={(e) => {
                      setMotmReason(e.target.value);
                      setMotmError(null);
                    }}
                    placeholder="Why did this player deserve Man of the Match?"
                    rows={4}
                    className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition duration-150 resize-none bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                    disabled={motmSubmitting}
                  />
                </div>

                {motmError && (
                  <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold shadow-md">
                    {motmError}
                  </div>
                )}

                {motmSuccess && (
                  <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 text-emerald-700 rounded-xl text-sm font-semibold shadow-md">
                    {motmSuccess}
                  </div>
                )}

                <button
                  onClick={handleMOTMSubmit}
                  disabled={motmSubmitting || !motmSelectedPlayer}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Star size={20} /> {motmSubmitting ? 'Submitting...' : 'Submit Nomination'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kudos Modal */}
      {showKudosModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
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
            className="bg-gradient-to-br from-slate-50/95 via-white/95 to-slate-50/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.3)] border-2 border-slate-200/60 max-w-md w-full p-5 sm:p-6 md:p-7 relative my-auto max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-pink-200/30 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-rose-200/30 rounded-full blur-3xl"></div>
            </div>
            
            <button
              onClick={() => {
                setShowKudosModal(false);
                setKudosError(null);
                setKudosSelectedPlayer("");
                setKudosMessage("");
              }}
              className="absolute top-4 right-4 p-2 hover:bg-slate-200/60 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 z-20"
              type="button"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Give Kudos
                </h2>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleKudosSubmit(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Player
                  </label>
                  <select
                    value={kudosSelectedPlayer}
                    onChange={(e) => {
                      setKudosSelectedPlayer(e.target.value);
                      setKudosError(null);
                    }}
                    className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition duration-150 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                    required
                    disabled={kudosSubmitting}
                  >
                    <option value="">Select a player</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                  {userRole !== "admin" && availablePlayers.length === 0 && (
                    <p className="mt-2 text-xs text-slate-500 italic">
                      You cannot give kudos to yourself or players you registered.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Message
                  </label>
                  <textarea
                    value={kudosMessage}
                    onChange={(e) => {
                      setKudosMessage(e.target.value);
                      setKudosError(null);
                    }}
                    placeholder="e.g., Great goal today! Amazing teamwork in defense..."
                    rows={4}
                    className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition duration-150 resize-none bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                    required
                    disabled={kudosSubmitting}
                  />
                </div>

                {kudosError && (
                  <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold shadow-md">
                    {kudosError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={kudosSubmitting}
                >
                  <Send size={20} /> {kudosSubmitting ? 'Sending...' : 'Send Kudos'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Points Modal */}
      {showPointsModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
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
            className="bg-gradient-to-br from-slate-50/95 via-white/95 to-slate-50/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.3)] border-2 border-slate-200/60 max-w-md w-full p-5 sm:p-6 md:p-7 relative my-auto max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-200/30 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-orange-200/30 rounded-full blur-3xl"></div>
            </div>
            
            <button
              onClick={() => {
                setShowPointsModal(false);
                setPointsError(null);
                setPointsSelectedPlayer("");
                setPoints("");
                setPointsReason("");
              }}
              className="absolute top-4 right-4 p-2 hover:bg-slate-200/60 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 z-20"
              type="button"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Add Points
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Player
                  </label>
                  <select
                    value={pointsSelectedPlayer}
                    onChange={(e) => {
                      setPointsSelectedPlayer(e.target.value);
                      setPointsError(null);
                    }}
                    className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                    required
                    disabled={pointsSubmitting}
                  >
                    <option value="">Select a player</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                  {userRole !== "admin" && availablePlayers.length === 0 && (
                    <p className="mt-2 text-xs text-slate-500 italic">
                      You cannot add points for yourself or players you registered.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points
                  </label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => {
                      setPoints(e.target.value);
                      setPointsError(null);
                    }}
                    placeholder="Enter points (1-5)"
                    min="1"
                    max="5"
                    className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                    required
                    disabled={pointsSubmitting}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Rate player performance from 1 to 5 based on today's game.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason / Performance Note
                  </label>
                  <textarea
                    value={pointsReason}
                    onChange={(e) => {
                      setPointsReason(e.target.value);
                      setPointsError(null);
                    }}
                    placeholder="e.g., Great goal, Excellent defense, Man of the match performance..."
                    rows={4}
                    className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 resize-none bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                    required
                    disabled={pointsSubmitting}
                  />
                </div>

                {pointsError && (
                  <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold shadow-md">
                    {pointsError}
                  </div>
                )}

                {pointsSuccess && (
                  <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 text-emerald-700 rounded-xl text-sm font-semibold shadow-md">
                    {pointsSuccess}
                  </div>
                )}

                <button
                  onClick={handlePointsSubmit}
                  disabled={pointsSubmitting || !pointsSelectedPlayer || !points || !pointsReason.trim()}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={20} /> {pointsSubmitting ? 'Adding...' : 'Add Points'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default WeeklyAvailabilityPoll;

