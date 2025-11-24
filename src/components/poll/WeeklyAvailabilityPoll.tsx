import React from "react";
import { ListChecks, CheckCircle, XCircle, Trophy } from "lucide-react";
import { PlayerAvailability } from "../../types/player";
import { POSITION_LABELS, SKILL_LABELS } from "../../constants/player";

interface WeeklyAvailabilityPollProps {
  availability: PlayerAvailability[];
  loading: boolean;
  availableCount: number;
  onToggleAvailability: (playerId: string) => void;
  onGenerateTeams: () => void;
  error: string | null;
  disabled?: boolean;
  isAdmin?: boolean;
}

const WeeklyAvailabilityPoll: React.FC<WeeklyAvailabilityPollProps> = ({
  availability,
  loading,
  availableCount,
  onToggleAvailability,
  onGenerateTeams,
  error,
  disabled = false,
  isAdmin = false,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center">
        <ListChecks className="mr-2 text-indigo-600" size={20} /> Weekly
        Availability Poll
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Toggle players who are available to play this week.
      </p>

      {loading && (
        <div className="text-center p-8 text-indigo-600 font-semibold">
          Loading players from Firestore...
        </div>
      )}

      {!loading && availability.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg text-gray-500">
          No players registered yet. Use the Register tab to add players.
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {availability.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition duration-200 ${
                player.isAvailable
                  ? "bg-indigo-50 border-indigo-400 border-l-4"
                  : "bg-gray-50 border-gray-300 border-l-4 opacity-70"
              }`}
              onClick={() => onToggleAvailability(player.id)}
            >
              <div>
                <p className="font-semibold text-gray-800">{player.name}</p>
                <p className="text-xs text-gray-500">
                  {player.position} ({POSITION_LABELS[player.position]}) • Skill:{" "}
                  {player.skillLevel} ({SKILL_LABELS[player.skillLevel]})
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {player.isAvailable ? (
                  <span className="text-green-600 font-medium">Playing</span>
                ) : (
                  <span className="text-red-500 font-medium">Out</span>
                )}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    player.isAvailable
                      ? "bg-green-500 border-green-700"
                      : "bg-red-500 border-red-700"
                  }`}
                >
                  {player.isAvailable ? (
                    <CheckCircle className="text-white" size={12} />
                  ) : (
                    <XCircle className="text-white" size={12} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t flex justify-between items-center">
        <p className="text-md font-semibold text-gray-700">
          Total Available:{" "}
          <span className="text-indigo-600 text-xl">{availableCount}</span>
        </p>
        {isAdmin ? (
          <button
            onClick={onGenerateTeams}
            disabled={availableCount < 2 || loading || disabled}
            className="bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-md flex items-center disabled:bg-gray-400"
          >
            <Trophy className="mr-2" size={18} /> Generate Teams
          </button>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Only admins can generate teams
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}
    </div>
  );
};

export default WeeklyAvailabilityPoll;

