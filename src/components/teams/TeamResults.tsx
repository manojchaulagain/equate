import React from "react";
import { Trophy, Users } from "lucide-react";
import TeamCard from "./TeamCard";
import { PlayerAvailability, Position, Team } from "../../types/player";

interface TeamResultsProps {
  teams: Team[];
  generatedAt?: string;
  onBack: () => void;
}

const countPositions = (players: PlayerAvailability[]) =>
  players.reduce((acc, player) => {
    acc[player.position] = (acc[player.position] || 0) + 1;
    return acc;
  }, {} as Record<Position, number>);

const TeamResults: React.FC<TeamResultsProps> = ({ teams, generatedAt, onBack }) => {
  if (!teams.length) {
    return null;
  }

  const totalPlayers = teams.reduce((sum, team) => sum + team.players.length, 0);
  const sortedBySkill = [...teams].sort((a, b) => b.totalSkill - a.totalSkill);
  const skillRange =
    sortedBySkill.length > 1
      ? sortedBySkill[0].totalSkill - sortedBySkill[sortedBySkill.length - 1].totalSkill
      : 0;

  const skillBannerClass =
    skillRange === 0
      ? "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-2 border-emerald-300"
      : "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-2 border-amber-300";

  const gridCols =
    teams.length <= 2
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-[0_20px_60px_rgba(15,23,42,0.18)] border border-white/70">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-10 right-0 w-56 h-56 bg-amber-200/60 blur-[110px]" />
        <div className="absolute bottom-0 left-4 w-64 h-64 bg-pink-200/50 blur-[120px]" />
      </div>
      <div className="relative z-10">
      <div className="flex flex-col items-center text-center mb-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent border-b-2 border-amber-200 pb-4 mb-4 flex items-center justify-center gap-3">
          <Trophy className="text-amber-500" size={32} /> Balanced Teams Generated
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3 text-slate-700 font-semibold text-sm sm:text-base">
          <span className="flex items-center gap-1 bg-white/70 px-3 py-1.5 rounded-full shadow-sm border border-amber-200">
            <Users className="w-4 h-4 text-amber-500" /> {totalPlayers} players
          </span>
          <span className="bg-white/70 px-3 py-1.5 rounded-full shadow-sm border border-amber-200">
            {teams.length} teams
          </span>
          {generatedAt && (
            <span className="bg-white/70 px-3 py-1.5 rounded-full shadow-sm border border-amber-200 text-xs sm:text-sm">
              Generated {new Date(generatedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <div className={`p-4 text-center mb-6 rounded-xl font-bold text-lg shadow-md ${skillBannerClass}`}>
        Skill spread across teams: <span className="text-2xl">{skillRange}</span> (lower is better)
      </div>

      <div className={`grid ${gridCols} gap-6`}>
        {teams.map((team) => (
          <TeamCard key={team.name} team={team} positions={countPositions(team.players)} />
        ))}
      </div>

      <div className="mt-8 pt-6 border-t-2 border-amber-200 text-center">
        <button
          onClick={onBack}
          className="bg-gradient-to-r from-slate-500 to-slate-600 text-white font-bold py-3 px-8 rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Back to Poll
        </button>
      </div>
      </div>
    </div>
  );
};

export default TeamResults;

