import React from "react";
import { Team, PlayerAvailability, Position } from "../../types/player";
import { POSITION_LABELS, POSITIONS } from "../../constants/player";

interface TeamCardProps {
  team: Team;
  positions: Record<Position, number>;
  color: "blue" | "red";
}

const TeamCard: React.FC<TeamCardProps> = ({ team, positions, color }) => (
  <div
    className={`p-6 rounded-2xl shadow-xl transform hover:scale-[1.02] transition-all duration-300 border-2 ${
      color === "blue"
        ? "bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 border-blue-400 hover:shadow-2xl"
        : "bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 border-red-400 hover:shadow-2xl"
    }`}
  >
    <h3
      className={`text-3xl font-extrabold mb-3 ${
        color === "blue" 
          ? "bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent" 
          : "bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent"
      }`}
    >
      {team.name} ({team.players.length} Players)
    </h3>
    <p className="text-lg font-bold text-slate-800 mb-4">
      Total Skill Score:{" "}
      <span
        className={`text-4xl font-extrabold ${
          color === "blue" 
            ? "bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent" 
            : "bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent"
        }`}
      >
        {team.totalSkill}
      </span>
    </p>

    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5 text-sm font-semibold bg-white/60 p-3 rounded-xl">
      {POSITIONS.map((pos) => (
        <div key={pos} className="flex justify-between items-center">
          <span className="text-slate-700">
            {pos} ({POSITION_LABELS[pos]}):
          </span>
          <span
            className={`font-extrabold text-lg ${
              positions[pos] 
                ? color === "blue" ? "text-blue-600" : "text-red-600"
                : "text-slate-400"
            }`}
          >
            {positions[pos] || 0}
          </span>
        </div>
      ))}
    </div>

    <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
      {team.players
        .sort((a, b) => b.skillLevel - a.skillLevel)
        .map((player: PlayerAvailability) => (
          <li
            key={player.id}
            className={`flex justify-between items-center text-sm p-3 rounded-lg shadow-sm ${
              color === "blue"
                ? "bg-gradient-to-r from-blue-100/80 to-cyan-100/80 border border-blue-200"
                : "bg-gradient-to-r from-red-100/80 to-rose-100/80 border border-red-200"
            }`}
          >
            <span className="font-bold text-slate-800">{player.name}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              color === "blue"
                ? "bg-blue-500 text-white"
                : "bg-red-500 text-white"
            }`}>
              {player.position} (S:{player.skillLevel})
            </span>
          </li>
        ))}
    </ul>
  </div>
);

export default TeamCard;

