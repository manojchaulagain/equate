import React, { useState, useMemo, useEffect } from "react";
import { ListChecks, Trophy, Edit2, UserPlus, Trash2, Star, Heart, X, Send, Plus, Search, Filter, XCircle } from "lucide-react";
import { PlayerAvailability, Player, Position, SkillLevel } from "../../types/player";
import { POSITION_LABELS, SKILL_LABELS, POSITIONS } from "../../constants/player";
import EditPlayerModal from "../players/EditPlayerModal";
import AddPlayerModal from "../players/AddPlayerModal";
import { doc, collection, addDoc, Timestamp, getDoc, setDoc } from "firebase/firestore";
import { useGameSchedule } from "../../hooks/useGameSchedule";
import { getTodayGameDateString } from "../../utils/gamePoints";
import { FirestorePaths } from "../../utils/firestorePaths";

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
  openMOTMModal?: boolean;
  openKudosModal?: boolean;
  openPointsModal?: boolean;
  onModalOpened?: (modal: "motm" | "kudos" | "points") => void;
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
  openMOTMModal: propOpenMOTM = false,
  openKudosModal: propOpenKudos = false,
  openPointsModal: propOpenPoints = false,
  onModalOpened,
}) => {
  const [editingPlayer, setEditingPlayer] = useState<PlayerAvailability | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<PlayerAvailability | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterPosition, setFilterPosition] = useState<Position | "">("");
  const [filterSkill, setFilterSkill] = useState<SkillLevel | "">("");
  const [filterAvailability, setFilterAvailability] = useState<"all" | "available" | "unavailable">("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Use shared hook for game schedule
  const gameSchedule = useGameSchedule(db);
  
  // Modal states
  const [showMOTMModal, setShowMOTMModal] = useState(false);
  const [showKudosModal, setShowKudosModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);

  // Handle prop-based modal opening
  useEffect(() => {
    if (propOpenMOTM) {
      setShowMOTMModal(true);
      onModalOpened?.("motm");
    }
  }, [propOpenMOTM, onModalOpened]);

  useEffect(() => {
    if (propOpenKudos) {
      setShowKudosModal(true);
      onModalOpened?.("kudos");
    }
  }, [propOpenKudos, onModalOpened]);

  useEffect(() => {
    if (propOpenPoints) {
      setShowPointsModal(true);
      onModalOpened?.("points");
    }
  }, [propOpenPoints, onModalOpened]);
  
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
      const motmPath = FirestorePaths.motm();
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
      const kudosPath = FirestorePaths.kudos();
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
      const pointsPath = `${FirestorePaths.playerPoints()}/${pointsSelectedPlayer}`;
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

  // Filter players based on search query and filters
  const filteredAvailability = useMemo(() => {
    return sortedAvailability.filter((player) => {
      // Search filter
      if (searchQuery.trim() && !player.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Position filter
      if (filterPosition && player.position !== filterPosition) {
        return false;
      }
      
      // Skill filter
      if (filterSkill && player.skillLevel !== filterSkill) {
        return false;
      }
      
      // Availability filter
      if (filterAvailability === "available" && !player.isAvailable) {
        return false;
      }
      if (filterAvailability === "unavailable" && player.isAvailable) {
        return false;
      }
      
      return true;
    });
  }, [sortedAvailability, searchQuery, filterPosition, filterSkill, filterAvailability]);
  
  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filterPosition) count++;
    if (filterSkill) count++;
    if (filterAvailability !== "all") count++;
    return count;
  }, [searchQuery, filterPosition, filterSkill, filterAvailability]);
  
  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setFilterPosition("");
    setFilterSkill("");
    setFilterAvailability("all");
  };

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
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
            <ListChecks className="text-indigo-600 flex-shrink-0" size={20} /> 
            <span className="whitespace-nowrap">Weekly Availability Poll</span>
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-600 mt-2">
            Toggle players who are available to play this week.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={disabled}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-2xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:shadow-none flex items-center justify-center whitespace-nowrap w-full sm:w-auto transform hover:scale-105 text-sm sm:text-base"
        >
          <UserPlus className="mr-2" size={16} /> <span className="sm:inline">Register Player</span>
        </button>
      </div>


      {/* Always render container to prevent layout shift */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="text-center p-8 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl border border-indigo-200 min-h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
              <p className="text-indigo-700 font-semibold text-lg">Loading players from Firestore...</p>
            </div>
          </div>
        ) : availability.length === 0 ? (
          <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-blue-50 rounded-2xl border-2 border-dashed border-indigo-200 min-h-[400px] flex flex-col items-center justify-center">
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
        <>
          {/* Search and Filter Section */}
          <div className="mb-4 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search players by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition duration-150 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md text-sm font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition"
                  type="button"
                >
                  <XCircle className="text-slate-400 hover:text-slate-600" size={18} />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  showFilters
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                type="button"
              >
                <Filter size={16} />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-white text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1"
                  type="button"
                >
                  <XCircle size={14} />
                  Clear filters
                </button>
              )}
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 shadow-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Position
                  </label>
                  <select
                    value={filterPosition}
                    onChange={(e) => setFilterPosition(e.target.value as Position | "")}
                    className="w-full p-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition duration-150 bg-white text-sm font-medium"
                  >
                    <option value="">All Positions</option>
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos} - {POSITION_LABELS[pos]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Skill Level
                  </label>
                  <select
                    value={filterSkill}
                    onChange={(e) => setFilterSkill(e.target.value ? (Number(e.target.value) as SkillLevel) : "")}
                    className="w-full p-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition duration-150 bg-white text-sm font-medium"
                  >
                    <option value="">All Skills</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((skill) => (
                      <option key={skill} value={skill}>
                        {skill} - {SKILL_LABELS[skill as SkillLevel]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Availability
                  </label>
                  <select
                    value={filterAvailability}
                    onChange={(e) => setFilterAvailability(e.target.value as "all" | "available" | "unavailable")}
                    className="w-full p-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition duration-150 bg-white text-sm font-medium"
                  >
                    <option value="all">All Players</option>
                    <option value="available">Available Only</option>
                    <option value="unavailable">Unavailable Only</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Results Count */}
          {activeFiltersCount > 0 && filteredAvailability.length > 0 && (
            <div className="text-xs sm:text-sm text-slate-600 font-medium mb-2 px-1">
              Showing {filteredAvailability.length} of {sortedAvailability.length} player{filteredAvailability.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Player List */}
          {filteredAvailability.length === 0 ? (
            <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-amber-50 rounded-2xl border-2 border-dashed border-amber-200">
              <p className="text-slate-600 mb-2 font-medium">No players match your filters.</p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold underline"
                  type="button"
                >
                  Clear filters to see all players
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto p-4 custom-scrollbar">
              {filteredAvailability.map((player) => (
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
        </>
        )}
      </div>

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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-50/98 via-white/98 to-slate-50/98 backdrop-blur-xl w-[calc(100%-2rem)] max-w-full sm:max-w-md mx-4 my-4 sm:my-8 max-h-[90vh] sm:max-h-[85vh] rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.4)] border-2 border-red-200/60 p-5 sm:p-6 md:p-8 relative overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            {/* Decorative background elements */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-200/40 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-rose-200/40 rounded-full blur-3xl"></div>
            </div>
            
            <button
              onClick={() => setPlayerToDelete(null)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-white/95 backdrop-blur-sm border-2 border-slate-200/60 rounded-full shadow-lg hover:shadow-xl hover:bg-white hover:border-slate-300 transition-all duration-200 hover:scale-110 active:scale-95 group"
              type="button"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
            </button>
            
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
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-yellow-200/40 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-200/40 rounded-full blur-3xl"></div>
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
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-200/40 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-rose-200/40 rounded-full blur-3xl"></div>
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
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-200/40 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-orange-200/40 rounded-full blur-3xl"></div>
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

