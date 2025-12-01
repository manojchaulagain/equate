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
          <div className="flex flex-wrap gap-2 sm:gap-3 p-2 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-amber-200/60 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[140px] sm:flex-initial flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg transform scale-[1.02]"
                    : "text-slate-700 hover:bg-amber-50/80 hover:text-amber-700"
                }`}
              >
                <span className={`${activeTab === tab.id ? "text-white" : "text-amber-600"}`}>
                  {tab.icon}
                </span>
                <div className="flex flex-col items-center sm:items-start">
                  <span className="font-semibold">{tab.label}</span>
                  <span className={`text-xs ${activeTab === tab.id ? "text-amber-100" : "text-slate-500"} hidden sm:block`}>
                    {tab.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
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

