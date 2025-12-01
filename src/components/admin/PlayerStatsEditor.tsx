import React, { useState, useEffect, useMemo } from "react";
import { BarChart3, Save, X, Search, Filter, XCircle, TrendingUp, Target, Footprints, Award, Users } from "lucide-react";
import { collection, getDocs, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { PlayerAvailability } from "../../types/player";
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
  pointsHistory: any[];
}

interface PlayerStatsEditorProps {
  db: any;
  players: PlayerAvailability[];
  currentUserId: string;
  currentUserEmail: string;
  isActive?: boolean;
}

const PlayerStatsEditor: React.FC<PlayerStatsEditorProps> = ({
  db,
  players,
  currentUserId,
  currentUserEmail,
  isActive = false,
}) => {
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerPoints>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    goals: number;
    assists: number;
    totalPoints: number;
  } | null>(null);

  // Load all player stats
  useEffect(() => {
    if (!db || players.length === 0) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        const pointsPath = `artifacts/${appId}/public/data/playerPoints`;
        const pointsRef = collection(db, pointsPath);
        
        const snapshot = await getDocs(pointsRef);
        const statsData: Record<string, PlayerPoints> = {};

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.playerId) {
            const gamesPlayed = (data.pointsHistory || []).filter(
              (entry: any) => entry.reason === "Played in game" && entry.automatic === true
            ).length;

            statsData[data.playerId] = {
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

        // Initialize stats for players that don't have any yet
        players.forEach((player) => {
          if (!statsData[player.id]) {
            statsData[player.id] = {
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

        setPlayerStats(statsData);
      } catch (err: any) {
        console.error("Error fetching player stats:", err);
        setError("Failed to load player stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [db, players]);

  // Filter players based on search
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const stats = playerStats[player.id];
      const name = (stats?.playerName || player.name || "").toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });
  }, [players, playerStats, searchQuery]);

  const handleEditClick = (playerId: string) => {
    const stats = playerStats[playerId];
    if (stats) {
      setEditingPlayerId(playerId);
      setEditForm({
        goals: stats.goals || 0,
        assists: stats.assists || 0,
        totalPoints: stats.totalPoints || 0,
      });
      setError(null);
      setSuccess(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingPlayerId(null);
    setEditForm(null);
    setError(null);
    setSuccess(null);
  };

  const handleSaveEdit = async () => {
    if (!db || !editingPlayerId || !editForm) return;

    setSaving(editingPlayerId);
    setError(null);
    setSuccess(null);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const pointsPath = `artifacts/${appId}/public/data/playerPoints/${editingPlayerId}`;
      const pointsRef = doc(db, pointsPath);
      const existingDoc = await getDoc(pointsRef);

      const existingData = existingDoc.exists() ? existingDoc.data() : {};
      const player = players.find((p) => p.id === editingPlayerId);

      // Create audit entry in points history
      const auditEntry = {
        points: editForm.totalPoints - (existingData.totalPoints || 0),
        reason: `Admin updated stats (Goals: ${editForm.goals}, Assists: ${editForm.assists}, Points: ${editForm.totalPoints})`,
        addedBy: currentUserId,
        addedByEmail: currentUserEmail,
        addedAt: Timestamp.now(),
        adminEdit: true,
      };

      const updatedHistory = existingData.pointsHistory || [];
      if (auditEntry.points !== 0 || editForm.goals !== (existingData.goals || 0) || editForm.assists !== (existingData.assists || 0)) {
        updatedHistory.push(auditEntry);
      }

      await setDoc(
        pointsRef,
        {
          playerId: editingPlayerId,
          playerName: player?.name || existingData.playerName || "Unknown",
          goals: editForm.goals,
          assists: editForm.assists,
          totalPoints: editForm.totalPoints,
          motmAwards: existingData.motmAwards || 0,
          pointsHistory: updatedHistory,
        },
        { merge: true }
      );

      // Update local state
      setPlayerStats((prev) => ({
        ...prev,
        [editingPlayerId]: {
          ...prev[editingPlayerId],
          goals: editForm.goals,
          assists: editForm.assists,
          totalPoints: editForm.totalPoints,
        },
      }));

      setSuccess(`Successfully updated stats for ${player?.name || "player"}`);
      setEditingPlayerId(null);
      setEditForm(null);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("Error updating player stats:", err);
      setError(`Failed to update stats: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-12 h-12 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-medium">Loading player stats...</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden backdrop-blur-xl p-4 sm:p-6 rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.15)] -mt-[1px] ${
      isActive
        ? "bg-gradient-to-br from-purple-50/95 via-indigo-50/95 to-blue-50/95 border-l-2 border-r-2 border-b-2 border-purple-500/70"
        : "bg-white/90 border border-white/70 border-t-0"
    }`}>
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-purple-200/50 blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-200/50 blur-[80px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
              <BarChart3 className="text-purple-600" size={24} />
              Edit Player Statistics
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-2">
              Update goals, assists, points, and games for any player
            </p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 text-emerald-700 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-md">
            <Award className="w-4 h-4" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-2xl text-sm font-semibold shadow-md">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search players by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 p-3.5 border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md text-sm font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full transition"
                type="button"
              >
                <XCircle className="text-slate-400 hover:text-slate-600" size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Players List */}
        {filteredPlayers.length === 0 ? (
          <div className="text-center p-12 bg-gradient-to-br from-slate-100 to-purple-50 rounded-2xl border-2 border-dashed border-purple-200 shadow-lg">
            <Users className="mx-auto text-purple-400 mb-4" size={48} />
            <p className="text-slate-600 font-semibold text-lg mb-2">No players found</p>
            <p className="text-sm text-slate-500">
              {searchQuery ? "Try adjusting your search query" : "No players available"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {filteredPlayers.map((player) => {
              const stats = playerStats[player.id];
              const isEditing = editingPlayerId === player.id;
              
              return (
                <div
                  key={player.id}
                  className={`p-5 rounded-2xl border-2 shadow-md hover:shadow-lg transition-all duration-200 ${
                    isEditing
                      ? "bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-purple-300"
                      : "bg-gradient-to-r from-white to-purple-50/30 border-purple-200/60"
                  }`}
                >
                  {isEditing && editForm ? (
                    // Edit Mode
                    <div className="space-y-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                            <Users className="text-white" size={22} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-slate-800">{stats?.playerName || player.name}</h4>
                            <p className="text-xs text-slate-500 font-medium">{player.position}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleCancelEdit}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          type="button"
                        >
                          <X className="text-slate-600" size={20} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-red-200/60 shadow-sm">
                          <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Target className="text-red-500" size={16} />
                            Goals
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editForm.goals}
                            onChange={(e) => setEditForm({ ...editForm, goals: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full p-3 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500/50 focus:border-red-500 text-base font-bold text-red-600 transition-all"
                          />
                        </div>
                        <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-blue-200/60 shadow-sm">
                          <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Footprints className="text-blue-500" size={16} />
                            Assists
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editForm.assists}
                            onChange={(e) => setEditForm({ ...editForm, assists: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full p-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-base font-bold text-blue-600 transition-all"
                          />
                        </div>
                        <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-amber-200/60 shadow-sm">
                          <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <TrendingUp className="text-amber-500" size={16} />
                            Points
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editForm.totalPoints}
                            onChange={(e) => setEditForm({ ...editForm, totalPoints: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full p-3 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-base font-bold text-amber-600 transition-all"
                          />
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gradient-to-r from-slate-50 to-emerald-50/50 rounded-xl border-2 border-emerald-200/60 shadow-sm">
                        <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                          <Users className="text-emerald-500" size={16} />
                          <span>Games Played: <strong className="text-emerald-700">{stats?.gamesPlayed || 0}</strong> (calculated from points history)</span>
                        </p>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t-2 border-purple-200">
                        <button
                          onClick={handleCancelEdit}
                          disabled={saving === player.id}
                          className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all duration-200 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving === player.id}
                          className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 transform hover:scale-105 active:scale-95"
                        >
                          {saving === player.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save size={16} />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg flex-shrink-0">
                          <Users className="text-white" size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-lg text-slate-800 truncate">{stats?.playerName || player.name}</h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{player.position}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3 sm:gap-4 flex-shrink-0 w-full sm:w-auto">
                        <div className="text-center p-3 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border-2 border-red-200/60 shadow-sm">
                          <div className="text-xs text-slate-600 font-semibold mb-1">Goals</div>
                          <div className="text-2xl font-bold text-red-600">{stats?.goals || 0}</div>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200/60 shadow-sm">
                          <div className="text-xs text-slate-600 font-semibold mb-1">Assists</div>
                          <div className="text-2xl font-bold text-blue-600">{stats?.assists || 0}</div>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-200/60 shadow-sm">
                          <div className="text-xs text-slate-600 font-semibold mb-1">Points</div>
                          <div className="text-2xl font-bold text-amber-600">{stats?.totalPoints || 0}</div>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-200/60 shadow-sm">
                          <div className="text-xs text-slate-600 font-semibold mb-1">Games</div>
                          <div className="text-2xl font-bold text-emerald-600">{stats?.gamesPlayed || 0}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEditClick(player.id)}
                        disabled={saving !== null}
                        className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 transform hover:scale-105 active:scale-95 sm:flex-shrink-0 w-full sm:w-auto justify-center"
                      >
                        <Save size={16} />
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerStatsEditor;
