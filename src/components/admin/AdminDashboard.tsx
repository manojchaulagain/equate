import React, { useState } from "react";
import { Calendar, Users, Target, Bell, Settings } from "lucide-react";
import GameSchedule from "./GameSchedule";
import GoalsAssistsReview from "./GoalsAssistsReview";
import Notifications from "../notifications/Notifications";
import UserManagement from "./UserManagement";

interface AdminDashboardProps {
  db: any;
  userId: string;
  userEmail: string;
  userRole: string;
  onRoleUpdate: () => void;
  isActive?: boolean;
}

type AdminTab = "schedule" | "review" | "users" | "notifications";

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  db,
  userId,
  userEmail,
  userRole,
  onRoleUpdate,
  isActive = false,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("schedule");

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
          <div className="flex flex-wrap gap-2 sm:gap-3 p-2 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-purple-200/60 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[140px] sm:flex-initial flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transform scale-[1.02]"
                    : "text-slate-700 hover:bg-purple-50/80 hover:text-purple-700"
                }`}
              >
                <span className={`${activeTab === tab.id ? "text-white" : "text-purple-600"}`}>
                  {tab.icon}
                </span>
                <div className="flex flex-col items-center sm:items-start">
                  <span className="font-semibold">{tab.label}</span>
                  <span className={`text-xs ${activeTab === tab.id ? "text-purple-100" : "text-slate-500"} hidden sm:block`}>
                    {tab.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === "schedule" && (
            <div className="animate-in fade-in duration-300 -mx-4 sm:-mx-6">
              <GameSchedule
                db={db}
                userId={userId}
                userEmail={userEmail}
                isActive={isActive}
              />
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

