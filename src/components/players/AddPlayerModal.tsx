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
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-gradient-to-br from-slate-50/98 via-white/98 to-slate-50/98 backdrop-blur-xl w-[calc(100%-2rem)] max-w-full sm:max-w-2xl mx-4 my-4 sm:my-8 max-h-[90vh] sm:max-h-[85vh] rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.4)] border-2 border-emerald-200/60 p-5 sm:p-6 md:p-8 relative overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -top-24 -right-24 w-56 h-56 bg-emerald-300/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-green-300/30 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl"></div>
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-white/95 backdrop-blur-sm border-2 border-slate-200/60 rounded-full shadow-lg hover:shadow-xl hover:bg-white hover:border-slate-300 transition-all duration-200 hover:scale-110 active:scale-95 group"
          type="button"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
        </button>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-emerald-700 via-green-700 to-teal-700 bg-clip-text text-transparent mb-1">
                Register New Player
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Add a new player to the team</p>
            </div>
          </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Player Name
            </label>
            <input
              type="text"
              placeholder="Enter player's full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              required
              className="w-full p-4 text-base border-2 border-slate-300/80 rounded-xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-200 shadow-md hover:shadow-lg hover:border-emerald-300 placeholder:text-slate-400"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Position
            </label>
            <div className="relative">
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as Position)}
                className="w-full p-4 text-base appearance-none border-2 border-slate-300/80 rounded-xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-200 shadow-md hover:shadow-lg hover:border-emerald-300"
                disabled={isSaving}
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos} - {POSITION_LABELS[pos]}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={20}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Skill Level:{" "}
              <span className="ml-2 text-base font-black text-emerald-600">
                {skillLevel} ({SKILL_LABELS[skillLevel]})
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={skillLevel}
              onChange={(e) => setSkillLevel(parseInt(e.target.value) as SkillLevel)}
              className="w-full h-3 bg-gradient-to-r from-emerald-200 to-green-200 rounded-xl appearance-none cursor-pointer range-lg shadow-inner"
              disabled={isSaving}
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
              <span>1 (Newbie)</span>
              <span>10 (Legend)</span>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300/80 rounded-xl text-sm font-bold shadow-lg flex items-start gap-3 animate-in fade-in duration-200">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <X className="w-3 h-3 text-white" />
              </div>
              <span className="text-red-800">{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-3 text-base font-bold text-slate-700 bg-slate-200/80 hover:bg-slate-300/80 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-6 py-3 text-base font-black text-white bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-700 hover:via-green-700 hover:to-teal-700 rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-5 h-5" /> Save Player
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

export default AddPlayerModal;

