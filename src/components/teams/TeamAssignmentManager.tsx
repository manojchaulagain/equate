import React, { useState, useEffect } from "react";
import { PlayerAvailability } from "../../types/player";
import { Users, X, Shield } from "lucide-react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { FirestorePaths } from "../../utils/firestorePaths";

interface TeamAssignmentManagerProps {
  availablePlayers: PlayerAvailability[];
  db: any;
  isAdmin: boolean;
}

type TeamAssignment = "red" | "blue" | null;

interface TeamAssignmentsData {
  assignments: Record<string, TeamAssignment>; // playerId -> "red" | "blue" | null
  updatedAt?: string;
}

const TeamAssignmentManager: React.FC<TeamAssignmentManagerProps> = ({
  availablePlayers,
  db,
  isAdmin,
}) => {
  const [assignments, setAssignments] = useState<Record<string, TeamAssignment>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showManager, setShowManager] = useState(false);

  // Load team assignments from Firestore
  useEffect(() => {
    if (!db || !isAdmin) return;

    const assignmentsPath = FirestorePaths.teamAssignments();
    const assignmentsRef = doc(db, assignmentsPath);

    const unsubscribe = onSnapshot(
      assignmentsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as TeamAssignmentsData;
          setAssignments(data.assignments || {});
        } else {
          setAssignments({});
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error loading team assignments:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, isAdmin]);

  // Save team assignments to Firestore
  const saveAssignments = async (newAssignments: Record<string, TeamAssignment>) => {
    if (!db || !isAdmin) return;

    setSaving(true);
    try {
      const assignmentsPath = FirestorePaths.teamAssignments();
      const assignmentsRef = doc(db, assignmentsPath);
      
      const data: TeamAssignmentsData = {
        assignments: newAssignments,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(assignmentsRef, data, { merge: true });
      setAssignments(newAssignments);
    } catch (error) {
      console.error("Error saving team assignments:", error);
      alert("Failed to save team assignments. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignmentChange = (playerId: string, team: TeamAssignment) => {
    const newAssignments = { ...assignments };
    if (team === null) {
      delete newAssignments[playerId];
    } else {
      newAssignments[playerId] = team;
    }
    saveAssignments(newAssignments);
  };

  const clearAllAssignments = () => {
    if (window.confirm("Clear all team assignments? This will remove all player assignments to Red/Blue teams.")) {
      saveAssignments({});
    }
  };

  // Count assignments
  const redCount = Object.values(assignments).filter(a => a === "red").length;
  const blueCount = Object.values(assignments).filter(a => a === "blue").length;

  if (!isAdmin) return null;

  return (
    <div className="mb-4 sm:mb-6">
      <button
        onClick={() => setShowManager(!showManager)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-100 to-purple-100 border-2 border-indigo-300/60 rounded-xl hover:shadow-lg transition-all duration-200"
        type="button"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800">Pre-Assign Players to Teams</p>
            <p className="text-xs text-slate-600">
              Red: {redCount} • Blue: {blueCount}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(redCount > 0 || blueCount > 0) && (
            <span className="px-2 py-1 bg-indigo-500 text-white text-xs font-bold rounded-lg">
              {redCount + blueCount}
            </span>
          )}
          <X
            className={`w-5 h-5 text-slate-600 transition-transform duration-200 ${
              showManager ? "rotate-90" : ""
            }`}
          />
        </div>
      </button>

      {showManager && (
        <div className="mt-3 p-4 bg-white/80 border-2 border-indigo-200/60 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-700">
              Assign players to Red or Blue team before generating teams
            </p>
            {(redCount > 0 || blueCount > 0) && (
              <button
                onClick={clearAllAssignments}
                disabled={saving || loading}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Clear All
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="inline-block w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : availablePlayers.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No available players to assign
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
              {availablePlayers.map((player) => {
                const currentAssignment = assignments[player.id] || null;
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Users className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{player.name}</span>
                      <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-200 rounded">
                        {player.position}
                      </span>
                      <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-200 rounded">
                        S{player.skillLevel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAssignmentChange(player.id, "red")}
                        disabled={saving || loading}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          currentAssignment === "red"
                            ? "bg-red-600 text-white shadow-md"
                            : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                        } disabled:opacity-50`}
                      >
                        Red
                      </button>
                      <button
                        onClick={() => handleAssignmentChange(player.id, "blue")}
                        disabled={saving || loading}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          currentAssignment === "blue"
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                        } disabled:opacity-50`}
                      >
                        Blue
                      </button>
                      {currentAssignment && (
                        <button
                          onClick={() => handleAssignmentChange(player.id, null)}
                          disabled={saving || loading}
                          className="px-2 py-1.5 text-xs text-slate-600 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Clear assignment"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(redCount > 0 || blueCount > 0) && (
            <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-800">
                ⚠️ {redCount + blueCount} player(s) will be assigned to their designated teams when you generate teams.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamAssignmentManager;

