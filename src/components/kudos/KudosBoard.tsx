import React, { useState, useEffect } from "react";
import { Heart, Send, ThumbsUp, MessageCircle, X } from "lucide-react";
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";

declare const __app_id: string;

interface Kudos {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  toPlayerId: string;
  toPlayerName: string;
  message: string;
  createdAt: Timestamp | any;
}

interface KudosBoardProps {
  db: any;
  userId: string;
  userEmail: string;
  players: any[];
  isActive?: boolean;
}

const KudosBoard: React.FC<KudosBoardProps> = ({ db, userId, userEmail, players, isActive = false }) => {
  const [kudos, setKudos] = useState<Kudos[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const kudosPath = `artifacts/${appId}/public/data/kudos`;
    const kudosRef = collection(db, kudosPath);
    const q = query(kudosRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const kudosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Kudos[];
        setKudos(kudosData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching kudos:", err);
        setError("Failed to load kudos.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !message.trim() || !db) {
      setError("Please select a player and enter a message.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const kudosPath = `artifacts/${appId}/public/data/kudos`;
      const kudosRef = collection(db, kudosPath);

      const player = players.find((p) => p.id === selectedPlayer);
      if (!player) {
        throw new Error("Player not found");
      }

      await addDoc(kudosRef, {
        fromUserId: userId,
        fromUserEmail: userEmail,
        toPlayerId: selectedPlayer,
        toPlayerName: player.name,
        message: message.trim(),
        createdAt: Timestamp.now(),
      });

      // Create notification for the player who received kudos
      if (player.userId) {
        const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        const notificationsPath = `artifacts/${appId}/public/data/userNotifications`;
        const notificationsRef = collection(db, notificationsPath);
        await addDoc(notificationsRef, {
          userId: player.userId,
          type: "kudos",
          message: `${userEmail} gave you kudos!`,
          fromUserEmail: userEmail,
          relatedPlayerId: selectedPlayer,
          relatedPlayerName: player.name,
          createdAt: Timestamp.now(),
          read: false,
        });
      }

      setSelectedPlayer("");
      setMessage("");
      setShowAddModal(false);
      setError(null);
    } catch (err: any) {
      console.error("Error submitting kudos:", err);
      setError("Failed to submit kudos. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormattedDate = (timestamp: Timestamp | any) => {
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    return "N/A";
  };

  return (
    <div className={`relative overflow-hidden backdrop-blur-xl p-4 sm:p-6 rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.15)] -mt-[1px] ${
      isActive 
        ? "bg-gradient-to-br from-pink-50/95 via-rose-50/95 to-pink-50/95 border-l-2 border-r-2 border-b-2 border-pink-500/70" 
        : "bg-white/90 border border-white/70 border-t-0"
    }`}>
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-pink-200/50 blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-rose-200/50 blur-[80px]" />
      </div>
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
              <Heart className="text-pink-600" size={24} />
              Kudos Board
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
              Show appreciation and give kudos to your teammates for their great plays and sportsmanship!
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-2xl hover:from-pink-600 hover:to-rose-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Heart className="w-4 h-4" />
            <span>Give Kudos</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center p-8">
            <p className="text-slate-600 font-medium">Loading kudos...</p>
          </div>
        ) : kudos.length === 0 ? (
          <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-pink-50 rounded-2xl border-2 border-dashed border-pink-200">
            <Heart className="mx-auto text-pink-400 mb-3" size={48} />
            <p className="text-slate-600 font-medium">No kudos yet. Be the first to show appreciation!</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
            {kudos.map((kudo) => (
              <div
                key={kudo.id}
                className="p-4 sm:p-5 rounded-2xl border-2 shadow-md bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-md flex-shrink-0">
                    <Heart className="text-white" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 mb-1">
                      <span className="text-pink-700">{kudo.fromUserEmail}</span> gave kudos to{" "}
                      <span className="font-bold text-pink-800">{kudo.toPlayerName}</span>
                    </p>
                    <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap break-words">
                      {kudo.message}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {getFormattedDate(kudo.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Kudos Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              setError(null);
              setSelectedPlayer("");
              setMessage("");
            }
          }}
        >
          <div 
            className="bg-gradient-to-br from-slate-50/95 via-white/95 to-slate-50/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.3)] border-2 border-slate-200/60 max-w-md w-full p-5 sm:p-6 md:p-7 relative my-auto max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background elements */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-pink-200/30 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-rose-200/30 rounded-full blur-3xl"></div>
            </div>
            
            <button
              onClick={() => {
                setShowAddModal(false);
                setError(null);
                setSelectedPlayer("");
                setMessage("");
              }}
              className="absolute top-4 right-4 p-2 hover:bg-slate-200/60 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 z-20"
              type="button"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Give Kudos
                </h2>
              </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Player
                </label>
                <select
                  value={selectedPlayer}
                  onChange={(e) => {
                    setSelectedPlayer(e.target.value);
                    setError(null);
                  }}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition duration-150 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select a player</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g., Great goal today! Amazing teamwork in defense..."
                  rows={4}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition duration-150 resize-none bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold shadow-md">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                <Send size={20} /> {isSubmitting ? 'Sending...' : 'Send Kudos'}
              </button>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KudosBoard;

