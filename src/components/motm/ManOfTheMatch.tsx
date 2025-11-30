import React, { useState, useEffect } from "react";
import { Star, Trophy, Calendar, CheckCircle, X } from "lucide-react";
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, doc, getDoc, setDoc, where, getDocs } from "firebase/firestore";
import { calculateNextGame, GameSchedule } from "../../utils/gameSchedule";
import { isTodayGameDayPassed, getTodayGameDateString } from "../../utils/gamePoints";

declare const __app_id: string;

interface MOTMNomination {
  id: string;
  gameDate: string; // Date string for the game
  nominatedPlayerId: string;
  nominatedPlayerName: string;
  nominatedBy: string;
  nominatedByEmail: string;
  reason?: string;
  createdAt: Timestamp | any;
}

interface ManOfTheMatchProps {
  db: any;
  userId: string;
  userEmail: string;
  userRole: string;
  players: any[];
  isActive?: boolean;
}

const ManOfTheMatch: React.FC<ManOfTheMatchProps> = ({ db, userId, userEmail, userRole, players, isActive = false }) => {
  const [nominations, setNominations] = useState<MOTMNomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [gameSchedule, setGameSchedule] = useState<GameSchedule | null>(null);
  const [nextGame, setNextGame] = useState<{ date: Date; formatted: string } | null>(null);
  const [currentWeekNominations, setCurrentWeekNominations] = useState<MOTMNomination[]>([]);
  const [hasNominated, setHasNominated] = useState(false);

  const isAdmin = userRole === "admin";

  // Filter players that the current user can nominate
  const getAvailablePlayers = () => {
    if (isAdmin) {
      // Admins can nominate anyone
      return players;
    }
    // Regular users cannot nominate themselves or players they registered
    return players.filter(
      (player) => player.userId !== userId && player.registeredBy !== userId
    );
  };

  const availablePlayers = getAvailablePlayers();

  useEffect(() => {
    if (!db) return;

    // Fetch game schedule
    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const schedulePath = `artifacts/${appId}/public/data/gameSchedule/config`;
    const scheduleRef = doc(db, schedulePath);

    const unsubscribeSchedule = onSnapshot(
      scheduleRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as GameSchedule;
          setGameSchedule(data);
          const next = calculateNextGame(data);
          setNextGame(next);
        } else {
          setGameSchedule(null);
          setNextGame(null);
        }
      },
      (err) => {
        console.error("Error fetching game schedule:", err);
      }
    );

    // Fetch nominations
    const motmPath = `artifacts/${appId}/public/data/manOfTheMatch`;
    const motmRef = collection(db, motmPath);
    const q = query(motmRef, orderBy("createdAt", "desc"));

    const unsubscribeMotm = onSnapshot(
      q,
      (snapshot) => {
        const nominationsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MOTMNomination[];
        setNominations(nominationsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching MOTM nominations:", err);
        setError("Failed to load nominations.");
        setLoading(false);
      }
    );

    return () => {
      unsubscribeSchedule();
      unsubscribeMotm();
    };
  }, [db]);

  // Check if today was a game day
  const todayGameDate = gameSchedule ? getTodayGameDateString(gameSchedule.schedule) : null;
  const canNominateToday = todayGameDate !== null;

  // Check current week nominations and if user has already nominated
  useEffect(() => {
    // Use today's game date if available, otherwise use next game
    const gameDateStr = todayGameDate || (nextGame ? nextGame.date.toDateString() : null);
    
    if (!gameDateStr || nominations.length === 0) {
      setCurrentWeekNominations([]);
      setHasNominated(false);
      return;
    }

    const weekNominations = nominations.filter((nom) => nom.gameDate === gameDateStr);
    setCurrentWeekNominations(weekNominations);
    setHasNominated(weekNominations.some((nom) => nom.nominatedBy === userId));
  }, [nextGame, nominations, userId, todayGameDate]);

  const handleNominate = async () => {
    if (!selectedPlayer) {
      setError("Please select a player.");
      return;
    }

    // Must be after a game day (today's game has passed)
    if (!canNominateToday) {
      setError("You can only nominate Man of the Match after a game day.");
      return;
    }

    if (hasNominated) {
      setError("You have already nominated a player for today's game.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const motmPath = `artifacts/${appId}/public/data/manOfTheMatch`;
      const motmRef = collection(db, motmPath);

      const player = players.find((p) => p.id === selectedPlayer);
      if (!player) {
        throw new Error("Player not found");
      }

      const gameDateStr = todayGameDate || new Date().toDateString();

      await addDoc(motmRef, {
        gameDate: gameDateStr,
        nominatedPlayerId: selectedPlayer,
        nominatedPlayerName: player.name,
        nominatedBy: userId,
        nominatedByEmail: userEmail,
        reason: reason.trim() || undefined,
        createdAt: Timestamp.now(),
      });

      // Create notification for the player who was nominated
      if (player.userId) {
        const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        const notificationsPath = `artifacts/${appId}/public/data/userNotifications`;
        const notificationsRef = collection(db, notificationsPath);
        await addDoc(notificationsRef, {
          userId: player.userId,
          type: "motm",
          message: `${userEmail} nominated you for Man of the Match!`,
          fromUserEmail: userEmail,
          relatedPlayerId: selectedPlayer,
          relatedPlayerName: player.name,
          createdAt: Timestamp.now(),
          read: false,
        });
      }

      setSuccess("Nomination submitted successfully!");
      setSelectedPlayer("");
      setReason("");
      setShowNominateModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error submitting nomination:", err);
      setError(`Failed to submit nomination: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormattedDate = (timestamp: Timestamp | any) => {
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    return "N/A";
  };

  // Count votes for each player in current week
  const getVoteCounts = () => {
    const counts: { [playerId: string]: { name: string; count: number } } = {};
    currentWeekNominations.forEach((nom) => {
      if (!counts[nom.nominatedPlayerId]) {
        counts[nom.nominatedPlayerId] = {
          name: nom.nominatedPlayerName,
          count: 0,
        };
      }
      counts[nom.nominatedPlayerId].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  };

  const voteCounts = getVoteCounts();

  return (
    <div className={`relative overflow-hidden backdrop-blur-xl p-4 sm:p-6 rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.15)] -mt-[1px] ${
      isActive 
        ? "bg-gradient-to-br from-yellow-50/95 via-amber-50/95 to-yellow-50/95 border-l-2 border-r-2 border-b-2 border-yellow-500/70" 
        : "bg-white/90 border border-white/70 border-t-0"
    }`}>
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-yellow-200/50 blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-200/50 blur-[80px]" />
      </div>
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
              <Star className="text-yellow-600" size={24} />
              Man of the Match
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
              {canNominateToday
                ? "Nominate the best performer from today's game."
                : availablePlayers.length > 0
                ? "Nominate the best performer after a game day."
                : "Nominate the best performer after a game day. (You cannot nominate yourself or players you registered.)"}
            </p>
          </div>
          {canNominateToday && !hasNominated && availablePlayers.length > 0 && (
            <button
              onClick={() => setShowNominateModal(true)}
              className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-2xl hover:from-yellow-600 hover:to-amber-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Star className="w-4 h-4" />
              <span>Nominate</span>
            </button>
          )}
          {!canNominateToday && (
            <div className="text-xs sm:text-sm text-slate-500 italic">
              Available after game day
            </div>
          )}
        </div>

        {canNominateToday && (
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-yellow-600" size={18} />
              <p className="text-sm font-semibold text-yellow-800">
                Today's Game
              </p>
            </div>
            {hasNominated && (
              <p className="text-xs text-yellow-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                You have already nominated a player for today's game.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border-2 border-emerald-300 text-emerald-700 rounded-xl text-sm font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        {!canNominateToday && !nextGame && (
          <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-yellow-50 rounded-2xl border-2 border-dashed border-yellow-200">
            <Calendar className="mx-auto text-yellow-400 mb-3" size={48} />
            <p className="text-slate-600 font-medium">No game today. Nomination is available after a game day.</p>
          </div>
        )}

        {nextGame && voteCounts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Trophy className="text-yellow-600" size={20} />
              Current Week Votes
            </h3>
            <div className="space-y-2">
              {voteCounts.map((vote, index) => (
                <div
                  key={vote.name}
                  className={`p-3 rounded-xl border-2 ${
                    index === 0
                      ? "bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-300"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Star className="text-yellow-600" size={18} />}
                      <span className="font-semibold text-slate-800">{vote.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-600">{vote.count} {vote.count === 1 ? "vote" : "votes"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center p-8">
            <p className="text-slate-600 font-medium">Loading nominations...</p>
          </div>
        ) : nominations.length === 0 ? (
          <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-yellow-50 rounded-2xl border-2 border-dashed border-yellow-200">
            <Star className="mx-auto text-yellow-400 mb-3" size={48} />
            <p className="text-slate-600 font-medium">No nominations yet.</p>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-3">Recent Nominations</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              {nominations.slice(0, 10).map((nom) => (
                <div
                  key={nom.id}
                  className="p-4 rounded-2xl border-2 shadow-md bg-gradient-to-br from-white to-yellow-50 border-yellow-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-md flex-shrink-0">
                      <Star className="text-white" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 mb-1">
                        <span className="font-bold text-yellow-800">{nom.nominatedPlayerName}</span> nominated by{" "}
                        <span className="text-slate-600">{nom.nominatedByEmail}</span>
                      </p>
                      {nom.reason && (
                        <p className="text-sm text-slate-700 mb-2 whitespace-pre-wrap break-words">
                          {nom.reason}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        Game: {nom.gameDate} • {getFormattedDate(nom.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nominate Modal */}
      {showNominateModal && nextGame && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNominateModal(false);
              setError(null);
              setSelectedPlayer("");
              setReason("");
            }
          }}
        >
          <div 
            className="bg-gradient-to-br from-slate-50/95 via-white/95 to-slate-50/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.3)] border-2 border-slate-200/60 max-w-md w-full p-5 sm:p-6 md:p-7 relative my-auto max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background elements */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-yellow-200/30 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-amber-200/30 rounded-full blur-3xl"></div>
            </div>
            
            <button
              onClick={() => {
                setShowNominateModal(false);
                setError(null);
                setSelectedPlayer("");
                setReason("");
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
                <p className="text-sm text-yellow-700 font-medium">{nextGame.formatted}</p>
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
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition duration-150 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
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
                    You cannot nominate yourself or players you registered.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError(null);
                  }}
                  placeholder="Why did this player deserve Man of the Match?"
                  rows={4}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition duration-150 resize-none bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold shadow-md">
                  {error}
                </div>
              )}

              <button
                onClick={handleNominate}
                disabled={isSubmitting || !selectedPlayer}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Star size={20} /> {isSubmitting ? 'Submitting...' : 'Submit Nomination'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManOfTheMatch;

