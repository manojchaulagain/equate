import React, { useState } from "react";
import { Plus, CheckCircle, ChevronDown } from "lucide-react";
import { Player, Position, SkillLevel } from "../../types/player";
import {
  POSITIONS,
  POSITION_LABELS,
  SKILL_LABELS,
} from "../../constants/player";

interface PlayerRegistrationFormProps {
  onAddPlayer: (player: Omit<Player, "id">) => Promise<void>;
  disabled?: boolean;
}

const PlayerRegistrationForm: React.FC<PlayerRegistrationFormProps> = ({
  onAddPlayer,
  disabled = false,
}) => {
  const [name, setName] = useState("");
  const [position, setPosition] = useState<Position>("CM");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await onAddPlayer({ name: name.trim(), position, skillLevel });

    setName("");
    setSkillLevel(5);
    setPosition("CM");
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg space-y-4">
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
                {pos} - {POSITION_LABELS[pos]}
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
            max="10"
            value={skillLevel}
            onChange={(e) => setSkillLevel(parseInt(e.target.value) as SkillLevel)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg"
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <button
          type="submit"
          disabled={name.trim().length === 0 || isSubmitting || disabled}
          className="bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300 shadow-md disabled:bg-gray-400 flex items-center justify-center"
        >
          {isSubmitting ? "Saving..." : "Save Player"}
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

export default PlayerRegistrationForm;

