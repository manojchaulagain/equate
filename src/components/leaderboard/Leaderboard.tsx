import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Trophy, Award, Plus, TrendingUp, Star, X, Target, Users, Footprints, Search, Filter, XCircle } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { collection, onSnapshot, doc, setDoc, Timestamp, getDoc } from "firebase/firestore";
import { GameSchedule } from "../../utils/gameSchedule";
import { isTodayGameDayPassed } from "../../utils/gamePoints";
import PlayerProfileModal from "../players/PlayerProfileModal";
import { Player, Position, SkillLevel } from "../../types/player";
import { POSITION_LABELS, POSITIONS } from "../../constants/player";
import LeagueTable from "../league/LeagueTable";
import { GameResult, TeamStanding } from "../../types/league";
import { calculateStandings } from "../../utils/leagueTable";
import { FirestorePaths } from "../../utils/firestorePaths";

declare const __app_id: string;

interface PlayerPoints {
  playerId: string;
  playerName: string;
  totalPoints: number;
  motmAwards?: number;
  goals?: number;
  assists?: number;
  gamesPlayed?: number;
  pointsHistory: {
    points: number;
    reason: string;
    addedBy: string;
    addedAt: Timestamp | any;
    matchDate?: string;
  }[];
}

interface LeaderboardProps {
  db: any;
  userId: string;
  userEmail: string;
  userRole: string;
  players: any[];
  isActive?: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ db, userId, userEmail, userRole, players, isActive = false }) => {
  const [playerPoints, setPlayerPoints] = useState<PlayerPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPointsModal, setShowAddPointsModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [points, setPoints] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [gameSchedule, setGameSchedule] = useState<GameSchedule | null>(null);
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<{ player: Player; stats: PlayerPoints } | null>(null);
  
  // League table state
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [leagueStandings, setLeagueStandings] = useState<TeamStanding[]>([]);
  const [loadingLeagueTable, setLoadingLeagueTable] = useState(true);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterPosition, setFilterPosition] = useState<Position | "">("");
  const [filterMinPoints, setFilterMinPoints] = useState<string>("");
  const [filterMaxPoints, setFilterMaxPoints] = useState<string>("");
  const [sortBy, setSortBy] = useState<"points" | "goals" | "assists" | "games">("points");
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = userRole === "admin";

  // Filter players that the current user can add points for
  const getAvailablePlayers = () => {
    if (isAdmin) {
      // Admins can add points for anyone
      return players;
    }
    // Regular users cannot add points for themselves or players they registered
    return players.filter(
      (player) => player.userId !== userId && player.registeredBy !== userId
    );
  };

  const availablePlayers = getAvailablePlayers();

  // Fetch game schedule
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
        } else {
          setGameSchedule(null);
        }
      },
      (err) => {
        console.error("Error fetching game schedule:", err);
      }
    );

    return () => unsubscribe();
  }, [db]);

  // Fetch game results for league table
  useEffect(() => {
    if (!db) return;

    setLoadingLeagueTable(true);
    const gameResultsPath = FirestorePaths.gameResults();
    const gameResultsRef = collection(db, gameResultsPath);

    const unsubscribe = onSnapshot(
      gameResultsRef,
      (snapshot) => {
        const results = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GameResult[];
        setGameResults(results);
        setLoadingLeagueTable(false);
      },
      (err) => {
        console.error("Error fetching game results:", err);
        setLoadingLeagueTable(false);
      }
    );

    return () => unsubscribe();
  }, [db]);

  // Calculate standings when game results change
  useEffect(() => {
    if (gameResults.length > 0) {
      const standings = calculateStandings(gameResults);
      setLeagueStandings(standings);
    } else {
      setLeagueStandings([]);
    }
  }, [gameResults]);

  // Helper function to process points data - extracted to avoid duplication
  const processPointsData = useCallback((docs: any[], playersList: any[]) => {
    const pointsData: { [playerId: string]: PlayerPoints } = {};
    
    docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.playerId) {
        // Calculate games played from points history
        const gamesPlayed = (data.pointsHistory || []).filter(
          (entry: any) => entry.reason === "Played in game" && entry.automatic === true
        ).length;

        pointsData[data.playerId] = {
          playerId: data.playerId,
          playerName: data.playerName,
          totalPoints: data.totalPoints || 0,
          motmAwards: data.motmAwards || 0,
          goals: data.goals || 0,
          assists: data.assists || 0,
          gamesPlayed: gamesPlayed,
          pointsHistory: data.pointsHistory || [],
        };
      }
    });

    // Initialize points for players that don't have any yet
    playersList.forEach((player) => {
      if (!pointsData[player.id]) {
        pointsData[player.id] = {
          playerId: player.id,
          playerName: player.name,
          totalPoints: 0,
          motmAwards: 0,
          goals: 0,
          assists: 0,
          gamesPlayed: 0,
          pointsHistory: [],
        };
      }
    });

    return Object.values(pointsData).sort((a, b) => b.totalPoints - a.totalPoints);
  }, []);

  // Single optimized Firestore listener - removes duplicate initial fetch
  useEffect(() => {
    if (!db || players.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const pointsPath = `artifacts/${appId}/public/data/playerPoints`;
    const pointsRef = collection(db, pointsPath);

    // Use onSnapshot only - it handles both initial load and real-time updates
    const unsubscribe = onSnapshot(
      pointsRef,
      (snapshot) => {
        const processedPoints = processPointsData(snapshot.docs, players);
        setPlayerPoints(processedPoints);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching points:", err);
        setError("Failed to load leaderboard.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, players, processPointsData]);

  const handleAddPoints = async () => {
    if (!selectedPlayer || !points || !reason.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    // Must be after a game day
    const canAddPointsToday = isTodayGameDayPassed(gameSchedule?.schedule || null);
    if (!canAddPointsToday) {
      setError("You can only add performance points after a game day.");
      return;
    }

    const pointsNum = parseInt(points);
    if (isNaN(pointsNum) || pointsNum < 1 || pointsNum > 5) {
      setError("Points must be between 1 and 5.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const pointsPath = `artifacts/${appId}/public/data/playerPoints/${selectedPlayer}`;
      const pointsRef = doc(db, pointsPath);

      const player = players.find((p) => p.id === selectedPlayer);
      if (!player) {
        throw new Error("Player not found");
      }

      const existingPointsPath = `artifacts/${appId}/public/data/playerPoints/${selectedPlayer}`;
      const existingPointsRef = doc(db, existingPointsPath);
      const existingDoc = await getDoc(existingPointsRef);
      
      let existingPoints = 0;
      let existingHistory: any[] = [];

      if (existingDoc.exists()) {
        const data = existingDoc.data();
        existingPoints = data.totalPoints || 0;
        existingHistory = data.pointsHistory || [];
      }

      const newTotal = existingPoints + pointsNum;
      const newHistoryEntry = {
        points: pointsNum,
        reason: reason.trim(),
        addedBy: userEmail,
        addedAt: Timestamp.now(),
      };

      await setDoc(
        pointsRef,
        {
          playerId: selectedPlayer,
          playerName: player.name,
          totalPoints: newTotal,
          pointsHistory: [...existingHistory, newHistoryEntry],
        },
        { merge: false }
      );

      setSuccess("Points added successfully!");
      setSelectedPlayer("");
      setPoints("");
      setReason("");
      setShowAddPointsModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error adding points:", err);
      setError(`Failed to add points: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get player data for each playerPoints entry
  const playerPointsWithFullData = useMemo(() => {
    return playerPoints.map((pp) => {
      const fullPlayer = players.find((p) => p.id === pp.playerId);
      return {
        ...pp,
        position: fullPlayer?.position || "CM" as Position,
        skillLevel: fullPlayer?.skillLevel || 5 as SkillLevel,
      };
    });
  }, [playerPoints, players]);

  // Debounce search query to reduce filtering operations
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Filter and sort players - Optimized with debounced search
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = playerPointsWithFullData.filter((pp) => {
      // Search filter (using debounced query)
      if (debouncedSearchQuery.trim() && !pp.playerName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) {
        return false;
      }
      
      // Position filter
      if (filterPosition && pp.position !== filterPosition) {
        return false;
      }
      
      // Points range filter
      const minPoints = filterMinPoints ? parseInt(filterMinPoints) : 0;
      const maxPoints = filterMaxPoints ? parseInt(filterMaxPoints) : Infinity;
      if (pp.totalPoints < minPoints || pp.totalPoints > maxPoints) {
        return false;
      }
      
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "goals":
          return (b.goals || 0) - (a.goals || 0);
        case "assists":
          return (b.assists || 0) - (a.assists || 0);
        case "games":
          return (b.gamesPlayed || 0) - (a.gamesPlayed || 0);
        case "points":
        default:
          return b.totalPoints - a.totalPoints;
      }
    });

    return filtered;
  }, [playerPointsWithFullData, debouncedSearchQuery, filterPosition, filterMinPoints, filterMaxPoints, sortBy]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filterPosition) count++;
    if (filterMinPoints) count++;
    if (filterMaxPoints) count++;
    if (sortBy !== "points") count++;
    return count;
  }, [searchQuery, filterPosition, filterMinPoints, filterMaxPoints, sortBy]);

  // Clear all filters - Memoized callback
  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterPosition("");
    setFilterMinPoints("");
    setFilterMaxPoints("");
    setSortBy("points");
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="text-yellow-500" size={24} />;
    if (rank === 2) return <Trophy className="text-gray-400" size={24} />;
    if (rank === 3) return <Trophy className="text-orange-600" size={24} />;
    return <span className="text-slate-600 font-bold text-lg w-6 text-center">{rank}</span>;
  };

  return (
    <div className={`relative overflow-hidden backdrop-blur-xl p-4 sm:p-6 rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.15)] -mt-[1px] ${
      isActive 
        ? "bg-gradient-to-br from-amber-50/95 via-yellow-50/95 to-amber-50/95 border-l-2 border-r-2 border-b-2 border-amber-500/70" 
        : "bg-white/90 border border-white/70 border-t-0"
    }`}>
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-amber-200/50 blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-yellow-200/50 blur-[80px]" />
      </div>
      <div className="relative z-10">
        {/* League Table Section - At the very top */}
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
              <Trophy className="text-amber-600" size={24} />
              League Table
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-2">
              Team standings based on game results. Win = 3 pts | Draw = 1 pt | Loss = 0 pts
            </p>
          </div>
          <LeagueTable standings={leagueStandings} isLoading={loadingLeagueTable} />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
              <Trophy className="text-amber-600" size={24} />
              Leaderboard
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-2">
              {isAdmin 
                ? "View player rankings and assign points based on performance." 
                : availablePlayers.length > 0
                ? "View player rankings and assign points for other players."
                : "View player rankings and performance points."}
            </p>
          </div>
          {availablePlayers.length > 0 && (
            <button
              onClick={() => setShowAddPointsModal(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-2xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Points</span>
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border-2 border-emerald-300 text-emerald-700 rounded-xl text-sm font-semibold flex items-center gap-2">
            <Award className="w-4 h-4" />
            {success}
          </div>
        )}

        {/* Always render container to prevent layout shift */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="text-center p-8 min-h-[400px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-transparent border-t-amber-600 rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-600 font-medium">Loading leaderboard...</p>
              </div>
            </div>
          ) : playerPoints.length === 0 ? (
            <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-amber-50 rounded-2xl border-2 border-dashed border-amber-200 min-h-[400px] flex flex-col items-center justify-center">
              <Trophy className="mx-auto text-amber-400 mb-3" size={48} />
              <p className="text-slate-600 font-medium">No points recorded yet.</p>
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
                  className="w-full pl-10 pr-10 py-2.5 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md text-sm font-medium"
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
                      ? "bg-amber-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  type="button"
                >
                  <Filter size={16} />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="bg-white text-amber-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-semibold text-slate-600 hover:text-amber-600 transition-colors flex items-center gap-1"
                    type="button"
                  >
                    <XCircle size={14} />
                    Clear filters
                  </button>
                )}
              </div>

              {/* Filter Options */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-200 shadow-sm">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                      Position
                    </label>
                    <select
                      value={filterPosition}
                      onChange={(e) => setFilterPosition(e.target.value as Position | "")}
                      className="w-full p-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 bg-white text-sm font-medium"
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
                      Min Points
                    </label>
                    <input
                      type="number"
                      value={filterMinPoints}
                      onChange={(e) => setFilterMinPoints(e.target.value)}
                      placeholder="Min"
                      min="0"
                      className="w-full p-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 bg-white text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                      Max Points
                    </label>
                    <input
                      type="number"
                      value={filterMaxPoints}
                      onChange={(e) => setFilterMaxPoints(e.target.value)}
                      placeholder="Max"
                      min="0"
                      className="w-full p-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 bg-white text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "points" | "goals" | "assists" | "games")}
                      className="w-full p-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 bg-white text-sm font-medium"
                    >
                      <option value="points">Points</option>
                      <option value="goals">Goals</option>
                      <option value="assists">Assists</option>
                      <option value="games">Games Played</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Results Count */}
            {activeFiltersCount > 0 && filteredAndSortedPlayers.length > 0 && (
              <div className="text-xs sm:text-sm text-slate-600 font-medium mb-2 px-1">
                Showing {filteredAndSortedPlayers.length} of {playerPoints.length} player{filteredAndSortedPlayers.length !== 1 ? 's' : ''}
              </div>
            )}

            {/* Player List */}
            {filteredAndSortedPlayers.length === 0 ? (
              <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-amber-50 rounded-2xl border-2 border-dashed border-amber-200">
                <p className="text-slate-600 mb-2 font-medium">No players match your filters.</p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-amber-600 hover:text-amber-700 font-semibold underline"
                    type="button"
                  >
                    Clear filters to see all players
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {filteredAndSortedPlayers.map((player, index) => (
              <div
                key={player.playerId}
                className={`p-4 rounded-2xl border-2 shadow-md ${
                  index === 0
                    ? "bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-300"
                    : index === 1
                    ? "bg-gradient-to-r from-gray-100 to-slate-100 border-gray-300"
                    : index === 2
                    ? "bg-gradient-to-r from-orange-100 to-amber-100 border-orange-300"
                    : "bg-gradient-to-r from-white to-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getRankIcon(index + 1)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p 
                          className="font-bold text-slate-800 text-base sm:text-lg truncate cursor-pointer hover:text-indigo-600 transition-colors"
                          onClick={() => {
                            const fullPlayer = players.find(p => p.id === player.playerId);
                            if (fullPlayer) {
                              setSelectedPlayerProfile({
                                player: fullPlayer,
                                stats: player,
                              });
                            }
                          }}
                          title="Click to view player profile"
                        >
                          {player.playerName}
                        </p>
                        {(() => {
                          const fullPlayer = players.find(p => p.id === player.playerId);
                          return fullPlayer?.jerseyNumber !== undefined && fullPlayer?.jerseyNumber !== null ? (
                            <span className="flex-shrink-0 px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-white shadow-md border-2 border-white/30">
                              #{fullPlayer.jerseyNumber}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
                        {(player.motmAwards || 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="text-yellow-500" size={12} />
                            <span className="text-xs font-semibold text-yellow-600">
                              {player.motmAwards} {player.motmAwards === 1 ? "MOTM" : "MOTM"}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Target className="text-red-500" size={12} />
                          <span className="text-xs font-semibold text-slate-700">
                            {player.goals || 0} {player.goals === 1 ? "Goal" : "Goals"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Footprints className="text-blue-500" size={12} />
                          <span className="text-xs font-semibold text-slate-700">
                            {player.assists || 0} {player.assists === 1 ? "Assist" : "Assists"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="text-green-500" size={12} />
                          <span className="text-xs font-semibold text-slate-700">
                            {player.gamesPlayed || 0} {player.gamesPlayed === 1 ? "Game" : "Games"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <TrendingUp className="text-amber-600" size={20} />
                    <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                      {player.totalPoints}
                    </span>
                    <span className="text-sm text-slate-500 font-medium">pts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
            )}
          </>
          )}
        </div>
      </div>

      {/* Add Points Modal */}
      {showAddPointsModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddPointsModal(false);
              setError(null);
              setSelectedPlayer("");
              setPoints("");
              setReason("");
            }
          }}
        >
          <div 
            className="bg-gradient-to-br from-slate-50/98 via-white/98 to-slate-50/98 backdrop-blur-xl w-[calc(100%-2rem)] max-w-full sm:max-w-2xl mx-4 my-4 sm:my-8 max-h-[90vh] sm:max-h-[85vh] rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.4)] border-2 border-amber-200/60 p-5 sm:p-6 md:p-8 relative overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background elements */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-200/40 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-orange-200/40 rounded-full blur-3xl"></div>
            </div>
            
            <button
              onClick={() => {
                setShowAddPointsModal(false);
                setError(null);
                setSelectedPlayer("");
                setPoints("");
                setReason("");
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
                  value={selectedPlayer}
                  onChange={(e) => {
                    setSelectedPlayer(e.target.value);
                    setError(null);
                  }}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select a player</option>
                  {availablePlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
                {!isAdmin && availablePlayers.length === 0 && (
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
                    setError(null);
                  }}
                  placeholder="Enter points"
                  min="1"
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason / Performance Note
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g., Great goal, Excellent defense, Man of the match performance..."
                  rows={4}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 resize-none bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold shadow-md">
                  {error}
                </div>
              )}

              <button
                onClick={handleAddPoints}
                disabled={isSubmitting || !selectedPlayer || !points || !reason.trim()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={20} /> {isSubmitting ? 'Adding...' : 'Add Points'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Profile Modal */}
      {selectedPlayerProfile && (
        <PlayerProfileModal
          player={selectedPlayerProfile.player}
          playerStats={{
            totalPoints: selectedPlayerProfile.stats.totalPoints,
            motmAwards: selectedPlayerProfile.stats.motmAwards || 0,
            goals: selectedPlayerProfile.stats.goals || 0,
            assists: selectedPlayerProfile.stats.assists || 0,
            gamesPlayed: selectedPlayerProfile.stats.gamesPlayed || 0,
            pointsHistory: selectedPlayerProfile.stats.pointsHistory,
          }}
          db={db}
          onClose={() => setSelectedPlayerProfile(null)}
        />
      )}
    </div>
  );
};

export default Leaderboard;

