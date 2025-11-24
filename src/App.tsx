import React, { useState, useMemo } from "react";
import {
  Plus,
  ListChecks,
  Users,
  XCircle,
  ChevronDown,
  CheckCircle,
  Trophy,
} from "lucide-react";

// --- TYPE DEFINITIONS ---

type Position = "GK" | "DEF" | "MID" | "FWD";
type SkillLevel = 1 | 2 | 3 | 4 | 5;

interface Player {
  id: string;
  name: string;
  position: Position;
  skillLevel: SkillLevel;
}

interface PlayerAvailability extends Player {
  isAvailable: boolean;
}

interface Team {
  name: string;
  players: PlayerAvailability[];
  totalSkill: number;
}

interface TeamResultsState {
  teamA: Team;
  teamB: Team;
}

// --- MOCK DATA ---

const initialPlayers: Player[] = [
  { id: "p1", name: "Alfie B.", position: "FWD", skillLevel: 5 },
  { id: "p2", name: "Ben C.", position: "MID", skillLevel: 4 },
  { id: "p3", name: "Charlie D.", position: "DEF", skillLevel: 4 },
  { id: "p4", name: "David E.", position: "GK", skillLevel: 3 },
  { id: "p5", name: "Ethan F.", position: "FWD", skillLevel: 5 },
  { id: "p6", name: "Frank G.", position: "DEF", skillLevel: 3 },
  { id: "p7", name: "George H.", position: "MID", skillLevel: 2 },
  { id: "p8", name: "Harry I.", position: "MID", skillLevel: 4 },
  { id: "p9", name: "Isaac J.", position: "DEF", skillLevel: 2 },
  { id: "p10", name: "Jack K.", position: "FWD", skillLevel: 3 },
  { id: "p11", name: "Kyle L.", position: "MID", skillLevel: 5 },
  { id: "p12", name: "Liam M.", position: "GK", skillLevel: 4 },
];

const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];
const SKILL_LABELS: Record<SkillLevel, string> = {
  1: "Rookie",
  2: "Beginner",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert",
};

// --- CORE APP COMPONENT ---

export default function App() {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [availability, setAvailability] = useState<PlayerAvailability[]>(
    initialPlayers.map((p) => ({ ...p, isAvailable: true }))
  );
  // State now holds both teams in a structured object
  const [teams, setTeams] = useState<TeamResultsState | null>(null);
  const [view, setView] = useState<"register" | "poll" | "teams">("poll");
  const [error, setError] = useState<string | null>(null);

  // --- LOGIC FUNCTIONS ---

  // Function to add a new player (called by Registration form)
  const addPlayer = (player: Omit<Player, "id">) => {
    const newPlayer: Player = { ...player, id: crypto.randomUUID() };
    setPlayers((prev) => [...prev, newPlayer]);
    setAvailability((prev) => [...prev, { ...newPlayer, isAvailable: true }]);
  };

  // Function to update availability (called by Poll view)
  const toggleAvailability = (playerId: string) => {
    setAvailability((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, isAvailable: !p.isAvailable } : p
      )
    );
    // Clear teams if availability changes
    setTeams(null);
    setError(null);
  };

  // --- TEAM GENERATION ALGORITHM ---

  const generateBalancedTeams = () => {
    setError(null);
    const availablePlayers = availability.filter((p) => p.isAvailable);

    if (availablePlayers.length < 2) {
      setError("Need at least 2 available players to form teams!");
      setTeams(null);
      return;
    }

    // 1. Sort by Skill Level (Descending)
    const sortedPlayers = [...availablePlayers].sort(
      (a, b) => b.skillLevel - a.skillLevel
    );

    let teamA: Team = { name: "Team A (Blue)", players: [], totalSkill: 0 };
    let teamB: Team = { name: "Team B (Red)", players: [], totalSkill: 0 };

    // 2. Greedy Assignment
    sortedPlayers.forEach((player) => {
      // Assign player to the team with the currently lower total skill score
      if (teamA.totalSkill <= teamB.totalSkill) {
        teamA.players.push(player);
        teamA.totalSkill += player.skillLevel;
      } else {
        teamB.players.push(player);
        teamB.totalSkill += player.skillLevel;
      }
    });

    // 3. Set the state with both teams correctly structured
    setTeams({ teamA, teamB });
    setView("teams");
  };

  // Memoized available players count for UI display
  const availableCount = useMemo(
    () => availability.filter((p) => p.isAvailable).length,
    [availability]
  );

  // --- UI COMPONENTS ---

  // 1. Player Registration Form Component
  const PlayerRegistrationForm: React.FC<{
    onAddPlayer: (player: Omit<Player, "id">) => void;
  }> = ({ onAddPlayer }) => {
    const [name, setName] = useState("");
    const [position, setPosition] = useState<Position>("FWD");
    const [skillLevel, setSkillLevel] = useState<SkillLevel>(3);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onAddPlayer({ name: name.trim(), position, skillLevel });
      setName("");
      setSkillLevel(3);
      setPosition("FWD");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    };

    return (
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-lg space-y-4"
      >
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center">
          <Plus className="mr-2 text-green-600" size={20} /> Register New Player
        </h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Player Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
          />

          <div className="relative">
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as Position)}
              className="w-full p-3 appearance-none border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 transition duration-150"
            >
              <option disabled>Select Position</option>
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos} -{" "}
                  {
                    {
                      GK: "Goalkeeper",
                      DEF: "Defender",
                      MID: "Midfielder",
                      FWD: "Forward",
                    }[pos]
                  }
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={18}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Skill Level:{" "}
              <span className="font-semibold text-blue-600">
                {skillLevel} ({SKILL_LABELS[skillLevel]})
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={skillLevel}
              onChange={(e) =>
                setSkillLevel(parseInt(e.target.value) as SkillLevel)
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            type="submit"
            disabled={name.trim().length === 0}
            className="bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300 shadow-md disabled:bg-gray-400"
          >
            Save Player
          </button>
          {showSuccess && (
            <div className="flex items-center text-green-600 font-medium">
              <CheckCircle className="mr-1" size={18} /> Player Registered!
            </div>
          )}
        </div>
      </form>
    );
  };

  // 2. Weekly Availability Poll Component
  const WeeklyAvailabilityPoll: React.FC = () => {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center">
          <ListChecks className="mr-2 text-indigo-600" size={20} /> Weekly
          Availability Poll
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Toggle players who are available to play this week.
        </p>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {availability.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition duration-200 ${
                player.isAvailable
                  ? "bg-indigo-50 border-indigo-400 border-l-4"
                  : "bg-gray-50 border-gray-300 border-l-4 opacity-70"
              }`}
              onClick={() => toggleAvailability(player.id)}
            >
              <div>
                <p className="font-semibold text-gray-800">{player.name}</p>
                <p className="text-xs text-gray-500">
                  {player.position} • Skill: {player.skillLevel}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {player.isAvailable ? (
                  <span className="text-green-600 font-medium">Playing</span>
                ) : (
                  <span className="text-red-500 font-medium">Out</span>
                )}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    player.isAvailable
                      ? "bg-green-500 border-green-700"
                      : "bg-red-500 border-red-700"
                  }`}
                >
                  {player.isAvailable ? (
                    <CheckCircle className="text-white" size={12} />
                  ) : (
                    <XCircle className="text-white" size={12} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t flex justify-between items-center">
          <p className="text-md font-semibold text-gray-700">
            Total Available:{" "}
            <span className="text-indigo-600 text-xl">{availableCount}</span>
          </p>
          <button
            onClick={generateBalancedTeams}
            className="bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-md flex items-center"
          >
            <Trophy className="mr-2" size={18} /> Generate Teams
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}
      </div>
    );
  };

  // 3. Team Results Component
  const TeamResults: React.FC<TeamResultsState> = ({ teamA, teamB }) => {
    // Helper function to count positions
    const countPositions = (players: PlayerAvailability[]) => {
      return players.reduce((acc, player) => {
        acc[player.position] = (acc[player.position] || 0) + 1;
        return acc;
      }, {} as Record<Position, number>);
    };

    const teamAPositions = countPositions(teamA.players);
    const teamBPositions = countPositions(teamB.players);

    // Calculate skill difference for display
    const skillDiff = Math.abs(teamA.totalSkill - teamB.totalSkill);

    return (
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 border-b pb-3 mb-4 flex items-center justify-center">
          <Trophy className="mr-3 text-yellow-500" size={28} /> Balanced Teams
          Generated!
        </h2>
        <div
          className={`p-3 text-center mb-4 rounded-lg font-medium ${
            skillDiff === 0
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          Skill Difference: {skillDiff} (Lower is better)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team A Card */}
          <TeamCard team={teamA} positions={teamAPositions} color="blue" />
          {/* Team B Card */}
          <TeamCard team={teamB} positions={teamBPositions} color="red" />
        </div>
        <div className="mt-6 pt-4 border-t text-center">
          <button
            onClick={() => setView("poll")}
            className="bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded-lg hover:bg-gray-300 transition duration-300"
          >
            Back to Poll
          </button>
        </div>
      </div>
    );
  };

  // Sub-component for Team Card
  const TeamCard: React.FC<{
    team: Team;
    positions: Record<Position, number>;
    color: "blue" | "red";
  }> = ({ team, positions, color }) => (
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
          <div
            key={pos}
            className="flex justify-between items-center text-gray-600"
          >
            <span>{pos}:</span>
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
          .map((player) => (
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

  // --- MAIN RENDER ---

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 flex items-center justify-center">
          <Users className="text-indigo-600 mr-3" size={32} /> Soccer Team
          Balancer
        </h1>
        <p className="text-gray-600 mt-2">
          Manage players, track availability, and generate fair teams.
        </p>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex justify-center mb-8">
        <button
          onClick={() => setView("register")}
          className={`px-6 py-3 font-semibold rounded-l-xl transition-colors ${
            view === "register"
              ? "bg-green-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Plus className="inline w-4 h-4 mr-2" /> Register
        </button>
        <button
          onClick={() => setView("poll")}
          className={`px-6 py-3 font-semibold transition-colors ${
            view === "poll"
              ? "bg-indigo-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-200"
          }`}
        >
          <ListChecks className="inline w-4 h-4 mr-2" /> Availability (
          {availableCount})
        </button>
        <button
          onClick={() => setView("teams")}
          disabled={!teams}
          className={`px-6 py-3 font-semibold rounded-r-xl transition-colors disabled:opacity-50 ${
            view === "teams"
              ? "bg-yellow-500 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Trophy className="inline w-4 h-4 mr-2" /> Teams
        </button>
      </nav>

      {/* Content Area */}
      <main className="max-w-4xl mx-auto">
        {view === "register" && (
          <PlayerRegistrationForm onAddPlayer={addPlayer} />
        )}
        {view === "poll" && <WeeklyAvailabilityPoll />}
        {view === "teams" && teams && (
          <TeamResults teamA={teams.teamA} teamB={teams.teamB} />
        )}
      </main>
    </div>
  );
}
