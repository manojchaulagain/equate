import React, { useState, useEffect } from "react";
import { X, Save, ChevronDown } from "lucide-react";
import { Player, Position, SkillLevel } from "../../types/player";
import { POSITIONS, POSITION_LABELS, SKILL_LABELS } from "../../constants/player";

interface EditPlayerModalProps {
  player: Player;
  onClose: () => void;
  onSave: (playerId: string, updates: { position: Position; skillLevel: SkillLevel }) => Promise<void>;
}

const EditPlayerModal: React.FC<EditPlayerModalProps> = ({
  player,
  onClose,
  onSave,
}) => {
  const [position, setPosition] = useState<Position>(player.position);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(player.skillLevel);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPosition(player.position);
    setSkillLevel(player.skillLevel);
  }, [player]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check if anything changed
    if (position === player.position && skillLevel === player.skillLevel) {
      onClose();
      return;
    }

    setIsSaving(true);

    try {
      await onSave(player.id, { position, skillLevel });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update player.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-gradient-to-br from-slate-50/95 via-white/95 to-slate-50/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.3)] border-2 border-slate-200/60 max-w-md w-full p-5 sm:p-6 md:p-7 relative my-auto max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-purple-200/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-indigo-200/30 rounded-full blur-3xl"></div>
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-200/60 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 z-20"
          type="button"
          aria-label="Close modal"
        >
          <X size={20} className="text-slate-600" />
        </button>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Save className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Edit Player
              </h2>
              <p className="text-sm text-slate-600 font-medium">{player.name}</p>
            </div>
          </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position
            </label>
            <div className="relative">
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as Position)}
                className="w-full p-3 appearance-none border-2 border-slate-300 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition duration-150 shadow-sm hover:shadow-md"
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

          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 text-slate-700 bg-slate-200/80 hover:bg-slate-300 rounded-xl transition-all duration-200 disabled:opacity-50 font-semibold hover:scale-105 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 disabled:bg-gray-400 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
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

export default EditPlayerModal;

