import React, { useState } from "react";
import { X, Save, ChevronDown, UserPlus, AlertCircle } from "lucide-react";
import { Position, SkillLevel } from "../../types/player";
import { POSITIONS, POSITION_LABELS, SKILL_LABELS } from "../../constants/player";

interface SelfRegistrationModalProps {
  userEmail: string;
  onRegister: (player: { name: string; position: Position; skillLevel: SkillLevel }) => Promise<void>;
}

const SelfRegistrationModal: React.FC<SelfRegistrationModalProps> = ({
  userEmail,
  onRegister,
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
      setError("Please enter your name.");
      return;
    }

    setIsSaving(true);
    setError(null); // Clear error when starting new submission

    try {
      await onRegister({
        name: name.trim(),
        position,
        skillLevel,
      });
      // Modal will be closed by parent after successful registration
      setError(null); // Clear error on success
    } catch (err: any) {
      setError(err.message || "Failed to register. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-4 sm:p-5 md:p-6 relative my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0">
            <AlertCircle className="text-yellow-500" size={24} />
          </div>
          <div className="ml-3 flex-1">
            <h2 className="text-2xl font-bold text-gray-800">
              Welcome! Please Register
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              You need to register as a player before accessing the dashboard.
            </p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-800">
            <strong>Email:</strong> {userEmail}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
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

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition duration-200 disabled:bg-gray-400 flex items-center font-semibold"
            >
              {isSaving ? (
                "Registering..."
              ) : (
                <>
                  <UserPlus className="mr-2" size={18} /> Complete Registration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SelfRegistrationModal;

