import React, { useState, useEffect } from "react";
import { Target, Footprints, CheckCircle, X, Clock, User } from "lucide-react";
import { collection, onSnapshot, query, where, doc, updateDoc, getDoc, setDoc, Timestamp } from "firebase/firestore";

declare const __app_id: string;

interface Submission {
  id: string;
  playerId: string;
  playerName: string;
  gameDate: string;
  goals: number;
  assists: number;
  submittedBy: string;
  submittedByEmail: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp | any;
  reviewedBy?: string;
  reviewedAt?: Timestamp | any;
}

interface GoalsAssistsReviewProps {
  db: any;
  currentUserId: string;
  currentUserEmail: string;
  isActive?: boolean;
}

const GoalsAssistsReview: React.FC<GoalsAssistsReviewProps> = ({
  db,
  currentUserId,
  currentUserEmail,
  isActive = false,
}) => {
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const submissionsPath = `artifacts/${appId}/public/data/goalsAssistsSubmissions`;
    const submissionsRef = collection(db, submissionsPath);
    
    // Use simple query without orderBy to avoid index issues
    // We'll sort client-side
    const q = query(
      submissionsRef,
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const submissions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Submission[];
        // Sort manually by createdAt descending
        submissions.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        setPendingSubmissions(submissions);
        setLoading(false);
      },
      (err: any) => {
        console.error("Error fetching submissions:", err);
        setError("Failed to load submissions.");
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [db]);

  const handleApprove = async (submission: Submission) => {
    if (processingId) return;

    setProcessingId(submission.id);
    setError(null);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

      // Update submission status
      const submissionRef = doc(db, `artifacts/${appId}/public/data/goalsAssistsSubmissions/${submission.id}`);
      await updateDoc(submissionRef, {
        status: "approved",
        reviewedBy: currentUserId,
        reviewedByEmail: currentUserEmail,
        reviewedAt: Timestamp.now(),
      });

      // Update player's goals and assists
      const pointsPath = `artifacts/${appId}/public/data/playerPoints/${submission.playerId}`;
      const pointsRef = doc(db, pointsPath);
      const existingDoc = await getDoc(pointsRef);

      let existingGoals = 0;
      let existingAssists = 0;
      let existingTotalPoints = 0;
      let existingHistory: any[] = [];

      if (existingDoc.exists()) {
        const data = existingDoc.data();
        existingGoals = data.goals || 0;
        existingAssists = data.assists || 0;
        existingTotalPoints = data.totalPoints || 0;
        existingHistory = data.pointsHistory || [];
      }

      const newGoals = existingGoals + submission.goals;
      const newAssists = existingAssists + submission.assists;

      await setDoc(
        pointsRef,
        {
          playerId: submission.playerId,
          playerName: submission.playerName,
          goals: newGoals,
          assists: newAssists,
          totalPoints: existingTotalPoints,
          pointsHistory: existingHistory,
          motmAwards: existingDoc.exists() ? (existingDoc.data().motmAwards || 0) : 0,
        },
        { merge: true }
      );

      setSuccess(`Approved stats for ${submission.playerName}: ${submission.goals} goals, ${submission.assists} assists`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("Error approving submission:", err);
      setError(`Failed to approve submission: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (submission: Submission) => {
    if (processingId) return;

    setProcessingId(submission.id);
    setError(null);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const submissionRef = doc(db, `artifacts/${appId}/public/data/goalsAssistsSubmissions/${submission.id}`);
      
      await updateDoc(submissionRef, {
        status: "rejected",
        reviewedBy: currentUserId,
        reviewedByEmail: currentUserEmail,
        reviewedAt: Timestamp.now(),
      });

      setSuccess(`Rejected submission for ${submission.playerName}`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("Error rejecting submission:", err);
      setError(`Failed to reject submission: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className={`relative overflow-hidden backdrop-blur-xl p-4 sm:p-6 rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.15)] -mt-[1px] ${
      isActive
        ? "bg-gradient-to-br from-purple-50/95 via-indigo-50/95 to-blue-50/95 border-l-2 border-r-2 border-b-2 border-purple-500/70"
        : "bg-white/90 border border-white/70 border-t-0"
    }`}>
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-purple-200/50 blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-200/50 blur-[80px]" />
      </div>
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
              <Target className="text-purple-600" size={24} />
              Review Goals & Assists
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-2">
              Review and approve or reject player goal and assist submissions.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border-2 border-emerald-300 text-emerald-700 rounded-xl text-sm font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        {loading ? (
          <div className="text-center p-8">
            <p className="text-slate-600 font-medium">Loading submissions...</p>
          </div>
        ) : pendingSubmissions.length === 0 ? (
          <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-purple-50 rounded-2xl border-2 border-dashed border-purple-200">
            <CheckCircle className="mx-auto text-purple-400 mb-3" size={48} />
            <p className="text-slate-600 font-medium">No pending submissions.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
            {pendingSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="p-4 rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-white to-purple-50 shadow-md"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="text-purple-600" size={18} />
                      <p className="font-bold text-slate-800 text-base sm:text-lg">
                        {submission.playerName}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="text-red-500" size={16} />
                        <span className="text-sm font-semibold text-slate-700">
                          {submission.goals} {submission.goals === 1 ? "Goal" : "Goals"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Footprints className="text-blue-500" size={16} />
                        <span className="text-sm font-semibold text-slate-700">
                          {submission.assists} {submission.assists === 1 ? "Assist" : "Assists"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>Game: {submission.gameDate}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User size={12} />
                        <span>Submitted by: {submission.submittedByEmail}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(submission)}
                      disabled={processingId === submission.id}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <CheckCircle size={16} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(submission)}
                      disabled={processingId === submission.id}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <X size={16} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalsAssistsReview;

