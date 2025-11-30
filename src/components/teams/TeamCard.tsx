import React, { useMemo } from "react";
import { Team, PlayerAvailability, Position } from "../../types/player";
import { POSITION_LABELS, POSITIONS } from "../../constants/player";
import { getTeamColorTheme } from "../../constants/teamColors";

interface TeamCardProps {
  team: Team;
  positions: Record<Position, number>;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, positions }) => {
  const theme = useMemo(() => getTeamColorTheme(team.colorKey), [team.colorKey]);
  
  // Memoize sorted players to avoid re-sorting on every render
  const sortedPlayers = useMemo(
    () => [...team.players].sort((a, b) => b.skillLevel - a.skillLevel),
    [team.players]
  );

  return (
    <div
      className={`p-6 rounded-2xl shadow-xl transform hover:scale-[1.02] transition-all duration-300 border-2 hover:shadow-2xl ${theme.cardBg} ${theme.cardBorder}`}
    >
      <h3 className={`text-3xl font-extrabold mb-3 ${theme.headingText}`}>
        {team.name} ({team.players.length} Players)
      </h3>
      <p className="text-lg font-bold text-slate-800 mb-4">
        Total Skill Score:{" "}
        <span className={`text-4xl font-extrabold ${theme.statText}`}>
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
                positions[pos] ? theme.countText : "text-slate-400"
              }`}
            >
              {positions[pos] || 0}
            </span>
          </div>
        ))}
      </div>

      <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
        {sortedPlayers.map((player: PlayerAvailability) => (
          <li
            key={player.id}
            className={`flex justify-between items-center text-sm p-3 rounded-lg shadow-sm ${theme.listBg} border ${theme.listBorder}`}
          >
            <span className="font-bold text-slate-800">{player.name}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${theme.badgeBg} ${theme.badgeText}`}>
              {player.position} (S:{player.skillLevel})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default React.memo(TeamCard);

