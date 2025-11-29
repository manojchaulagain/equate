import React, { useState, useEffect } from "react";
import { Trophy, Award, Plus, TrendingUp, Star } from "lucide-react";
import { collection, onSnapshot, doc, setDoc, Timestamp, getDocs, getDoc } from "firebase/firestore";

declare const __app_id: string;

interface PlayerPoints {
  playerId: string;
  playerName: string;
  totalPoints: number;
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

  const isAdmin = userRole === "admin";

  useEffect(() => {
    if (!db || players.length === 0) return;

    const fetchPoints = async () => {
      try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const pointsPath = `artifacts/${appId}/public/data/playerPoints`;
      const pointsRef = collection(db, pointsPath);
      
      const snapshot = await getDocs(pointsRef);
      const pointsData: { [playerId: string]: PlayerPoints } = {};

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.playerId) {
          pointsData[data.playerId] = {
            playerId: data.playerId,
            playerName: data.playerName,
            totalPoints: data.totalPoints || 0,
            pointsHistory: data.pointsHistory || [],
          };
        }
      });

        // Initialize points for players that don't have any yet
        players.forEach((player) => {
          if (!pointsData[player.id]) {
            pointsData[player.id] = {
              playerId: player.id,
              playerName: player.name,
              totalPoints: 0,
              pointsHistory: [],
            };
          }
        });

        const sortedPoints = Object.values(pointsData).sort((a, b) => b.totalPoints - a.totalPoints);
        setPlayerPoints(sortedPoints);
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching points:", err);
        setError("Failed to load leaderboard.");
        setLoading(false);
      }
    };

    fetchPoints();

    // Set up real-time listener
    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const pointsPath = `artifacts/${appId}/public/data/playerPoints`;
    const pointsRef = collection(db, pointsPath);

    const unsubscribe = onSnapshot(pointsRef, (snapshot) => {
      const pointsData: { [playerId: string]: PlayerPoints } = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        pointsData[data.playerId] = {
          playerId: data.playerId,
          playerName: data.playerName,
          totalPoints: data.totalPoints || 0,
          pointsHistory: data.pointsHistory || [],
        };
      });

      players.forEach((player) => {
        if (!pointsData[player.id]) {
          pointsData[player.id] = {
            playerId: player.id,
            playerName: player.name,
            totalPoints: 0,
            pointsHistory: [],
          };
        }
      });

      const sortedPoints = Object.values(pointsData).sort((a, b) => b.totalPoints - a.totalPoints);
      setPlayerPoints(sortedPoints);
    });

    return () => unsubscribe();
  }, [db, players]);

  const handleAddPoints = async () => {
    if (!selectedPlayer || !points || !reason.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    const pointsNum = parseInt(points);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      setError("Points must be a positive number.");
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
              <Trophy className="text-amber-600" size={24} />
              Leaderboard
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
              {isAdmin ? "View player rankings and assign points based on performance." : "View player rankings and performance points."}
            </p>
          </div>
          {isAdmin && (
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

        {loading ? (
          <div className="text-center p-8">
            <p className="text-slate-600 font-medium">Loading leaderboard...</p>
          </div>
        ) : playerPoints.length === 0 ? (
          <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-amber-50 rounded-2xl border-2 border-dashed border-amber-200">
            <Trophy className="mx-auto text-amber-400 mb-3" size={48} />
            <p className="text-slate-600 font-medium">No points recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
            {playerPoints.map((player, index) => (
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
                      <p className="font-bold text-slate-800 text-base sm:text-lg truncate">
                        {player.playerName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {player.pointsHistory.length} {player.pointsHistory.length === 1 ? "entry" : "entries"}
                      </p>
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
      </div>

      {/* Add Points Modal */}
      {showAddPointsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-4 sm:p-5 md:p-6 relative my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowAddPointsModal(false);
                setError(null);
                setSelectedPlayer("");
                setPoints("");
                setReason("");
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Plus className="w-6 h-6 rotate-45" />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center">
              <Plus className="mr-2 text-amber-600" size={24} /> Add Points
            </h2>

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
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-150 bg-white"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select a player</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
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
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-150"
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
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-150 resize-none"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                onClick={handleAddPoints}
                disabled={isSubmitting || !selectedPlayer || !points || !reason.trim()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={20} /> {isSubmitting ? 'Adding...' : 'Add Points'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;

