import React from "react";
import { Trophy } from "lucide-react";
import TeamCard from "./TeamCard";
import { PlayerAvailability, Position, TeamResultsState } from "../../types/player";

interface TeamResultsProps extends TeamResultsState {
  onBack: () => void;
}

const countPositions = (players: PlayerAvailability[]) =>
  players.reduce((acc, player) => {
    acc[player.position] = (acc[player.position] || 0) + 1;
    return acc;
  }, {} as Record<Position, number>);

const TeamResults: React.FC<TeamResultsProps> = ({ teamA, teamB, onBack }) => {
  const teamAPositions = countPositions(teamA.players);
  const teamBPositions = countPositions(teamB.players);
  const skillDiff = Math.abs(teamA.totalSkill - teamB.totalSkill);

  return (
    <div className="bg-gradient-to-br from-white via-amber-50/50 to-orange-50/50 p-8 rounded-2xl shadow-2xl border-2 border-amber-200">
      <h2 className="text-4xl font-extrabold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent border-b-2 border-amber-200 pb-4 mb-6 flex items-center justify-center">
        <Trophy className="mr-4 text-amber-500" size={36} /> Balanced Teams
        Generated!
      </h2>
      <div
        className={`p-4 text-center mb-6 rounded-xl font-bold text-lg shadow-md ${
          skillDiff === 0 
            ? "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-2 border-emerald-300" 
            : "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-2 border-amber-300"
        }`}
      >
        Skill Difference: <span className="text-2xl">{skillDiff}</span> (Lower is better)
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TeamCard team={teamA} positions={teamAPositions} color="blue" />
        <TeamCard team={teamB} positions={teamBPositions} color="red" />
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
  );
};

export default TeamResults;

