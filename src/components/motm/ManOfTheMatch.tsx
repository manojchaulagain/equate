import React, { useState, useEffect } from "react";
import { Star, Trophy, Calendar, CheckCircle } from "lucide-react";
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, doc, getDoc, setDoc, where, getDocs } from "firebase/firestore";
import { calculateNextGame, GameSchedule } from "../../utils/gameSchedule";

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
  players: any[];
  isActive?: boolean;
}

const ManOfTheMatch: React.FC<ManOfTheMatchProps> = ({ db, userId, userEmail, players, isActive = false }) => {
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

  // Check current week nominations and if user has already nominated
  useEffect(() => {
    if (!nextGame || nominations.length === 0) {
      setCurrentWeekNominations([]);
      setHasNominated(false);
      return;
    }

    const gameDateStr = nextGame.date.toDateString();
    const weekNominations = nominations.filter((nom) => nom.gameDate === gameDateStr);
    setCurrentWeekNominations(weekNominations);
    setHasNominated(weekNominations.some((nom) => nom.nominatedBy === userId));
  }, [nextGame, nominations, userId]);

  const handleNominate = async () => {
    if (!selectedPlayer || !nextGame) {
      setError("Please select a player and ensure a game is scheduled.");
      return;
    }

    if (hasNominated) {
      setError("You have already nominated a player for this week's game.");
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

      const gameDateStr = nextGame.date.toDateString();

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
              Nominate the best performer from this week's game.
            </p>
          </div>
          {nextGame && !hasNominated && (
            <button
              onClick={() => setShowNominateModal(true)}
              className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-2xl hover:from-yellow-600 hover:to-amber-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Star className="w-4 h-4" />
              <span>Nominate</span>
            </button>
          )}
        </div>

        {nextGame && (
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-yellow-600" size={18} />
              <p className="text-sm font-semibold text-yellow-800">
                Game: {nextGame.formatted}
              </p>
            </div>
            {hasNominated && (
              <p className="text-xs text-yellow-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                You have already nominated a player for this game.
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

        {!nextGame && (
          <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-yellow-50 rounded-2xl border-2 border-dashed border-yellow-200">
            <Calendar className="mx-auto text-yellow-400 mb-3" size={48} />
            <p className="text-slate-600 font-medium">No upcoming game scheduled. Please configure the game schedule in the Admin tab.</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-4 sm:p-5 md:p-6 relative my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowNominateModal(false);
                setError(null);
                setSelectedPlayer("");
                setReason("");
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Star className="w-6 h-6 rotate-45" />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center">
              <Star className="mr-2 text-yellow-600" size={24} /> Nominate Man of the Match
            </h2>

            <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
              <p className="text-sm font-semibold text-yellow-800 mb-1">Game:</p>
              <p className="text-sm text-yellow-700">{nextGame.formatted}</p>
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
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 bg-white"
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
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                onClick={handleNominate}
                disabled={isSubmitting || !selectedPlayer}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Star size={20} /> {isSubmitting ? 'Submitting...' : 'Submit Nomination'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManOfTheMatch;

