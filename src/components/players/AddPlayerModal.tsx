import React, { useState } from "react";
import { X, Save, ChevronDown, UserPlus } from "lucide-react";
import { Position, SkillLevel } from "../../types/player";
import { POSITIONS, POSITION_LABELS, SKILL_LABELS } from "../../constants/player";

interface AddPlayerModalProps {
  onClose: () => void;
  onAddPlayer: (player: { name: string; position: Position; skillLevel: SkillLevel }) => Promise<void>;
}

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  onClose,
  onAddPlayer,
}) => {
  const [name, setName] = useState("");
  const [position, setPosition] = useState<Position>("CM");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(5);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a player name.");
      return;
    }

    setIsSaving(true);
    setError(null); // Clear error when starting new submission

    try {
      await onAddPlayer({
        name: name.trim(),
        position,
        skillLevel,
      });
      // Reset form and close
      setName("");
      setPosition("CM");
      setSkillLevel(5);
      setError(null); // Clear error on success
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add player.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-5 md:p-6 relative my-auto max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center">
          <UserPlus className="mr-2 text-green-600" size={24} /> Register New Player
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player Name
            </label>
            <input
              type="text"
              placeholder="Enter player full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null); // Clear error when user starts typing
              }}
              required
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position
            </label>
            <div className="relative">
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as Position)}
                className="w-full p-3 appearance-none border border-gray-300 rounded-xl bg-white focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                disabled={isSaving}
              >
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full h-2 bg-gray-200 rounded-xl appearance-none cursor-pointer range-lg"
              disabled={isSaving}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 (Newbie)</span>
              <span>10 (Legend)</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 transition duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition duration-200 disabled:bg-gray-400 flex items-center"
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="mr-2" size={16} /> Save Player
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPlayerModal;

