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
    className={`p-5 rounded-xl shadow-lg transform hover:scale-[1.01] transition-transform duration-300 ${
      color === "blue"
        ? "bg-blue-600/10 border-blue-600 border"
        : "bg-red-600/10 border-red-600 border"
    }`}
  >
    <h3
      className={`text-2xl font-extrabold ${
        color === "blue" ? "text-blue-700" : "text-red-700"
      } mb-2`}
    >
      {team.name} ({team.players.length} Players)
    </h3>
    <p className="text-lg font-bold text-gray-800 mb-4">
      Total Skill Score:{" "}
      <span
        className={`text-3xl font-extrabold ${
          color === "blue" ? "text-blue-700" : "text-red-700"
        }`}
      >
        {team.totalSkill}
      </span>
    </p>

    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4 text-sm font-medium">
      {POSITIONS.map((pos) => (
        <div key={pos} className="flex justify-between items-center text-gray-600">
          <span>
            {pos} ({POSITION_LABELS[pos]}):
          </span>
          <span
            className={`font-bold ${
              positions[pos] ? "text-gray-800" : "text-gray-400"
            }`}
          >
            {positions[pos] || 0}
          </span>
        </div>
      ))}
    </div>

    <ul className="space-y-1 max-h-60 overflow-y-auto pr-1">
      {team.players
        .sort((a, b) => b.skillLevel - a.skillLevel)
        .map((player: PlayerAvailability) => (
          <li
            key={player.id}
            className="flex justify-between items-center text-sm bg-white/70 p-2 rounded"
          >
            <span className="font-medium text-gray-800">{player.name}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200">
              {player.position} (S:{player.skillLevel})
            </span>
          </li>
        ))}
    </ul>
  </div>
);

export default TeamCard;

