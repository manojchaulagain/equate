import React, { useState, useEffect } from "react";
import { Target, Footprints, Plus, X, Calendar } from "lucide-react";
import { collection, addDoc, Timestamp, query, getDocs, onSnapshot } from "firebase/firestore";
import { GameSchedule } from "../../utils/gameSchedule";
import { getGameDateStringForSubmission, canSubmitGoalsAssists } from "../../utils/gamePoints";

declare const __app_id: string;

interface GoalsAssistsSubmissionProps {
  db: any;
  userId: string;
  userEmail: string;
  players: any[];
  gameSchedule: GameSchedule | null;
  userRole?: string;
  isActive?: boolean;
}

interface Submission {
  id: string;
  playerId: string;
  playerName: string;
  gameDate: string;
  goals: number;
  assists: number;
  submittedBy: string;
  submittedByEmail: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp | any;
  reviewedBy?: string;
  reviewedAt?: Timestamp | any;
}

const GoalsAssistsSubmission: React.FC<GoalsAssistsSubmissionProps> = ({
  db,
  userId,
  userEmail,
  players,
  gameSchedule,
  userRole = "user",
  isActive = false,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [goals, setGoals] = useState<string>("0");
  const [assists, setAssists] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);

  // Get players that the user can submit for
  // Admins can submit for any player, regular users can only submit for themselves or players they registered
  const getAvailablePlayers = () => {
    const isAdmin = userRole === "admin";
    if (isAdmin) {
      return players; // Admins can submit for all players
    }
    return players.filter(
      (player) => player.userId === userId || player.registeredBy === userId
    );
  };

  const availablePlayers = getAvailablePlayers();

  // Check if user can submit (must be after a game day OR on day after game day)
  const canSubmit = canSubmitGoalsAssists(gameSchedule?.schedule || null);
  const todayGameDate = gameSchedule ? getGameDateStringForSubmission(gameSchedule.schedule) : null;

  // Fetch pending submissions for this user
  useEffect(() => {
    if (!db || !userId) return;

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const submissionsPath = `artifacts/${appId}/public/data/goalsAssistsSubmissions`;
    const submissionsRef = collection(db, submissionsPath);
    
    // Use simple query - fetch all and filter client-side to avoid index issues
    const q = query(submissionsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allSubmissions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Submission[];
        // Filter client-side
        const filtered = allSubmissions.filter(
          (s) => s.submittedBy === userId && s.status === "pending"
        );
        setPendingSubmissions(filtered);
      },
      (err: any) => {
        console.error("Error fetching submissions:", err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [db, userId]);

  const handleSubmit = async () => {
      if (!selectedPlayer || !todayGameDate) {
      setError("Please select a player and ensure a game was played recently.");
      return;
    }

    const goalsNum = parseInt(goals);
    const assistsNum = parseInt(assists);

    if (isNaN(goalsNum) || goalsNum < 0) {
      setError("Goals must be a non-negative number.");
      return;
    }

    if (isNaN(assistsNum) || assistsNum < 0) {
      setError("Assists must be a non-negative number.");
      return;
    }

    if (goalsNum === 0 && assistsNum === 0) {
      setError("Please enter at least one goal or assist.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const submissionsPath = `artifacts/${appId}/public/data/goalsAssistsSubmissions`;
      const submissionsRef = collection(db, submissionsPath);

      const player = players.find((p) => p.id === selectedPlayer);
      if (!player) {
        throw new Error("Player not found");
      }

      // Check if there's already a pending submission for this player and game date
      // Fetch all and filter client-side to avoid index issues
      const allSnapshot = await getDocs(submissionsRef);
      const existing = allSnapshot.docs.find((doc) => {
        const data = doc.data();
        return (
          data.playerId === selectedPlayer &&
          data.gameDate === todayGameDate &&
          data.status === "pending"
        );
      });

      if (existing) {
        setError("You have already submitted stats for this player for this game. Please wait for admin approval.");
        setIsSubmitting(false);
        return;
      }

      await addDoc(submissionsRef, {
        playerId: selectedPlayer,
        playerName: player.name,
        gameDate: todayGameDate,
        goals: goalsNum,
        assists: assistsNum,
        submittedBy: userId,
        submittedByEmail: userEmail,
        status: "pending",
        createdAt: Timestamp.now(),
      });

      setSuccess("Stats submitted successfully! Waiting for admin approval.");
      setSelectedPlayer("");
      setGoals("0");
      setAssists("0");
      setShowModal(false);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("Error submitting stats:", err);
      setError(`Failed to submit stats: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`relative overflow-hidden backdrop-blur-xl p-4 sm:p-6 rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.15)] -mt-[1px] ${
      isActive
        ? "bg-gradient-to-br from-green-50/95 via-emerald-50/95 to-teal-50/95 border-l-2 border-r-2 border-b-2 border-green-500/70"
        : "bg-white/90 border border-white/70 border-t-0"
    }`}>
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-green-200/50 blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-200/50 blur-[80px]" />
      </div>
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
              <Target className="text-green-600" size={24} />
              Goals & Assists
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-2">
              {userRole === "admin"
                ? "Submit goals and assists for any player. Requires admin approval."
                : "Submit goals and assists for yourself or players you registered. Requires admin approval."}
            </p>
          </div>
          {canSubmit && availablePlayers.length > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Stats</span>
            </button>
          )}
          {!canSubmit && (
            <div className="text-xs sm:text-sm text-slate-500 italic">
              Available after game day
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border-2 border-emerald-300 text-emerald-700 rounded-xl text-sm font-semibold flex items-center gap-2">
            <Target className="w-4 h-4" />
            {success}
          </div>
        )}

        {pendingSubmissions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Calendar className="text-green-600" size={20} />
              Pending Submissions
            </h3>
            <div className="space-y-2">
              {pendingSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="p-4 rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{submission.playerName}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-slate-600">
                          <Target className="inline w-4 h-4 text-red-500 mr-1" />
                          {submission.goals} {submission.goals === 1 ? "Goal" : "Goals"}
                        </span>
                        <span className="text-sm text-slate-600">
                          <Footprints className="inline w-4 h-4 text-blue-500 mr-1" />
                          {submission.assists} {submission.assists === 1 ? "Assist" : "Assists"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Game: {submission.gameDate}</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold">
                      Pending Review
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {availablePlayers.length === 0 && (
          <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-green-50 rounded-2xl border-2 border-dashed border-green-200">
            <Target className="mx-auto text-green-400 mb-3" size={48} />
            <p className="text-slate-600 font-medium">
              {userRole === "admin" 
                ? "No players available." 
                : "No players available. You can only submit stats for yourself or players you registered."}
            </p>
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setError(null);
              setSelectedPlayer("");
              setGoals("0");
              setAssists("0");
            }
          }}
        >
          <div
            className="bg-gradient-to-br from-slate-50/98 via-white/98 to-slate-50/98 backdrop-blur-xl w-[calc(100%-2rem)] max-w-full sm:max-w-2xl mx-4 my-4 sm:my-8 max-h-[90vh] sm:max-h-[85vh] rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.4)] border-2 border-green-200/60 p-5 sm:p-6 md:p-8 relative overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-24 -right-24 w-56 h-56 bg-green-300/30 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-emerald-300/30 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl"></div>
            </div>

            <button
              onClick={() => {
                setShowModal(false);
                setError(null);
                setSelectedPlayer("");
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

              {todayGameDate && (
                <div className="mb-8 p-5 bg-gradient-to-r from-green-50/80 via-emerald-50/80 to-teal-50/80 backdrop-blur-sm border-2 border-green-200/60 rounded-2xl shadow-lg">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-700 mb-2">Game Date</p>
                  <p className="text-base sm:text-lg text-green-800 font-bold">{todayGameDate}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Select Player
                  </label>
                  <select
                    value={selectedPlayer}
                    onChange={(e) => {
                      setSelectedPlayer(e.target.value);
                      setError(null);
                    }}
                    className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl focus:ring-4 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-green-300"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Choose a player...</option>
                    {availablePlayers.map((player) => (
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
                      setError(null);
                    }}
                    placeholder="Enter number of goals"
                    min="0"
                    className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl focus:ring-4 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-green-300 placeholder:text-slate-400"
                    required
                    disabled={isSubmitting}
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
                      setError(null);
                    }}
                    placeholder="Enter number of assists"
                    min="0"
                    className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl focus:ring-4 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-green-300 placeholder:text-slate-400"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {error && (
                  <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300/80 rounded-xl text-sm font-bold shadow-lg flex items-start gap-3 animate-in fade-in duration-200">
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-red-800">{error}</span>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedPlayer || (parseInt(goals) === 0 && parseInt(assists) === 0)}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 text-lg font-black text-white bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 rounded-2xl transition-all duration-300 shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Target size={22} /> 
                  <span>{isSubmitting ? "Submitting..." : "Submit for Review"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsAssistsSubmission;

