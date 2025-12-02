import React, { useState } from "react";
import { Trophy, Heart, Star, BarChart3 } from "lucide-react";
import Leaderboard from "../leaderboard/Leaderboard";
import KudosBoard from "../kudos/KudosBoard";
import ManOfTheMatch from "../motm/ManOfTheMatch";
import { PlayerAvailability } from "../../types/player";

interface StatisticsDashboardProps {
  db: any;
  userId: string;
  userEmail: string;
  userRole: string;
  players: PlayerAvailability[];
  isActive?: boolean;
}

type StatisticsTab = "leaderboard" | "kudos" | "motm";

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({
  db,
  userId,
  userEmail,
  userRole,
  players,
  isActive = false,
}) => {
  const [activeTab, setActiveTab] = useState<StatisticsTab>("leaderboard");

  const tabs: { id: StatisticsTab; label: string; icon: React.ReactNode; description: string }[] = [
    {
      id: "leaderboard",
      label: "Leaderboard",
      icon: <Trophy className="w-5 h-5" />,
      description: "Player rankings & stats",
    },
    {
      id: "kudos",
      label: "Kudos Board",
      icon: <Heart className="w-5 h-5" />,
      description: "Show appreciation",
    },
    {
      id: "motm",
      label: "Man of the Match",
      icon: <Star className="w-5 h-5" />,
      description: "Vote for MOTM",
    },
  ];

  return (
    <div className={`relative overflow-hidden backdrop-blur-xl rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.15)] -mt-[1px] ${
      isActive
        ? "bg-gradient-to-br from-amber-50/95 via-yellow-50/95 to-amber-50/95 border-l-2 border-r-2 border-b-2 border-amber-500/70"
        : "bg-white/90 border border-white/70 border-t-0"
    }`}>
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-amber-200/50 blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-yellow-200/50 blur-[80px]" />
      </div>

      <div className="relative z-10 p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <BarChart3 className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 bg-clip-text text-transparent">
                Statistics
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
                View rankings and celebrate achievements
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 sm:gap-2 p-2.5 sm:p-3 bg-gradient-to-b from-white/90 via-white/85 to-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.1),0_0_0_1px_rgba(255,255,255,0.5)_inset] border-2 border-amber-200/40 relative">
            {/* Decorative gradient line at top */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400/40 via-orange-400/50 to-amber-400/40 rounded-t-2xl"></div>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex-1 min-w-[140px] sm:flex-initial flex flex-col sm:flex-row items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 overflow-hidden ${
                  activeTab === tab.id
                    ? "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-[0_6px_20px_rgba(245,158,11,0.35),0_0_0_1px_rgba(255,255,255,0.1)_inset] ring-2 ring-amber-400/50"
                    : "bg-white/60 text-slate-700 hover:bg-gradient-to-br hover:from-amber-50/80 hover:via-orange-50/80 hover:to-amber-50/80 hover:text-amber-800 hover:shadow-lg hover:ring-1 hover:ring-amber-200/50 border border-transparent hover:border-amber-100/50"
                }`}
              >
                {activeTab === tab.id && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                  </>
                )}
                <span className={`relative transition-all duration-300 ${activeTab === tab.id ? "text-white scale-110 drop-shadow-sm" : "text-amber-600 group-hover:scale-110"}`}>
                  {tab.icon}
                </span>
                <div className="flex flex-col items-center sm:items-start relative">
                  <span className="font-semibold">{tab.label}</span>
                  <span className={`text-xs ${activeTab === tab.id ? "text-amber-100/90" : "text-slate-500"} hidden sm:block`}>
                    {tab.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Decorative connection line between tabs and content */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-amber-300/30 to-transparent mb-4"></div>

        {/* Tab Content */}
        <div className="min-h-[600px] relative">
          {activeTab === "leaderboard" && (
            <div className="animate-in fade-in duration-300">
              <Leaderboard
                db={db}
                userId={userId}
                userEmail={userEmail}
                userRole={userRole}
                players={players}
                isActive={isActive}
              />
            </div>
          )}

          {activeTab === "kudos" && (
            <div className="animate-in fade-in duration-300">
              <KudosBoard
                db={db}
                userId={userId}
                userEmail={userEmail}
                userRole={userRole}
                players={players}
                isActive={isActive}
              />
            </div>
          )}

          {activeTab === "motm" && (
            <div className="animate-in fade-in duration-300">
              <ManOfTheMatch
                db={db}
                userId={userId}
                userEmail={userEmail}
                userRole={userRole}
                players={players}
                isActive={isActive}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsDashboard;

