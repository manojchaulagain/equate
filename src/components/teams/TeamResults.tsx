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
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-gray-800 border-b pb-3 mb-4 flex items-center justify-center">
        <Trophy className="mr-3 text-yellow-500" size={28} /> Balanced Teams
        Generated!
      </h2>
      <div
        className={`p-3 text-center mb-4 rounded-lg font-medium ${
          skillDiff === 0 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
        }`}
      >
        Skill Difference: {skillDiff} (Lower is better)
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TeamCard team={teamA} positions={teamAPositions} color="blue" />
        <TeamCard team={teamB} positions={teamBPositions} color="red" />
      </div>
      <div className="mt-6 pt-4 border-t text-center">
        <button
          onClick={onBack}
          className="bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded-lg hover:bg-gray-300 transition duration-300"
        >
          Back to Poll
        </button>
      </div>
    </div>
  );
};

export default TeamResults;

