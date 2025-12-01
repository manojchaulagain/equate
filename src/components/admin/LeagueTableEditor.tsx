import React, { useState, useEffect } from "react";
import { Trophy, Save, X, Plus, Edit, Trash2, Calendar, Search } from "lucide-react";
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, Timestamp, query, orderBy } from "firebase/firestore";
import { GameResult } from "../../types/league";
import { FirestorePaths } from "../../utils/firestorePaths";
import { getDateString } from "../../utils/gamePoints";

declare const __app_id: string;

interface LeagueTableEditorProps {
  db: any;
  currentUserId: string;
  currentUserEmail: string;
  isActive?: boolean;
}

const LeagueTableEditor: React.FC<LeagueTableEditorProps> = ({
  db,
  currentUserId,
  currentUserEmail,
  isActive = false,
}) => {
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResult, setEditingResult] = useState<GameResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formData, setFormData] = useState<{
    gameDate: string;
    team1Name: string;
    team1Score: number;
    team2Name: string;
    team2Score: number;
  }>({
    gameDate: getDateString(new Date()),
    team1Name: "",
    team1Score: 0,
    team2Name: "",
    team2Score: 0,
  });

  // Load game results
  useEffect(() => {
    if (!db) return;

    setLoading(true);
    const gameResultsPath = FirestorePaths.gameResults();
    const gameResultsRef = collection(db, gameResultsPath);

    const unsubscribe = onSnapshot(
      query(gameResultsRef, orderBy("gameDate", "desc")),
      (snapshot) => {
        const results = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GameResult[];
        setGameResults(results);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching game results:", err);
        setError("Failed to load game results");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db]);

  // Filter game results based on search
  const filteredResults = gameResults.filter((result) => {
    const search = searchQuery.toLowerCase();
    return (
      result.team1Name.toLowerCase().includes(search) ||
      result.team2Name.toLowerCase().includes(search) ||
      result.gameDate.includes(search)
    );
  });

  const handleAddClick = () => {
    setEditingResult(null);
    setFormData({
      gameDate: getDateString(new Date()),
      team1Name: "",
      team1Score: 0,
      team2Name: "",
      team2Score: 0,
    });
    setError(null);
    setSuccess(null);
    setShowAddModal(true);
  };

  const handleEditClick = (result: GameResult) => {
    setEditingResult(result);
    setFormData({
      gameDate: result.gameDate,
      team1Name: result.team1Name,
      team1Score: result.team1Score,
      team2Name: result.team2Name,
      team2Score: result.team2Score,
    });
    setError(null);
    setSuccess(null);
    setShowAddModal(true);
  };

  const handleDeleteClick = async (result: GameResult) => {
    if (!window.confirm(`Are you sure you want to delete the game result:\n${result.team1Name} ${result.team1Score} - ${result.team2Score} ${result.team2Name}\n\nThis action cannot be undone.`)) {
      return;
    }

    if (!db) return;

    setSaving(result.id);
    setError(null);
    setSuccess(null);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const gameResultsPath = FirestorePaths.gameResults();
      const resultRef = doc(db, `${gameResultsPath}/${result.id}`);
      await deleteDoc(resultRef);

      setSuccess(`Game result deleted successfully`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("Error deleting game result:", err);
      setError(`Failed to delete game result: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const handleSave = async () => {
    if (!db) return;

    if (!formData.team1Name || !formData.team2Name) {
      setError("Please enter both team names");
      return;
    }

    if (formData.team1Name === formData.team2Name) {
      setError("Teams must be different");
      return;
    }

    if (formData.team1Score < 0 || formData.team2Score < 0) {
      setError("Scores must be non-negative numbers");
      return;
    }

    setSaving("save");
    setError(null);
    setSuccess(null);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const gameResultsPath = FirestorePaths.gameResults();

      if (editingResult) {
        // Update existing result
        const resultRef = doc(db, `${gameResultsPath}/${editingResult.id}`);
        await updateDoc(resultRef, {
          gameDate: formData.gameDate,
          team1Name: formData.team1Name,
          team1Score: formData.team1Score,
          team2Name: formData.team2Name,
          team2Score: formData.team2Score,
          updatedAt: Timestamp.now(),
          updatedBy: currentUserEmail,
        });

        setSuccess(`Game result updated successfully`);
      } else {
        // Add new result
        // Check if result already exists for this game date
        const existingResult = gameResults.find(
          (r) => r.gameDate === formData.gameDate &&
          ((r.team1Name === formData.team1Name && r.team2Name === formData.team2Name) ||
           (r.team1Name === formData.team2Name && r.team2Name === formData.team1Name))
        );

        if (existingResult) {
          setError("A game result already exists for these teams on this date");
          setSaving(null);
          return;
        }

        const gameResultsRef = collection(db, gameResultsPath);
        await addDoc(gameResultsRef, {
          gameDate: formData.gameDate,
          team1Name: formData.team1Name,
          team1Score: formData.team1Score,
          team2Name: formData.team2Name,
          team2Score: formData.team2Score,
          createdAt: Timestamp.now(),
          createdBy: currentUserEmail,
        });

        setSuccess(`Game result added successfully`);
      }

      setShowAddModal(false);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("Error saving game result:", err);
      setError(`Failed to save game result: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const handleCancel = () => {
    setShowAddModal(false);
    setEditingResult(null);
    setError(null);
    setSuccess(null);
  };

  // Get unique team names for dropdown
  const uniqueTeamNames = Array.from(
    new Set([
      ...gameResults.map((r) => r.team1Name),
      ...gameResults.map((r) => r.team2Name),
      formData.team1Name,
      formData.team2Name,
    ])
  ).filter(Boolean).sort();

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-12 h-12 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-medium">Loading game results...</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden backdrop-blur-xl p-4 sm:p-6 rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.15)] -mt-[1px] ${
      isActive
        ? "bg-gradient-to-br from-purple-50/95 via-indigo-50/95 to-blue-50/95 border-l-2 border-r-2 border-b-2 border-purple-500/70"
        : "bg-white/90 border border-white/70 border-t-0"
    }`}>
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-purple-200/50 blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-200/50 blur-[80px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
              <Trophy className="text-purple-600" size={24} />
              Manage League Table
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-2">
              Edit game results to update league standings
            </p>
          </div>
          <button
            onClick={handleAddClick}
            className="px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 transform hover:scale-105 active:scale-95"
          >
            <Plus size={18} />
            Add Game Result
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 text-emerald-700 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-md">
            <Trophy className="w-4 h-4" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-2xl text-sm font-semibold shadow-md">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by team name or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 p-3.5 border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md text-sm font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full transition"
                type="button"
              >
                <X className="text-slate-400 hover:text-slate-600" size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Game Results List */}
        {filteredResults.length === 0 ? (
          <div className="text-center p-12 bg-gradient-to-br from-slate-100 to-purple-50 rounded-2xl border-2 border-dashed border-purple-200 shadow-lg">
            <Trophy className="mx-auto text-purple-400 mb-4" size={48} />
            <p className="text-slate-600 font-semibold text-lg mb-2">
              {searchQuery ? "No game results found matching your search" : "No game results yet"}
            </p>
            {!searchQuery && (
              <p className="text-sm text-slate-500">Add a game result to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {filteredResults.map((result) => (
              <div
                key={result.id}
                className="p-5 rounded-2xl border-2 border-purple-200/60 bg-gradient-to-r from-white to-purple-50/30 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-md">
                        <Calendar className="text-white" size={18} />
                      </div>
                      <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">{result.gameDate}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xl font-bold text-slate-800">
                      <span className="flex-1 text-right truncate pr-2">{result.team1Name}</span>
                      <div className="flex items-center gap-2 min-w-[80px] justify-center">
                        <span className="text-2xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                          {result.team1Score}
                        </span>
                        <span className="text-purple-400 font-bold">-</span>
                        <span className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                          {result.team2Score}
                        </span>
                      </div>
                      <span className="flex-1 text-left truncate pl-2">{result.team2Name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEditClick(result)}
                      disabled={saving !== null}
                      className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-xl hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110 active:scale-95 disabled:opacity-50"
                      type="button"
                      title="Edit game result"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(result)}
                      disabled={saving === result.id || saving !== null}
                      className="p-2.5 bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110 active:scale-95 disabled:opacity-50"
                      type="button"
                      title="Delete game result"
                    >
                      {saving === result.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] overflow-y-auto animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCancel();
              }
            }}
          >
            <div
              className="bg-gradient-to-br from-slate-50/98 via-white/98 to-slate-50/98 backdrop-blur-xl w-[calc(100%-2rem)] max-w-full sm:max-w-2xl mx-4 my-4 sm:my-8 max-h-[90vh] rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.4)] border-2 border-purple-200/60 p-5 sm:p-6 md:p-8 relative overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative background elements */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                <div className="absolute -top-24 -right-24 w-56 h-56 bg-purple-300/30 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-indigo-300/30 rounded-full blur-3xl"></div>
              </div>

              <button
                onClick={handleCancel}
                className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-white/95 backdrop-blur-sm border-2 border-slate-200/60 rounded-full shadow-lg hover:shadow-xl hover:bg-white hover:border-slate-300 transition-all duration-200 hover:scale-110 active:scale-95 group"
                type="button"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
              </button>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xl">
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 bg-clip-text text-transparent mb-1">
                      {editingResult ? "Edit Game Result" : "Add Game Result"}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                      {editingResult ? "Update the game result below" : "Enter the game details below"}
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="p-5 bg-gradient-to-r from-purple-50/80 via-indigo-50/80 to-blue-50/80 backdrop-blur-sm border-2 border-purple-200/60 rounded-2xl shadow-lg">
                    <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Calendar className="text-purple-600" size={18} />
                      Game Date
                    </label>
                    <input
                      type="date"
                      value={formData.gameDate}
                      onChange={(e) => setFormData({ ...formData, gameDate: e.target.value })}
                      className="w-full p-3.5 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md text-sm font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="p-5 bg-gradient-to-r from-red-50/80 to-rose-50/80 backdrop-blur-sm border-2 border-red-200/60 rounded-2xl shadow-lg">
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        Team 1 Name
                      </label>
                      <input
                        type="text"
                        value={formData.team1Name}
                        onChange={(e) => setFormData({ ...formData, team1Name: e.target.value })}
                        placeholder="Enter team name"
                        list="team-names"
                        className="w-full p-3.5 border-2 border-red-200 rounded-xl focus:ring-4 focus:ring-red-500/30 focus:border-red-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md text-sm font-medium"
                        required
                      />
                      <datalist id="team-names">
                        {uniqueTeamNames.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>

                    <div className="p-5 bg-gradient-to-r from-blue-50/80 to-cyan-50/80 backdrop-blur-sm border-2 border-blue-200/60 rounded-2xl shadow-lg">
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        Team 2 Name
                      </label>
                      <input
                        type="text"
                        value={formData.team2Name}
                        onChange={(e) => setFormData({ ...formData, team2Name: e.target.value })}
                        placeholder="Enter team name"
                        list="team-names"
                        className="w-full p-3.5 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md text-sm font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="p-5 bg-gradient-to-r from-amber-50/80 to-yellow-50/80 backdrop-blur-sm border-2 border-amber-200/60 rounded-2xl shadow-lg">
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        Team 1 Score
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.team1Score}
                        onChange={(e) => setFormData({ ...formData, team1Score: parseInt(e.target.value) || 0 })}
                        className="w-full p-3.5 border-2 border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-500/30 focus:border-amber-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md text-lg font-bold text-amber-700"
                        required
                      />
                    </div>

                    <div className="p-5 bg-gradient-to-r from-emerald-50/80 to-green-50/80 backdrop-blur-sm border-2 border-emerald-200/60 rounded-2xl shadow-lg">
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        Team 2 Score
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.team2Score}
                        onChange={(e) => setFormData({ ...formData, team2Score: parseInt(e.target.value) || 0 })}
                        className="w-full p-3.5 border-2 border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md text-lg font-bold text-emerald-700"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300/80 rounded-xl text-sm font-bold shadow-lg flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <X className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-red-800">{error}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t-2 border-purple-200">
                    <button
                      onClick={handleCancel}
                      disabled={saving === "save"}
                      className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all duration-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving === "save"}
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 transform hover:scale-105 active:scale-95"
                    >
                      {saving === "save" ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          {editingResult ? "Update" : "Add"} Game Result
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeagueTableEditor;
