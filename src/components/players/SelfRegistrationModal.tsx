import React, { useState } from "react";
import { ChevronDown, UserPlus, AlertCircle } from "lucide-react";
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-slate-50/98 via-white/98 to-slate-50/98 backdrop-blur-xl w-[calc(100%-2rem)] max-w-full sm:max-w-2xl mx-4 my-4 sm:my-8 max-h-[90vh] sm:max-h-[85vh] rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.4)] border-2 border-amber-200/60 p-5 sm:p-6 md:p-8 relative overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Decorative background elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-200/40 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-yellow-200/40 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Welcome! Please Register
              </h2>
              <p className="text-sm text-slate-600 mt-1 font-medium">
                You need to register as a player before accessing the dashboard.
              </p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200/60 rounded-xl shadow-sm">
            <p className="text-sm text-blue-800 font-semibold">
              <span className="font-bold">Email:</span> {userEmail}
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
              className="w-full p-3 border-2 border-slate-300 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 shadow-sm hover:shadow-md"
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
                className="w-full p-3 appearance-none border-2 border-slate-300 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition duration-150 shadow-sm hover:shadow-md"
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
              className="w-full h-2.5 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl appearance-none cursor-pointer range-lg shadow-inner"
              disabled={isSaving}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 (Newbie)</span>
              <span>10 (Legend)</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold shadow-md">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-xl hover:from-amber-700 hover:to-yellow-700 transition-all duration-200 disabled:bg-gray-400 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              {isSaving ? (
                "Registering..."
              ) : (
                <>
                  <UserPlus className="w-5 h-5" /> Complete Registration
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default SelfRegistrationModal;

