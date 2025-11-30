import React, { useState, useEffect, useMemo } from "react";
import { X, Trophy, Star, Target, Footprints, Users, TrendingUp, Award, Calendar } from "lucide-react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { FirestorePaths } from "../../utils/firestorePaths";
import { getFormattedDate, getTimestampMs } from "../../utils/timestampHelpers";
import { Player } from "../../types/player";

interface PlayerProfileModalProps {
  player: Player;
  playerStats: {
    totalPoints: number;
    motmAwards: number;
    goals: number;
    assists: number;
    gamesPlayed: number;
    pointsHistory: any[];
  };
  db: any;
  onClose: () => void;
}

interface MOTMAward {
  gameDate: string;
  voteCount: number;
  awardedAt: Timestamp | any;
}


const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  player,
  playerStats,
  db,
  onClose,
}) => {
  const [motmAwards, setMotmAwards] = useState<MOTMAward[]>([]);
  const [attendanceRate, setAttendanceRate] = useState<number>(0);

  // Calculate attendance rate
  useEffect(() => {
    if (!playerStats.pointsHistory || playerStats.gamesPlayed === 0) {
      setAttendanceRate(0);
      return;
    }

    // Get unique game dates from points history
    const gameDates = new Set<string>();
    playerStats.pointsHistory.forEach((entry: any) => {
      if (entry.reason === "Played in game" && entry.matchDate) {
        gameDates.add(entry.matchDate);
      }
    });

    // TODO: Get total games scheduled (this would require game schedule data)
    // For now, use gamesPlayed as the denominator
    const totalGames = playerStats.gamesPlayed;
    const rate = totalGames > 0 ? (playerStats.gamesPlayed / totalGames) * 100 : 0;
    setAttendanceRate(Math.round(rate));
  }, [playerStats]);

  // Fetch MOTM awards
  useEffect(() => {
    if (!db) return;

    const fetchMOTMAwards = async () => {
      try {
        const awardsPath = FirestorePaths.motmAwards();
        const awardsRef = collection(db, awardsPath);
        const q = query(awardsRef, where("playerId", "==", player.id));
        const snapshot = await getDocs(q);
        
        const awards: MOTMAward[] = snapshot.docs.map((docSnap) => ({
          gameDate: docSnap.data().gameDate,
          voteCount: docSnap.data().voteCount || 0,
          awardedAt: docSnap.data().awardedAt,
        }));

        // Sort by awardedAt timestamp (newest first)
        const sortedAwards = [...awards].sort((a, b) => {
          const aTime = getTimestampMs(a.awardedAt);
          const bTime = getTimestampMs(b.awardedAt);
          return bTime - aTime;
        });
        setMotmAwards(sortedAwards);
      } catch (err) {
        console.error("Error fetching MOTM awards:", err);
      }
    };

    fetchMOTMAwards();
  }, [db, player.id]);


  // Calculate goals per game and assists per game
  const goalsPerGame = useMemo(() => {
    return playerStats.gamesPlayed > 0 
      ? (playerStats.goals / playerStats.gamesPlayed).toFixed(2)
      : "0.00";
  }, [playerStats.goals, playerStats.gamesPlayed]);

  const assistsPerGame = useMemo(() => {
    return playerStats.gamesPlayed > 0 
      ? (playerStats.assists / playerStats.gamesPlayed).toFixed(2)
      : "0.00";
  }, [playerStats.assists, playerStats.gamesPlayed]);

  // Points history sorted by date
  const sortedPointsHistory = useMemo(() => {
    const history = [...playerStats.pointsHistory];
    return history.sort((a: any, b: any) => {
      const aTime = getTimestampMs(a.addedAt);
      const bTime = getTimestampMs(b.addedAt);
      return bTime - aTime; // Newest first
    });
  }, [playerStats.pointsHistory]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-gradient-to-br from-slate-50/95 via-white/95 to-slate-50/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.3)] border-2 border-slate-200/60 max-w-4xl w-full p-5 sm:p-6 md:p-7 relative my-auto max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-200/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-purple-200/30 rounded-full blur-3xl"></div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-200/60 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 z-20"
          type="button"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>

        <div className="relative z-10">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              {player.name}
            </h2>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="font-semibold">{player.position}</span>
              <span>•</span>
              <span>Skill Level: {player.skillLevel}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-4 border-2 border-amber-300">
              <Trophy className="text-amber-600 mb-2" size={24} />
              <div className="text-2xl font-bold text-amber-700">{playerStats.totalPoints}</div>
              <div className="text-xs font-semibold text-amber-600">Total Points</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl p-4 border-2 border-yellow-300">
              <Star className="text-yellow-600 mb-2" size={24} />
              <div className="text-2xl font-bold text-yellow-700">{playerStats.motmAwards}</div>
              <div className="text-xs font-semibold text-yellow-600">MOTM Awards</div>
            </div>
            <div className="bg-gradient-to-br from-red-100 to-pink-100 rounded-xl p-4 border-2 border-red-300">
              <Target className="text-red-600 mb-2" size={24} />
              <div className="text-2xl font-bold text-red-700">{playerStats.goals}</div>
              <div className="text-xs font-semibold text-red-600">Goals</div>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl p-4 border-2 border-blue-300">
              <Footprints className="text-blue-600 mb-2" size={24} />
              <div className="text-2xl font-bold text-blue-700">{playerStats.assists}</div>
              <div className="text-xs font-semibold text-blue-600">Assists</div>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-4 border-2 border-green-300">
              <Users className="text-green-600 mb-2" size={24} />
              <div className="text-2xl font-bold text-green-700">{playerStats.gamesPlayed}</div>
              <div className="text-xs font-semibold text-green-600">Games Played</div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-100 rounded-xl p-4 border-2 border-slate-300">
              <div className="text-sm font-semibold text-slate-600 mb-1">Goals per Game</div>
              <div className="text-2xl font-bold text-slate-800">{goalsPerGame}</div>
            </div>
            <div className="bg-slate-100 rounded-xl p-4 border-2 border-slate-300">
              <div className="text-sm font-semibold text-slate-600 mb-1">Assists per Game</div>
              <div className="text-2xl font-bold text-slate-800">{assistsPerGame}</div>
            </div>
            <div className="bg-slate-100 rounded-xl p-4 border-2 border-slate-300">
              <div className="text-sm font-semibold text-slate-600 mb-1">Attendance Rate</div>
              <div className="text-2xl font-bold text-slate-800">{attendanceRate}%</div>
            </div>
          </div>

          {/* MOTM Awards */}
          {motmAwards.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Award className="text-yellow-600" size={20} />
                Man of the Match Awards
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {motmAwards.map((award, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-3 border-2 border-yellow-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-yellow-800">Game: {award.gameDate}</div>
                        <div className="text-xs text-yellow-600">
                          {award.voteCount} {award.voteCount === 1 ? "vote" : "votes"}
                        </div>
                      </div>
                      {award.awardedAt && (
                        <div className="text-xs text-slate-500">
                          {getFormattedDate(award.awardedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Points History */}
          {sortedPointsHistory.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
                <TrendingUp className="text-indigo-600" size={20} />
                Recent Points History
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {sortedPointsHistory.slice(0, 10).map((entry: any, index: number) => (
                  <div
                    key={index}
                    className="bg-slate-50 rounded-lg p-3 border-2 border-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800">+{entry.points} points</div>
                        <div className="text-sm text-slate-600">{entry.reason}</div>
                        {entry.matchDate && (
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Calendar size={12} />
                            {entry.matchDate}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 text-right">
                        {entry.addedAt && getFormattedDate(entry.addedAt)}
                        <div className="text-xs text-slate-400">by {entry.addedBy || "System"}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerProfileModal;

