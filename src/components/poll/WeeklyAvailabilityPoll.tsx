import React, { useState } from "react";
import { ListChecks, Trophy, Edit2, UserPlus } from "lucide-react";
import { PlayerAvailability, Player } from "../../types/player";
import { POSITION_LABELS, SKILL_LABELS } from "../../constants/player";
import EditPlayerModal from "../players/EditPlayerModal";
import AddPlayerModal from "../players/AddPlayerModal";

const TEAM_COUNT_OPTIONS = [2, 3, 4, 5, 6];

interface WeeklyAvailabilityPollProps {
  availability: PlayerAvailability[];
  loading: boolean;
  availableCount: number;
  onToggleAvailability: (playerId: string) => void | Promise<void>;
  onGenerateTeams: () => void;
  onUpdatePlayer: (playerId: string, updates: { position?: any; skillLevel?: any }) => Promise<void>;
  onAddPlayer: (player: Omit<Player, "id">) => Promise<void>;
  error: string | null;
  disabled?: boolean;
  isAdmin?: boolean;
  teamCount: number;
  onTeamCountChange: (count: number) => void;
  minPlayersRequired: number;
  canGenerateTeams: boolean;
}

const WeeklyAvailabilityPoll: React.FC<WeeklyAvailabilityPollProps> = ({
  availability,
  loading,
  availableCount,
  onToggleAvailability,
  onGenerateTeams,
  onUpdatePlayer,
  onAddPlayer,
  error,
  disabled = false,
  isAdmin = false,
  teamCount,
  onTeamCountChange,
  minPlayersRequired,
  canGenerateTeams,
}) => {
  const [editingPlayer, setEditingPlayer] = useState<PlayerAvailability | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleEditClick = (e: React.MouseEvent, player: PlayerAvailability) => {
    e.stopPropagation(); // Prevent toggling availability when clicking edit
    setEditingPlayer(player);
  };

  const handleSaveEdit = async (playerId: string, updates: { position: any; skillLevel: any }) => {
    await onUpdatePlayer(playerId, updates);
    setEditingPlayer(null);
  };
  return (
    <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl p-4 sm:p-6 rounded-2xl shadow-[0_20px_60px_rgba(15,23,42,0.15)] border border-white/70">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-cyan-200/50 blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-200/50 blur-[80px]" />
      </div>
      <div className="relative z-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent pb-2 flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <span className="flex items-center">
              <ListChecks className="mr-2 sm:mr-3 text-indigo-600" size={20} /> 
              <span className="whitespace-nowrap">Weekly Availability</span>
            </span>
            <span className="sm:ml-2">Poll</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
            Toggle players who are available to play this week.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={disabled}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:shadow-none flex items-center justify-center whitespace-nowrap w-full sm:w-auto transform hover:scale-105 text-sm sm:text-base"
        >
          <UserPlus className="mr-2" size={16} /> <span className="sm:inline">Register Player</span>
        </button>
      </div>

      {loading && (
        <div className="text-center p-8 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl border border-indigo-200">
          <p className="text-indigo-700 font-semibold text-lg">Loading players from Firestore...</p>
        </div>
      )}

      {!loading && availability.length === 0 ? (
        <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-blue-50 rounded-xl border-2 border-dashed border-indigo-200">
          <p className="text-slate-600 mb-4 font-medium">No players registered yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={disabled}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:shadow-none flex items-center mx-auto transform hover:scale-105"
          >
            <UserPlus className="mr-2" size={18} /> Register Player
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {availability.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                player.isAvailable
                  ? "bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-300 shadow-md hover:shadow-lg"
                  : "bg-gradient-to-r from-slate-100 to-gray-100 border-2 border-slate-300 shadow-sm opacity-75 hover:opacity-90"
              }`}
              onClick={() => onToggleAvailability(player.id)}
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
                  <button
                    onClick={(e) => handleEditClick(e, player)}
                    className="p-2 sm:p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
                    title="Edit player"
                  >
                    <Edit2 size={14} className="sm:w-4 sm:h-4" />
                  </button>
                )}
                <div className="flex items-center bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg sm:rounded-xl p-1 sm:p-1.5 shadow-inner border-2 border-slate-400">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAvailability(player.id);
                    }}
                    className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 min-w-[55px] sm:min-w-[70px] md:min-w-[75px] ${
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
                    className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 min-w-[55px] sm:min-w-[70px] md:min-w-[75px] ${
                      player.isAvailable
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg border-2 border-emerald-700 transform scale-105"
                        : "text-emerald-700 hover:bg-emerald-50 border-2 border-transparent hover:border-emerald-200"
                    }`}
                  >
                    Playing
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t-2 border-indigo-200 flex flex-col gap-4 bg-gradient-to-r from-slate-50 to-blue-50 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-3 sm:pb-2 rounded-b-xl sm:rounded-b-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700">
              Total Available:
            </p>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xl sm:text-2xl font-extrabold px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl shadow-lg">
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
                  className="border-2 border-indigo-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 bg-white shadow-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
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
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white font-bold py-2.5 sm:py-3.5 px-4 sm:px-6 md:px-8 rounded-xl hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center justify-center disabled:bg-gray-400 disabled:shadow-none transform hover:scale-105 disabled:transform-none w-full text-sm sm:text-base"
          >
            <Trophy className="mr-2" size={18} /> <span>Generate Teams</span>
          </button>
        ) : (
          <p className="text-xs sm:text-sm text-slate-500 italic font-medium bg-slate-100 px-3 sm:px-4 py-2 rounded-lg text-center sm:text-left w-full">
            Only admins can generate teams
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold shadow-md">
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
      </div>
    </div>
  );
};

export default WeeklyAvailabilityPoll;

