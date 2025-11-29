import React, { useState, useEffect } from "react";
import { Calendar, Clock, Save, CheckCircle } from "lucide-react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import TimeInput from "./TimeInput";

declare const __app_id: string;

interface GameSchedule {
  schedule: { [day: number]: string }; // Map of day (0-6) to time string (HH:MM)
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
          const data = scheduleSnap.data() as GameSchedule;
          setSchedule(data.schedule || { 6: "18:00" });
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

      await setDoc(
        scheduleRef,
        {
          schedule: schedule,
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
      <div className={`relative overflow-hidden backdrop-blur-xl p-6 sm:p-8 rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.18)] -mt-[1px] ${
        isActive 
          ? "bg-gradient-to-br from-emerald-50/95 via-teal-50/95 to-emerald-50/95 border-l-2 border-r-2 border-b-2 border-emerald-500/70" 
          : "bg-white/90 border border-white/70 border-t-0"
      }`}>
        <div className="text-center p-8">
          <p className="text-slate-600 font-medium">Loading game schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden backdrop-blur-xl p-6 sm:p-8 rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.18)] -mt-[1px] ${
      isActive 
        ? "bg-gradient-to-br from-emerald-50/95 via-teal-50/95 to-emerald-50/95 border-l-2 border-r-2 border-b-2 border-emerald-500/70" 
        : "bg-white/90 border border-white/70 border-t-0"
    }`}>
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-10 right-0 w-56 h-56 bg-emerald-200/60 blur-[110px]" />
        <div className="absolute bottom-0 left-4 w-64 h-64 bg-teal-200/50 blur-[120px]" />
      </div>
      <div className="relative z-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent border-b-2 border-emerald-200 pb-3 mb-6 flex items-center">
          <Calendar className="mr-3 text-emerald-600" size={28} /> Game Schedule
        </h2>

        <div className="mb-6 p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl shadow-md">
          <p className="text-sm text-emerald-800 font-medium mb-2">
            Configure when soccer games are played:
          </p>
          <ul className="text-sm text-emerald-700 list-disc list-inside space-y-1">
            <li>Select the days of the week when games are scheduled</li>
            <li>Set a different time for each day if needed</li>
            <li>The availability poll will automatically show the next game date and time</li>
          </ul>
        </div>

        <div className="space-y-6">
          {/* Days of Week Selection with Individual Times */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              <Calendar className="inline mr-2 text-emerald-600" size={18} />
              Game Days & Times
            </label>
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = schedule[day.value] !== undefined;
                return (
                  <div
                    key={day.value}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 shadow-md"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleDayToggle(day.value)}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 flex-shrink-0 ${
                          isSelected
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                      >
                        {day.label}
                      </button>
                      {isSelected && (
                        <div className="flex-1">
                          <TimeInput
                            value={schedule[day.value]}
                            onChange={(time) => handleTimeChange(day.value, time)}
                            className="w-full sm:w-auto"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {Object.keys(schedule).length === 0 && (
              <p className="text-xs text-red-600 mt-2 font-medium">Please select at least one day.</p>
            )}
          </div>

          {error && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-2xl text-sm font-semibold shadow-md">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 text-emerald-700 rounded-2xl text-sm font-semibold flex items-center shadow-md">
              <CheckCircle className="mr-2" size={18} />
              {success}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || Object.keys(schedule).length === 0}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:bg-gray-400 disabled:shadow-none disabled:transform-none flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? "Saving..." : "Save Schedule"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSchedule;

