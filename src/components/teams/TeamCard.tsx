import React, { useMemo } from "react";
import { Team, PlayerAvailability, Position } from "../../types/player";
import { getTeamColorTheme } from "../../constants/teamColors";
import { Users, Star } from "lucide-react";
import FormationView from "./FormationView";

interface TeamCardProps {
  team: Team | null | undefined;
  positions: Record<Position, number>;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, positions }) => {
  // Hooks must be called unconditionally and in the same order every render
  const teamColorKey = team?.colorKey;
  const teamPlayers = team?.players;
  
  const theme = useMemo(() => {
    if (!teamColorKey) {
      return getTeamColorTheme("blue");
    }
    return getTeamColorTheme(teamColorKey);
  }, [teamColorKey]);
  
  // Memoize sorted players to avoid re-sorting on every render
  const sortedPlayers = useMemo(() => {
    if (!teamPlayers || !Array.isArray(teamPlayers)) {
      return [];
    }
    return [...teamPlayers].sort((a, b) => (b.skillLevel || 0) - (a.skillLevel || 0));
  }, [teamPlayers]);
  
  // Memoize players array for FormationView to ensure stable reference
  const stablePlayersArray = useMemo(() => {
    return teamPlayers && Array.isArray(teamPlayers) ? teamPlayers : [];
  }, [teamPlayers]);
  
  const playerCount = Array.isArray(teamPlayers) ? teamPlayers.length : 0;

  // Handle null/undefined team after hooks are called
  if (!team || !team.name) {
    return null;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl shadow-lg border-2 transition-shadow duration-200 hover:shadow-xl ${theme.cardBg} ${theme.cardBorder}`}
    >
      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className={`text-2xl sm:text-3xl font-extrabold ${theme.headingText} flex items-center gap-2`}>
              <span>{team.name}</span>
            </h3>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 rounded-lg border border-white/80 shadow-sm">
              <Users className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-bold text-slate-700">{playerCount}</span>
            </div>
          </div>
          
          {/* Skill Score */}
          <div className="p-4 bg-white/70 rounded-xl border-2 border-white/80 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Total Skill</p>
                <p className={`text-3xl sm:text-4xl font-black ${theme.statText}`}>
                  {team.totalSkill}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl">
                <Star className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Formation View */}
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <span>⚽</span>
            <span>Soccer Formation</span>
          </p>
          <FormationView players={stablePlayersArray} theme={theme} />
        </div>

        {/* Players List */}
        <div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Users className="w-3 h-3" />
            <span>Players</span>
          </p>
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {sortedPlayers.map((player: PlayerAvailability, index: number) => (
              <li
                key={player.id}
                className={`flex items-center justify-between text-sm p-3 rounded-lg shadow-sm transition-shadow duration-150 hover:shadow-md ${theme.listBg} border ${theme.listBorder} ${
                  index === 0 ? 'ring-2 ring-amber-300/50' : ''
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {index === 0 && (
                    <div className="flex-shrink-0 p-1 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full">
                      <Star className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-bold text-slate-800 truncate">{player.name}</span>
                    {player.jerseyNumber !== undefined && player.jerseyNumber !== null && (
                      <span className={`flex-shrink-0 px-2.5 py-1 rounded-xl text-xs font-black ${theme.badgeBg} ${theme.badgeText} shadow-md border-2 border-white/30`}>
                        #{player.jerseyNumber}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${theme.badgeBg} ${theme.badgeText}`}>
                    {player.position}
                  </span>
                  <span className="text-xs font-bold px-2 py-1 bg-slate-200 text-slate-700 rounded-lg">
                    S{player.skillLevel}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// Custom comparison function for React.memo to optimize re-renders
const areEqual = (prevProps: TeamCardProps, nextProps: TeamCardProps) => {
  const prevTeam = prevProps.team;
  const nextTeam = nextProps.team;
  
  if (!prevTeam || !nextTeam) {
    return prevTeam === nextTeam;
  }
  
  if (prevTeam.name !== nextTeam.name ||
      prevTeam.totalSkill !== nextTeam.totalSkill ||
      prevTeam.colorKey !== nextTeam.colorKey ||
      prevTeam.players?.length !== nextTeam.players?.length) {
    return false;
  }
  
  if (prevTeam.players && nextTeam.players) {
    if (prevTeam.players.length !== nextTeam.players.length) {
      return false;
    }
    if (prevTeam.players.length > 0 && nextTeam.players.length > 0) {
      if (prevTeam.players[0]?.id !== nextTeam.players[0]?.id) {
        return false;
      }
    }
  }
  
  const prevPositions = prevProps.positions;
  const nextPositions = nextProps.positions;
  const prevKeys = Object.keys(prevPositions);
  const nextKeys = Object.keys(nextPositions);
  
  if (prevKeys.length !== nextKeys.length) {
    return false;
  }
  
  for (const key of prevKeys) {
    if (prevPositions[key as Position] !== nextPositions[key as Position]) {
      return false;
    }
  }
  
  return true;
};

export default React.memo(TeamCard, areEqual);
