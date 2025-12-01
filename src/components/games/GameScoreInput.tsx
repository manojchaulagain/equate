import React, { useState } from "react";
import { X, Save, Target } from "lucide-react";
import { Team } from "../../types/player";
import { addDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { FirestorePaths } from "../../utils/firestorePaths";
import { getDateString } from "../../utils/gamePoints";

interface GameScoreInputProps {
  db: any;
  teams: Team[];
  gameDate: Date;
  onSuccess?: () => void;
  onClose: () => void;
}

const GameScoreInput: React.FC<GameScoreInputProps> = ({
  db,
  teams,
  gameDate,
  onSuccess,
  onClose,
}) => {
  const [team1Name, setTeam1Name] = useState<string>(teams[0]?.name || "");
  const [team1Score, setTeam1Score] = useState<string>("0");
  const [team2Name, setTeam2Name] = useState<string>(teams[1]?.name || "");
  const [team2Score, setTeam2Score] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!db) {
      setError("Database connection not ready.");
      return;
    }

    if (!team1Name || !team2Name) {
      setError("Please select both teams.");
      return;
    }

    if (team1Name === team2Name) {
      setError("Teams must be different.");
      return;
    }

    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);

    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      setError("Scores must be non-negative numbers.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const gameResultsPath = FirestorePaths.gameResults();
      const gameResultsRef = collection(db, gameResultsPath);

      const gameDateString = getDateString(gameDate);

      // Check if result already exists for this game date
      const existingQuery = query(
        gameResultsRef,
        where("gameDate", "==", gameDateString)
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        setError("Score has already been entered for this game.");
        setIsSubmitting(false);
        return;
      }

      await addDoc(gameResultsRef, {
        gameDate: gameDateString,
        team1Name,
        team1Score: score1,
        team2Name,
        team2Score: score2,
        createdAt: Timestamp.now(),
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error("Error submitting game score:", err);
      setError(`Failed to save score: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
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
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-white/95 backdrop-blur-sm border-2 border-slate-200/60 rounded-full shadow-lg hover:shadow-xl hover:bg-white hover:border-slate-300 transition-all duration-200 hover:scale-110 active:scale-95 group"
          type="button"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Enter Game Score
            </h2>
          </div>
          <p className="text-sm text-slate-600">
            Game Date: {gameDate.toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Team 1
            </label>
            <select
              value={team1Name}
              onChange={(e) => {
                setTeam1Name(e.target.value);
                setError(null);
              }}
              className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 bg-white text-sm font-medium"
              disabled={isSubmitting}
            >
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.name} value={team.name}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Team 1 Score
            </label>
            <input
              type="number"
              value={team1Score}
              onChange={(e) => {
                setTeam1Score(e.target.value);
                setError(null);
              }}
              min="0"
              className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 bg-white text-sm font-medium"
              disabled={isSubmitting}
            />
          </div>

          <div className="text-center text-2xl font-bold text-slate-400">VS</div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Team 2
            </label>
            <select
              value={team2Name}
              onChange={(e) => {
                setTeam2Name(e.target.value);
                setError(null);
              }}
              className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 bg-white text-sm font-medium"
              disabled={isSubmitting}
            >
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.name} value={team.name}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Team 2 Score
            </label>
            <input
              type="number"
              value={team2Score}
              onChange={(e) => {
                setTeam2Score(e.target.value);
                setError(null);
              }}
              min="0"
              className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 bg-white text-sm font-medium"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !team1Name || !team2Name}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-base font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {isSubmitting ? "Saving..." : "Save Score"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameScoreInput;

