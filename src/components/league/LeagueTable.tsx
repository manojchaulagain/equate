import React from "react";
import { Trophy, TrendingUp } from "lucide-react";
import { TeamStanding } from "../../types/league";

interface LeagueTableProps {
  standings: TeamStanding[];
  isLoading?: boolean;
}

const LeagueTable: React.FC<LeagueTableProps> = ({ standings, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="w-full rounded-2xl bg-white/90 backdrop-blur-xl p-6 border-2 border-amber-200 shadow-lg">
        <p className="text-center text-slate-600 font-medium">Loading league table...</p>
      </div>
    );
  }

  if (standings.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50 p-6 border-2 border-dashed border-amber-200 shadow-lg">
        <div className="text-center">
          <Trophy className="mx-auto text-amber-400 mb-3" size={48} />
          <p className="text-slate-600 font-medium">No games played yet.</p>
          <p className="text-sm text-slate-500 mt-1">League table will appear after game scores are entered.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-white/90 backdrop-blur-xl border-2 border-amber-200 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 sm:p-4">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="text-white" size={24} />
          <p className="text-white text-sm sm:text-base font-semibold">Win = 3 pts | Draw = 1 pt | Loss = 0 pts</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200">
            <tr>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide">Pos</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide">Team</th>
              <th className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide">P</th>
              <th className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide">W</th>
              <th className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide">D</th>
              <th className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide">L</th>
              <th className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {standings.map((standing, index) => (
              <tr
                key={standing.teamName}
                className={`hover:bg-amber-50/50 transition-colors ${
                  index === 0 ? "bg-gradient-to-r from-yellow-50 to-amber-50 font-semibold" : ""
                }`}
              >
                <td className="px-3 sm:px-4 py-3 text-sm sm:text-base">
                  <div className="flex items-center gap-2">
                    {index === 0 && <Trophy className="text-yellow-500" size={16} />}
                    {index === 1 && <Trophy className="text-gray-400" size={16} />}
                    {index === 2 && <Trophy className="text-orange-600" size={16} />}
                    <span className={index < 3 ? "font-bold" : ""}>{index + 1}</span>
                  </div>
                </td>
                <td className="px-3 sm:px-4 py-3 text-sm sm:text-base font-medium text-slate-800">
                  {standing.teamName}
                </td>
                <td className="px-2 sm:px-3 py-3 text-center text-sm sm:text-base text-slate-700">
                  {standing.played}
                </td>
                <td className="px-2 sm:px-3 py-3 text-center text-sm sm:text-base text-green-700 font-semibold">
                  {standing.won}
                </td>
                <td className="px-2 sm:px-3 py-3 text-center text-sm sm:text-base text-slate-700">
                  {standing.drawn}
                </td>
                <td className="px-2 sm:px-3 py-3 text-center text-sm sm:text-base text-red-700 font-semibold">
                  {standing.lost}
                </td>
                <td className="px-3 sm:px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-sm sm:text-base font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    <TrendingUp className="text-amber-600" size={16} />
                    {standing.points}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeagueTable;

