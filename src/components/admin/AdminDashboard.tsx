import React, { useState } from "react";
import { Calendar, Users, Target, Bell, Settings, BarChart3, Trophy, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";
import GameSchedule from "./GameSchedule";
import GoalsAssistsReview from "./GoalsAssistsReview";
import Notifications from "../notifications/Notifications";
import UserManagement from "./UserManagement";
import PlayerStatsEditor from "./PlayerStatsEditor";
import LeagueTableEditor from "./LeagueTableEditor";
import { PlayerAvailability } from "../../types/player";

interface ResetResult {
  success: boolean;
  count: number;
  message?: string;
  players?: string[];
}

interface AdminDashboardProps {
  db: any;
  userId: string;
  userEmail: string;
  userRole: string;
  onRoleUpdate: () => void;
  players: PlayerAvailability[];
  isActive?: boolean;
  onResetAvailability?: () => Promise<ResetResult>;
}

type AdminTab = "schedule" | "review" | "users" | "notifications" | "playerStats" | "leagueTable";

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  db,
  userId,
  userEmail,
  userRole,
  onRoleUpdate,
  players,
  isActive = false,
  onResetAvailability,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("schedule");
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);

  // Get count of players with "Playing" status
  const playingCount = players.filter(
    (p) => p.availabilityStatus === 'available' || p.isAvailable === true
  ).length;

  const handleResetAvailability = async () => {
    if (!onResetAvailability) return;
    
    setIsResetting(true);
    setResetResult(null);
    
    try {
      const result = await onResetAvailability();
      setResetResult(result);
      
      // Clear result after 5 seconds
      setTimeout(() => setResetResult(null), 5000);
    } catch (err) {
      setResetResult({ success: false, count: 0, message: "An error occurred while resetting." });
    } finally {
      setIsResetting(false);
    }
  };

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; description: string }[] = [
    {
      id: "schedule",
      label: "Game Schedule",
      icon: <Calendar className="w-5 h-5" />,
      description: "Manage game times and locations",
    },
    {
      id: "review",
      label: "Review Submissions",
      icon: <Target className="w-5 h-5" />,
      description: "Approve goals & assists",
    },
    {
      id: "playerStats",
      label: "Player Stats",
      icon: <BarChart3 className="w-5 h-5" />,
      description: "Edit player statistics",
    },
    {
      id: "leagueTable",
      label: "League Table",
      icon: <Trophy className="w-5 h-5" />,
      description: "Manage game results",
    },
    {
      id: "users",
      label: "User Management",
      icon: <Users className="w-5 h-5" />,
      description: "Manage users and roles",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell className="w-5 h-5" />,
      description: "Send announcements",
    },
  ];

  return (
    <div className={`relative overflow-hidden backdrop-blur-xl rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.15)] -mt-[1px] ${
      isActive
        ? "bg-gradient-to-br from-purple-50/95 via-pink-50/95 to-purple-50/95 border-l-2 border-r-2 border-b-2 border-purple-500/70"
        : "bg-white/90 border border-white/70 border-t-0"
    }`}>
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-purple-200/50 blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-200/50 blur-[80px]" />
      </div>

      <div className="relative z-10 p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
              <Settings className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
                Manage your soccer club settings and activities
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 sm:gap-2 p-2.5 sm:p-3 bg-gradient-to-b from-white/90 via-white/85 to-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.1),0_0_0_1px_rgba(255,255,255,0.5)_inset] border-2 border-purple-200/40 relative">
            {/* Decorative gradient line at top */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-400/40 via-pink-400/50 to-purple-400/40 rounded-t-2xl"></div>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex-1 min-w-[140px] sm:flex-initial flex flex-col sm:flex-row items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 overflow-hidden ${
                  activeTab === tab.id
                    ? "bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700 text-white shadow-[0_6px_20px_rgba(168,85,247,0.35),0_0_0_1px_rgba(255,255,255,0.1)_inset] ring-2 ring-purple-400/50"
                    : "bg-white/60 text-slate-700 hover:bg-gradient-to-br hover:from-purple-50/80 hover:via-pink-50/80 hover:to-purple-50/80 hover:text-purple-800 hover:shadow-lg hover:ring-1 hover:ring-purple-200/50 border border-transparent hover:border-purple-100/50"
                }`}
              >
                {activeTab === tab.id && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                  </>
                )}
                <span className={`relative transition-all duration-300 ${activeTab === tab.id ? "text-white scale-110 drop-shadow-sm" : "text-purple-600 group-hover:scale-110"}`}>
                  {tab.icon}
                </span>
                <div className="flex flex-col items-center sm:items-start relative">
                  <span className="font-semibold">{tab.label}</span>
                  <span className={`text-xs ${activeTab === tab.id ? "text-purple-100/90" : "text-slate-500"} hidden sm:block`}>
                    {tab.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Decorative connection line between tabs and content */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-purple-300/30 to-transparent mb-4"></div>

        {/* Tab Content */}
        <div className="min-h-[600px] relative">
          {activeTab === "schedule" && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <GameSchedule
                db={db}
                userId={userId}
                userEmail={userEmail}
                isActive={isActive}
              />
              
              {/* Reset Availability Section */}
              {onResetAvailability && (
                <div className="p-5 bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl border-2 border-slate-200/60 shadow-lg">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl shadow-md">
                        <RotateCcw className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">Reset Player Availability</h3>
                        <p className="text-sm text-slate-600 mt-0.5">
                          Reset all players with "Playing" status back to "No Vote"
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="font-semibold text-emerald-600">{playingCount}</span> player{playingCount !== 1 ? 's' : ''} currently marked as "Playing"
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleResetAvailability}
                      disabled={isResetting || playingCount === 0}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] ${
                        playingCount === 0
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-700 hover:to-slate-800"
                      }`}
                    >
                      {isResetting ? (
                        <>
                          <RotateCcw className="w-4 h-4 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          Reset to No Vote
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Reset Result Message */}
                  {resetResult && (
                    <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${
                      resetResult.success
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}>
                      {resetResult.success ? (
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span>{resetResult.message}</span>
                      {resetResult.players && resetResult.players.length > 0 && (
                        <span className="text-xs opacity-80 ml-1">
                          ({resetResult.players.slice(0, 3).join(", ")}{resetResult.players.length > 3 ? `, +${resetResult.players.length - 3} more` : ""})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "review" && (
            <div className="animate-in fade-in duration-300 -mx-4 sm:-mx-6">
              <GoalsAssistsReview
                db={db}
                currentUserId={userId}
                currentUserEmail={userEmail}
                isActive={isActive}
              />
            </div>
          )}

          {activeTab === "users" && (
            <div className="animate-in fade-in duration-300 -mx-4 sm:-mx-6">
              <UserManagement
                db={db}
                currentUserId={userId}
                onRoleUpdate={onRoleUpdate}
                isActive={isActive}
              />
            </div>
          )}

          {activeTab === "playerStats" && (
            <div className="animate-in fade-in duration-300 -mx-4 sm:-mx-6">
              <PlayerStatsEditor
                db={db}
                players={players}
                currentUserId={userId}
                currentUserEmail={userEmail}
                isActive={isActive}
              />
            </div>
          )}

          {activeTab === "leagueTable" && (
            <div className="animate-in fade-in duration-300 -mx-4 sm:-mx-6">
              <LeagueTableEditor
                db={db}
                currentUserId={userId}
                currentUserEmail={userEmail}
                isActive={isActive}
              />
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="animate-in fade-in duration-300 -mx-4 sm:-mx-6">
              <Notifications
                db={db}
                userId={userId}
                userEmail={userEmail}
                userRole={userRole}
                isActive={isActive}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

