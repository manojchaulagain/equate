import React, { useState, useEffect } from "react";
import { Calendar, Save, CheckCircle, MapPin } from "lucide-react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import TimeInput from "./TimeInput";

declare const __app_id: string;

interface GameScheduleData {
  schedule: { [day: number]: string }; // Map of day (0-6) to time string (HH:MM)
  location?: { [day: number]: string }; // Map of day (0-6) to location string
  updatedAt?: any;
  updatedBy?: string;
}

interface GameScheduleProps {
  db: any;
  userId: string;
  userEmail: string;
  isActive?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const GameSchedule: React.FC<GameScheduleProps> = ({ db, userId, userEmail, isActive = false }) => {
  const [schedule, setSchedule] = useState<{ [day: number]: string }>({
    6: "18:00", // Default to Saturday at 6:00 PM
  });
  const [location, setLocation] = useState<{ [day: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;

    const fetchSchedule = async () => {
      try {
        const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        const schedulePath = `artifacts/${appId}/public/data/gameSchedule/config`;
        const scheduleRef = doc(db, schedulePath);
        const scheduleSnap = await getDoc(scheduleRef);

        if (scheduleSnap.exists()) {
          const data = scheduleSnap.data() as GameScheduleData;
          setSchedule(data.schedule || { 6: "18:00" });
          setLocation(data.location || {});
        }
      } catch (err: any) {
        console.error("Error fetching game schedule:", err);
        setError("Failed to load game schedule.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [db]);

  const handleDayToggle = (dayValue: number) => {
    setSchedule((prev) => {
      if (prev[dayValue]) {
        // Remove day if it exists
        const newSchedule = { ...prev };
        delete newSchedule[dayValue];
        // Also remove location for this day
        setLocation((prevLoc) => {
          const newLocation = { ...prevLoc };
          delete newLocation[dayValue];
          return newLocation;
        });
        return newSchedule;
      } else {
        // Add day with default time
        return { ...prev, [dayValue]: "18:00" };
      }
    });
    setError(null);
  };

  const handleTimeChange = (dayValue: number, time: string) => {
    setSchedule((prev) => {
      if (prev[dayValue]) {
        return { ...prev, [dayValue]: time };
      }
      return prev;
    });
    setError(null);
  };

  const handleLocationChange = (dayValue: number, loc: string) => {
    setLocation((prev) => {
      if (loc.trim()) {
        // Store the raw value (with spaces) - only trim when saving
        return { ...prev, [dayValue]: loc };
      } else {
        // Remove location if empty
        const newLocation = { ...prev };
        delete newLocation[dayValue];
        return newLocation;
      }
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!db || Object.keys(schedule).length === 0) {
      setError("Please select at least one day of the week.");
      return;
    }

    // Validate all times are set
    const hasEmptyTime = Object.values(schedule).some(time => !time || time.trim() === "");
    if (hasEmptyTime) {
      setError("Please set a game time for all selected days.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const schedulePath = `artifacts/${appId}/public/data/gameSchedule/config`;
      const scheduleRef = doc(db, schedulePath);

      // Trim location values before saving
      const trimmedLocation: { [day: number]: string } = {};
      Object.keys(location).forEach((dayStr) => {
        const day = parseInt(dayStr);
        const trimmed = location[day].trim();
        if (trimmed) {
          trimmedLocation[day] = trimmed;
        }
      });

      await setDoc(
        scheduleRef,
        {
          schedule: schedule,
          location: Object.keys(trimmedLocation).length > 0 ? trimmedLocation : null,
          updatedAt: Timestamp.now(),
          updatedBy: userEmail,
        }
      );

      setSuccess("Game schedule saved successfully!");
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error saving game schedule:", err);
      setError(`Failed to save schedule: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden p-6 sm:p-8">
        <div className="text-center py-12">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-emerald-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-600 font-semibold text-sm">Loading game schedule...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="relative z-10">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
              <Calendar className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Game Schedule
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                Configure game times and field locations
              </p>
            </div>
          </div>
        </div>

        {/* Summary & Info Card */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Summary Card */}
          <div className="p-4 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-500/10 backdrop-blur-sm border-2 border-emerald-300/60 rounded-xl shadow-sm">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Scheduled Days</p>
            <p className="text-3xl font-black text-emerald-600 mb-1">
              {Object.keys(schedule).length}
            </p>
            <p className="text-xs text-emerald-600/80 font-medium">
              {Object.keys(schedule).length === 1 ? "day" : "days"} selected
            </p>
          </div>

          {/* Quick Guide Card */}
          <div className="p-4 bg-gradient-to-r from-emerald-50/80 via-teal-50/80 to-emerald-50/80 backdrop-blur-sm border-2 border-emerald-200/60 rounded-xl shadow-sm">
            <p className="text-xs sm:text-sm text-emerald-800 font-semibold mb-2">
              💡 Quick Guide
            </p>
            <ul className="text-xs text-emerald-700 space-y-1">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>Toggle switches to schedule games</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>Set time and location for each day</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          {/* Days of Week Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Calendar className="text-emerald-600" size={18} />
              <span>Schedule Game Days</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = schedule[day.value] !== undefined;
                return (
                  <div
                    key={day.value}
                    className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                      isSelected
                        ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400 shadow-lg shadow-emerald-500/20"
                        : "bg-white/80 border-slate-200 hover:border-emerald-200 hover:shadow-md"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    )}
                    <div className="relative p-4">
                      <button
                        type="button"
                        onClick={() => handleDayToggle(day.value)}
                        className={`w-full flex items-center justify-between mb-3 transition-all duration-300 ${
                          isSelected ? "mb-4" : ""
                        }`}
                      >
                        <span className={`font-bold text-base transition-colors ${
                          isSelected ? "text-emerald-700" : "text-slate-700 group-hover:text-emerald-600"
                        }`}>
                          {day.label}
                        </span>
                        <div className={`w-10 h-6 rounded-full p-0.5 transition-all duration-300 ${
                          isSelected
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                            : "bg-slate-300"
                        }`}>
                          <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                            isSelected ? "translate-x-4" : "translate-x-0"
                          }`}></div>
                        </div>
                      </button>
                      
                      {isSelected && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                              <Calendar className="text-emerald-600" size={14} />
                              <span>Game Time</span>
                            </label>
                            <TimeInput
                              value={schedule[day.value]}
                              onChange={(time) => handleTimeChange(day.value, time)}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                              <MapPin className="text-emerald-600" size={14} />
                              <span>Field Location</span>
                              <span className="text-xs font-normal text-slate-400">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={location[day.value] || ""}
                              onChange={(e) => handleLocationChange(day.value, e.target.value)}
                              placeholder="e.g., Central Park Field 3"
                              className="w-full p-2.5 border-2 border-slate-300/80 rounded-lg focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition duration-200 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {Object.keys(schedule).length === 0 && (
              <div className="mt-4 p-3 bg-amber-50 border-2 border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700 font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Please select at least one day to schedule games.</span>
                </p>
              </div>
            )}
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="p-4 bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border-2 border-red-300/80 text-red-800 rounded-xl text-sm font-semibold shadow-lg flex items-start gap-3 animate-in fade-in duration-200">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs">!</span>
              </div>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300/80 text-emerald-800 rounded-xl text-sm font-semibold shadow-lg flex items-start gap-3 animate-in fade-in duration-200">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-4 border-t-2 border-slate-200/60">
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(schedule).length === 0}
              className="w-full sm:w-auto sm:min-w-[200px] px-6 py-3.5 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:via-teal-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-emerald-500/30 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Save className={`w-5 h-5 ${saving ? "animate-spin" : ""}`} />
              <span>{saving ? "Saving..." : "Save Schedule"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSchedule;

