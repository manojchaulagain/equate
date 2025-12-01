import React, { useMemo } from "react";
import { Trophy, Users, Clock, TrendingUp, ArrowLeft } from "lucide-react";
import TeamCard from "./TeamCard";
import { PlayerAvailability, Position, Team } from "../../types/player";

interface TeamResultsProps {
  teams: Team[];
  generatedAt?: string;
  onBack: () => void;
  isActive?: boolean;
  isLoading?: boolean;
}

const countPositions = (players: PlayerAvailability[] = []): Record<Position, number> =>
  (players || []).reduce((acc, player) => {
    if (player && player.position) {
      acc[player.position] = (acc[player.position] || 0) + 1;
    }
    return acc;
  }, {} as Record<Position, number>);

const TeamResults: React.FC<TeamResultsProps> = ({ teams, generatedAt, onBack, isActive = false, isLoading = false }) => {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY - before any early returns
  // Memoize filtered teams to avoid recalculation
  const validTeams = useMemo(() => {
    if (!teams || !Array.isArray(teams)) return [];
    return teams.filter(team => team && team.name);
  }, [teams]);

  // Memoize expensive computations - called unconditionally
  const totalPlayers = useMemo(() => {
    if (!validTeams || validTeams.length === 0) return 0;
    return validTeams.reduce((sum, team) => sum + (team.players?.length || 0), 0);
  }, [validTeams]);

  const sortedBySkill = useMemo(() => {
    if (!validTeams || validTeams.length === 0) return [];
    return [...validTeams].sort((a, b) => (b.totalSkill || 0) - (a.totalSkill || 0));
  }, [validTeams]);

  const skillRange = useMemo(() => {
    if (!sortedBySkill || sortedBySkill.length <= 1) return 0;
    return sortedBySkill[0].totalSkill - sortedBySkill[sortedBySkill.length - 1].totalSkill;
  }, [sortedBySkill]);

  const gridCols = useMemo(() => {
    if (!validTeams || validTeams.length === 0) return "grid-cols-1";
    if (validTeams.length <= 2) {
      return "grid-cols-1 md:grid-cols-2";
    }
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  }, [validTeams]);

  // Memoize position counts for each team to avoid recalculation
  const teamsWithPositions = useMemo(() => {
    if (!validTeams || validTeams.length === 0) return [];
    return validTeams.map(team => ({
      team,
      positions: countPositions(team.players || [])
    }));
  }, [validTeams]);

  // NOW handle conditional returns AFTER all hooks
  // Show loading state while teams are being loaded
  if (isLoading) {
    return (
      <div className={`relative overflow-hidden p-5 sm:p-6 md:p-8 rounded-b-2xl rounded-t-none -mt-[1px] bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border-l-2 border-r-2 border-b-2 border-amber-500/70 min-h-[400px]`}>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-amber-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-sm font-semibold text-amber-700">Loading teams...</p>
          </div>
        </div>
      </div>
    );
  }

  // Always render container to prevent layout shift, even when empty
  if (validTeams.length === 0) {
    return (
      <div className={`relative overflow-hidden rounded-b-2xl rounded-t-none -mt-[1px] ${
        isActive 
          ? "bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border-l-2 border-r-2 border-b-2 border-amber-500/70" 
          : "bg-white/90 border border-white/70 border-t-0"
      }`} style={{ minHeight: '1px' }} aria-hidden="true">
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden p-5 sm:p-6 md:p-8 rounded-b-2xl rounded-t-none -mt-[1px] ${
      isActive 
        ? "bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border-l-2 border-r-2 border-b-2 border-amber-500/70" 
        : "bg-white/90 border border-white/70 border-t-0"
    }`}>
      <div className="relative z-10">
        {/* Header Section - Simplified */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <Trophy className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                Balanced Teams Generated
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                Teams have been balanced based on skill levels
              </p>
            </div>
          </div>

          {/* Stats Bar - Simplified */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="p-4 bg-white border-2 border-amber-200/60 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
                  <Users className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Players</p>
              </div>
              <p className="text-2xl font-black text-amber-700">{totalPlayers}</p>
            </div>

            <div className="p-4 bg-white border-2 border-amber-200/60 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
                  <Trophy className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Teams</p>
              </div>
              <p className="text-2xl font-black text-amber-700">{validTeams.length}</p>
            </div>

            <div className={`p-4 border-2 rounded-xl shadow-sm ${
              skillRange === 0
                ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300/60"
                : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300/60"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${
                  skillRange === 0
                    ? "bg-gradient-to-br from-emerald-100 to-teal-100"
                    : "bg-gradient-to-br from-amber-100 to-orange-100"
                }`}>
                  <TrendingUp className={`w-4 h-4 ${
                    skillRange === 0 ? "text-emerald-600" : "text-amber-600"
                  }`} />
                </div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${
                  skillRange === 0 ? "text-emerald-700" : "text-amber-700"
                }`}>Skill Spread</p>
              </div>
              <p className={`text-2xl font-black ${
                skillRange === 0 ? "text-emerald-700" : "text-amber-700"
              }`}>
                {skillRange}
                <span className="text-xs font-normal ml-1">
                  {skillRange === 0 ? "✨ Perfect!" : "points"}
                </span>
              </p>
            </div>
          </div>

          {generatedAt && (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-6">
              <Clock className="w-4 h-4" />
              <span>Generated {new Date(generatedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Teams Grid - Simplified */}
        <div className={`grid ${gridCols} gap-4 sm:gap-5 lg:gap-6 mb-6`}>
          {teamsWithPositions.map(({ team, positions }, index) => (
            <TeamCard 
              key={team.name || `team-${index}`} 
              team={team} 
              positions={positions} 
            />
          ))}
        </div>

        {/* Back Button */}
        <div className="pt-5 border-t-2 border-amber-200/60">
          <button
            onClick={onBack}
            className="w-full sm:w-auto sm:min-w-[180px] flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Availability</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TeamResults);
