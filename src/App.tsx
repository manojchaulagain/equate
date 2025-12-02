import React, { useState, useMemo, useEffect, useRef, useCallback, startTransition } from "react";
import { ListChecks, Trophy, LogOut, Shield, Info, MessageCircle, AlertTriangle, X, Award, Menu } from "lucide-react";

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  setLogLevel,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";

import {
  Player,
  PlayerAvailability,
  Position,
  SkillLevel,
  Team,
  TeamResultsState,
  TeamColorKey,
} from "./types/player";
import { UserRole } from "./types/user";
import { POSITIONS } from "./constants/player";
import { TEAM_COLOR_SEQUENCE, getTeamColorLabel } from "./constants/teamColors";
import AuthUI from "./components/auth/AuthUI";
import WeeklyAvailabilityPoll from "./components/poll/WeeklyAvailabilityPoll";
import TeamResults from "./components/teams/TeamResults";
import AdminDashboard from "./components/admin/AdminDashboard";
import SelfRegistrationModal from "./components/players/SelfRegistrationModal";
import QuestionsConcerns from "./components/questions/QuestionsConcerns";
import UserNotifications from "./components/notifications/UserNotifications";
import StatisticsDashboard from "./components/statistics/StatisticsDashboard";
import GameInfoPanel from "./components/games/GameInfoPanel";
import { awardGameAttendancePoints, getDateString, processMOTMAwards } from "./utils/gamePoints";
import { GameSchedule as GameScheduleType } from "./utils/gameSchedule";
import { sendGameReminders } from "./utils/gameReminders";
import { FirestorePaths } from "./utils/firestorePaths";

// --- GLOBAL CANVAS VARIABLES (Mandatory) ---
declare const __app_id: string;

// Firebase configuration from environment variables
const __firebase_config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Type and constant definitions moved to dedicated modules for reuse.

// Profile Menu Component
interface ProfileMenuProps {
  userEmail: string;
  userRole: UserRole;
  playerName?: string; // Player's full name if available
  onSignOut: () => void;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ userEmail, userRole, playerName, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Get user's initials from name (first and last) or email fallback
  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      const nameParts = name.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        // First and last name initials
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
      } else if (nameParts.length === 1) {
        // Single name - use first two characters
        const nameStr = nameParts[0];
        return nameStr.length >= 2 
          ? (nameStr.charAt(0) + nameStr.charAt(1)).toUpperCase()
          : nameStr.charAt(0).toUpperCase();
      }
    }
    // Fallback to email first character
    return email ? email.charAt(0).toUpperCase() : "?";
  };

  // Generate gradient color based on email
  const getGradientColor = (email: string): string => {
    const hash = email.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const colors = [
      'from-indigo-500 to-purple-600',
      'from-blue-500 to-cyan-600',
      'from-purple-500 to-pink-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-pink-500 to-rose-600',
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const gradientClass = getGradientColor(userEmail);

  // Calculate menu position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popupWidth = Math.min(360, window.innerWidth - 16); // Max width with 8px margin on each side
      const rightEdge = window.innerWidth - rect.right;
      const leftEdge = rect.left;
      
      // Ensure popup stays within viewport
      // If there's not enough space on the right, position from left instead
      let right = rightEdge;
      if (rightEdge < 8) {
        right = window.innerWidth - leftEdge - popupWidth;
      }
      right = Math.max(8, Math.min(right, window.innerWidth - popupWidth - 8));

      // Check if popup would go below viewport
      const estimatedHeight = 200; // Approximate height
      const spaceBelow = window.innerHeight - rect.bottom;
      let top = rect.bottom + 8;
      if (spaceBelow < estimatedHeight && rect.top > estimatedHeight) {
        // Position above button if not enough space below
        top = rect.top - estimatedHeight - 8;
      }
      
      setMenuPosition({
        top: Math.max(8, top),
        right: right,
      });
    } else {
      setMenuPosition(null);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 border-2 border-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2`}
        aria-label="User menu"
      >
        {getInitials(playerName, userEmail)}
        {userRole === "admin" && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full border-2 border-white flex items-center justify-center">
            <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
          </div>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-[110]"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown Menu - Fixed positioning to escape header bounds */}
          {menuPosition && (
            <div 
              className="fixed w-[280px] sm:w-[320px] md:w-[360px] max-w-[calc(100vw-1rem)] bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/60 z-[120] overflow-visible animate-in fade-in slide-in-from-top-2 duration-200"
              style={{
                top: `${menuPosition.top}px`,
                right: `${menuPosition.right}px`,
                left: 'auto',
                maxHeight: 'calc(100vh - 16px)',
                overflowY: 'auto',
              }}
            >
            {/* Header Section */}
            <div className={`bg-gradient-to-br ${gradientClass} p-4 sm:p-5 md:p-6 text-white relative overflow-hidden rounded-t-3xl`}>
              <div className="absolute inset-0 bg-black/10 rounded-t-3xl"></div>
              <div className="relative flex items-center gap-3 sm:gap-4">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xl sm:text-2xl border-[3px] border-white/40 shadow-xl ring-2 ring-white/20 flex-shrink-0`}>
                  {getInitials(playerName, userEmail)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm sm:text-base md:text-lg truncate drop-shadow-md mb-1">{userEmail}</p>
                  {playerName && (
                    <p className="text-xs sm:text-sm text-white/90 truncate font-medium mb-1.5">{playerName}</p>
                  )}
                  {userRole === "admin" && (
                    <div className="flex items-center gap-1.5 mt-2 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 w-fit">
                      <Shield className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                      <span className="text-[10px] sm:text-xs font-bold">Administrator</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Actions Section */}
            <div className="p-3 sm:p-4 bg-gradient-to-b from-slate-50/50 to-white border-t border-slate-200/50 rounded-b-3xl">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center justify-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-red-500 via-red-600 to-rose-600 hover:from-red-600 hover:via-red-700 hover:to-rose-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] border border-red-400/30 min-h-[44px]"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
};

// Info Tooltip Component - Shows app description
const InfoTooltip: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; right: number } | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && iconRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (iconRef.current) {
          const rect = iconRef.current.getBoundingClientRect();
          const popupWidth = Math.min(420, window.innerWidth - 32); // Max width with 16px margin on each side
          const rightEdge = window.innerWidth - rect.right;
          const leftEdge = rect.left;
          
          // Ensure popup stays within viewport
          // If there's not enough space on the right, position from left instead
          let right = rightEdge;
          if (rightEdge < 16) {
            right = window.innerWidth - leftEdge - popupWidth;
        }
          right = Math.max(16, Math.min(right, window.innerWidth - popupWidth - 16));
          
          // Check if popup would go below viewport
          const estimatedHeight = 150; // Approximate height
          const spaceBelow = window.innerHeight - rect.bottom;
          let top = rect.bottom + 12;
          if (spaceBelow < estimatedHeight && rect.top > estimatedHeight) {
            // Position above button if not enough space below
            top = rect.top - estimatedHeight - 12;
          }
          
          setTooltipPosition({
            top: Math.max(16, top),
            right: right,
          });
        }
      }, 10);
    } else {
      setTooltipPosition(null);
    }
  }, [isOpen]);

    return (
    <div className="relative flex-shrink-0" ref={iconRef}>
        <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/20 transition-all duration-300 hover:scale-110 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="App information"
        >
        <Info className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

      {isOpen && (
        <>
          {/* Backdrop to close tooltip */}
          <div
            className="fixed inset-0 z-[110]"
            onClick={() => setIsOpen(false)}
          />
          {/* Tooltip */}
          {tooltipPosition && (
            <div
              className="fixed w-[min(calc(100vw-2rem),400px)] sm:w-[420px] bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl text-white text-xs sm:text-sm rounded-3xl shadow-2xl pointer-events-auto z-[120] border border-slate-700/60 p-4 sm:p-5 transition-all duration-200"
              style={{
                top: `${tooltipPosition.top}px`,
                right: `${tooltipPosition.right}px`,
                left: 'auto',
                maxHeight: 'calc(100vh - 32px)',
                overflowY: 'auto',
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0" />
                  <h3 className="font-bold text-sm sm:text-base text-amber-300">About Sagarmatha FC</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="leading-relaxed text-slate-200 whitespace-normal break-words">
                Manage Sagarmatha FC players, track availability, and generate fair teams. The Player Roster is shared. Sign-in required for access.
              </p>
              <div className="absolute right-6 -top-2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-transparent border-b-slate-900"></div>
            </div>
          )}
        </>
      )}
      </div>
    );
};

// Notifications Banner Component - Shows critical notifications at top
const NotificationsBanner: React.FC<{ db: any }> = React.memo(({ db }) => {
  const [criticalNotifications, setCriticalNotifications] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const dismissedIdsRef = useRef<string[]>([]);
  
  // Keep ref in sync with state
  useEffect(() => {
    dismissedIdsRef.current = dismissedIds;
  }, [dismissedIds]);

  useEffect(() => {
    if (!db) return;

    const notificationsPath = FirestorePaths.notifications();
    const notificationsRef = collection(db, notificationsPath);
    const q = query(notificationsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifications = snapshot.docs
          .map((docSnapshot) => ({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          }))
          .filter((n: any) => n.isCritical && !dismissedIdsRef.current.includes(n.id));
        setCriticalNotifications(notifications.slice(0, 3)); // Show max 3
      },
      (err) => {
        console.error("Error fetching notifications:", err);
      }
    );

    return () => unsubscribe();
  }, [db]); // Removed dismissedIds from deps - using ref instead

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => {
      if (prev.includes(id)) return prev; // Prevent duplicates
      return [...prev, id];
    });
  }, []);

  // Always render container to prevent layout shift
  // Reserve consistent space - use minHeight based on max notifications (3) to prevent CLS
  return (
    <div 
      className="max-w-5xl mx-auto px-2 sm:px-3 md:px-4 space-y-2"
      style={{ 
        minHeight: criticalNotifications.length === 0 ? '0px' : 'auto',
        contain: 'layout style paint'
      }}
    >
      {criticalNotifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-gradient-to-r from-red-500 via-orange-500 to-red-600 text-white p-3 sm:p-4 rounded-2xl shadow-lg border-2 border-red-400 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top duration-300"
        >
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm sm:text-base mb-1">{notification.title}</h3>
              <p className="text-xs sm:text-sm text-white/95 whitespace-pre-wrap">{notification.message}</p>
        </div>
          </div>
      <button
            onClick={() => handleDismiss(notification.id)}
            className="text-white/80 hover:text-white transition-colors flex-shrink-0"
            aria-label="Dismiss notification"
          >
            <X size={20} />
      </button>
        </div>
      ))}
    </div>
  );
});

NotificationsBanner.displayName = "NotificationsBanner";

export default function App() {
  // Firebase State
  const [auth, setAuth] = useState<any>(null);
  const [db, setDb] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("user");

  // Application State
  const [availability, setAvailability] = useState<PlayerAvailability[]>([]);
  const [teams, setTeams] = useState<TeamResultsState | null>(null);
  const [teamsLoading, setTeamsLoading] = useState<boolean>(true);
  const [teamCount, setTeamCount] = useState<number>(2);
  const [view, setView] = useState<"poll" | "teams" | "questions" | "admin" | "leaderboard">("poll");
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMOTMModal, setOpenMOTMModal] = useState(false);
  const [openKudosModal, setOpenKudosModal] = useState(false);
  const [openPointsModal, setOpenPointsModal] = useState(false);

  const handleModalOpened = (modal: "motm" | "kudos" | "points") => {
    if (modal === "motm") setOpenMOTMModal(false);
    if (modal === "kudos") setOpenKudosModal(false);
    if (modal === "points") setOpenPointsModal(false);
  };
  
  // Helper to determine slide direction based on tab order
  const getTabOrder = useCallback((tab: "poll" | "teams" | "questions" | "admin" | "leaderboard"): number => {
    return tab === "poll" ? 0 : tab === "leaderboard" ? 1 : tab === "teams" ? 2 : tab === "questions" ? 3 : 4;
  }, []);
  
  const handleViewChange = useCallback((newView: "poll" | "teams" | "questions" | "admin" | "leaderboard") => {
    if (view !== newView) {
      const currentOrder = getTabOrder(view);
      const newOrder = getTabOrder(newView);
      startTransition(() => {
        setSlideDirection(newOrder > currentOrder ? "left" : "right");
        setTimeout(() => {
          startTransition(() => {
            setView(newView);
            setTimeout(() => setSlideDirection(null), 500);
          });
        }, 50);
      });
    }
  }, [view, getTabOrder]);
  const [loading, setLoading] = useState(true);
  const [isUserRegistered, setIsUserRegistered] = useState<boolean | null>(null);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [gameSchedule, setGameSchedule] = useState<GameScheduleType | null>(null);

  // Persist preferred team count for admins
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("preferredTeamCount");
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed)) {
        const clamped = Math.min(Math.max(parsed, 2), 6);
        setTeamCount(clamped);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("preferredTeamCount", teamCount.toString());
  }, [teamCount]);

  // --- 1. FIREBASE INITIALIZATION AND AUTHENTICATION ---
  useEffect(() => {
    setLogLevel("debug"); // Enable Firestore logging

    try {
      const firebaseConfig = __firebase_config;
      const app = initializeApp(firebaseConfig);
      getAnalytics(app);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);

      setDb(firestore);
      setAuth(authInstance);

      const unsubscribeAuth = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          setUserId(user.uid);
          setUserEmail(user.email);
          
          // Automatically create/update user document in Firestore
          if (firestore && user.email) {
            try {
              const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
              const userDocPath = `artifacts/${appId}/public/data/users/${user.uid}`;
              const userDocRef = doc(firestore, userDocPath);
              const userDocSnap = await getDoc(userDocRef);
              
              // Only create if it doesn't exist (preserve existing role if admin)
              if (!userDocSnap.exists()) {
                await setDoc(userDocRef, {
                  email: user.email,
                  role: "user", // Default to regular user
                  lastLogin: Timestamp.now(),
                }, { merge: true });
              } else {
                // Update email if it has changed and always update lastLogin
                const existingData = userDocSnap.data();
                await setDoc(userDocRef, {
                  email: user.email,
                  role: existingData.role || "user",
                  lastLogin: Timestamp.now(),
                }, { merge: true });
              }
            } catch (error) {
              console.error("Error creating/updating user document:", error);
              // Don't block sign-in if this fails
            }
          }
          
          // Check localStorage for registration status on auth state change
          const stored = localStorage.getItem(`userRegistered_${user.uid}`);
          if (stored === "true") {
            setIsUserRegistered(true);
            setCheckingRegistration(false);
          } else {
            setIsUserRegistered(null);
            setCheckingRegistration(false);
          }
        } else {
          setUserId(null);
          setUserEmail(null);
          setIsUserRegistered(null);
          setCheckingRegistration(false);
        }
        setIsAuthReady(true);
        // Note: The email/password authentication UI is in AuthUI component, which is mounted when userId is null.
      });

      return () => unsubscribeAuth();
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setLoading(false);
    }
  }, []);

  // Handler for successful sign-in from AuthUI
  const handleSuccessfulSignIn = async (user: User) => {
    setUserId(user.uid);
    setUserEmail(user.email);
    setError(null);
    
    // Automatically create/update user document in Firestore
    if (db && user.email) {
      try {
        const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        const userDocPath = `artifacts/${appId}/public/data/users/${user.uid}`;
        const userDocRef = doc(db, userDocPath);
        const userDocSnap = await getDoc(userDocRef);
        
        // Only create if it doesn't exist (preserve existing role if admin)
        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            email: user.email,
            role: "user", // Default to regular user
            lastLogin: Timestamp.now(),
          }, { merge: true });
        } else {
          // Update email if it has changed and always update lastLogin
          const existingData = userDocSnap.data();
          await setDoc(userDocRef, {
            email: user.email,
            role: existingData.role || "user",
            lastLogin: Timestamp.now(),
          }, { merge: true });
        }
      } catch (error) {
        console.error("Error creating/updating user document:", error);
        // Don't block sign-in if this fails
      }
    }
    
    // Check localStorage first, then trigger check if not found
    const stored = localStorage.getItem(`userRegistered_${user.uid}`);
    if (stored === "true") {
      setIsUserRegistered(true);
      setCheckingRegistration(false);
    } else {
      setIsUserRegistered(null);
      setCheckingRegistration(false);
    }
    // Note: The registration check useEffect will run automatically when userId changes
  };

  const handleTeamCountChange = useCallback((count: number) => {
    startTransition(() => {
      setTeamCount(count);
      setError(null);
    });
  }, []);

  // --- 3. FETCH USER ROLE FROM FIRESTORE ---
  useEffect(() => {
    if (!db || !userId) {
      setUserRole("user"); // Default to regular user
      return;
    }

    const fetchUserRole = async () => {
      try {
        const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        const userDocPath = `artifacts/${appId}/public/data/users/${userId}`;
        const userDocRef = doc(db, userDocPath);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const role = userData.role === "admin" ? "admin" : "user";
          setUserRole(role);
        } else {
          // User document doesn't exist, default to regular user
          setUserRole("user");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole("user"); // Default to regular user on error
      }
    };

    fetchUserRole();
  }, [db, userId]);

  // Fetch game schedule and award points for today's game if it has passed
  useEffect(() => {
    if (!db) return;

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const schedulePath = `artifacts/${appId}/public/data/gameSchedule/config`;
    const scheduleRef = doc(db, schedulePath);

    const unsubscribe = onSnapshot(
      scheduleRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as GameScheduleType;
          setGameSchedule(data);

          // Check if today was a game day and award points
          if (data.schedule && availability.length > 0) {
            const now = new Date();
            const today = now.getDay();
            const scheduleMap = data.schedule;

            if (scheduleMap[today]) {
              const [hours, minutes] = scheduleMap[today].split(':').map(Number);
              const todayGameTime = new Date(now);
              todayGameTime.setHours(hours, minutes, 0, 0);

              // If game time has passed today, award points to available players
              if (now > todayGameTime) {
                const todayDateStr = getDateString(now);

                // Award 2 points to all players who are available
                for (const player of availability) {
                  if (player.isAvailable && player.userId) {
                    try {
                      await awardGameAttendancePoints(
                        db,
                        player.id,
                        player.name,
                        todayDateStr
                      );
                    } catch (err) {
                      console.error(`Error awarding points to ${player.name}:`, err);
                    }
                  }
                }
              }
            }
          }
        } else {
          setGameSchedule(null);
        }
      },
      (err) => {
        console.error("Error fetching game schedule:", err);
      }
    );

    return () => unsubscribe();
  }, [db, availability]);

  // Process MOTM awards after midnight on game days
  useEffect(() => {
    if (!db || !gameSchedule) return;

    const checkAndProcessMOTM = async () => {
      try {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDay = yesterday.getDay();

        // Check if yesterday was a game day
        if (gameSchedule.schedule && gameSchedule.schedule[yesterdayDay]) {
          // Use toDateString() format to match what's stored in nominations
          const yesterdayDateStr = yesterday.toDateString();
          
          // Process MOTM awards for yesterday's game (after midnight)
          // This will only process if it hasn't been processed already
          await processMOTMAwards(db, yesterdayDateStr);
        }
      } catch (err) {
        console.error("Error processing MOTM awards:", err);
      }
    };

    // Check immediately
    checkAndProcessMOTM();

    // Check every hour to catch midnight transitions
    const interval = setInterval(checkAndProcessMOTM, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [db, gameSchedule]);

  // 3-Day Game Reminder System - Check daily and send reminders
  useEffect(() => {
    if (!db || !gameSchedule || !userId || userRole !== "admin") return;

    const checkAndSendReminders = async () => {
      try {
        // Get all players for sending reminders
        const playersCollectionPath = FirestorePaths.players();
        const playersColRef = collection(db, playersCollectionPath);
        const playersSnapshot = await getDocs(playersColRef);
        const allPlayers = playersSnapshot.docs.map((doc) => ({
          id: doc.id,
          userId: doc.data().userId || undefined,
        }));

        await sendGameReminders(db, gameSchedule, allPlayers);
      } catch (err) {
        console.error("Error sending game reminders:", err);
      }
    };

    // Check immediately on mount
    checkAndSendReminders();

    // Check every 6 hours to ensure reminders are sent on time
    const interval = setInterval(checkAndSendReminders, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [db, gameSchedule, userId, userRole]);

  // Function to refresh user role (called after role update)
  const refreshUserRole = () => {
    if (!db || !userId) return;

    const fetchUserRole = async () => {
      try {
        const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        const userDocPath = `artifacts/${appId}/public/data/users/${userId}`;
        const userDocRef = doc(db, userDocPath);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const role = userData.role === "admin" ? "admin" : "user";
          setUserRole(role);
        } else {
          setUserRole("user");
        }
      } catch (error) {
        console.error("Error refreshing user role:", error);
      }
    };

    fetchUserRole();
  };

  // Sign Out function
  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      // Clear localStorage registration status
      if (userId) {
        localStorage.removeItem(`userRegistered_${userId}`);
      }
      setUserId(null);
      setUserEmail(null);
      setUserRole("user"); // Reset role on sign out
      setTeams(null); // Clear teams on sign out
      setIsUserRegistered(null); // Reset registration status on sign out
      setView("poll");
    }
  };

  // --- 2. FIREBASE DATA LISTENER (Real-time player loading) ---
  useEffect(() => {
    // Run only when Firestore is initialized
    if (!db) return;

    setLoading(true);

    // Collection path: /artifacts/{appId}/public/data/soccer_players
    const playersCollectionPath = FirestorePaths.players();
    const playersColRef = collection(db, playersCollectionPath);

    const unsubscribeSnapshot = onSnapshot(
      playersColRef,
      (snapshot) => {
        const loadedPlayers: PlayerAvailability[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          const normalizedSkill = Math.max(
              1,
              Math.min(10, data.skillLevel || 5)
          ) as SkillLevel;
          const normalizedPosition = POSITIONS.includes(data.position as Position)
              ? (data.position as Position)
            : "CM";
          const isAvailable =
            typeof data.isAvailable === "boolean" ? data.isAvailable : true;

              return {
            id: doc.id,
            name: data.name || "",
            skillLevel: normalizedSkill,
            position: normalizedPosition,
            isAvailable,
            userId: data.userId || undefined, // Include userId if present
            registeredBy: data.registeredBy || undefined, // Include registeredBy if present
          } as PlayerAvailability;
        });

        setAvailability(loadedPlayers);

        setLoading(false);
      },
      (error) => {
        console.error("Firestore Listener Error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribeSnapshot();
  }, [db]);

  // --- 3. FIRESTORE TEAMS LISTENER (Real-time team loading) ---
  useEffect(() => {
    if (!db) return;

    let isInitialLoad = true;
    setTeamsLoading(true);
    const teamsDocPath = FirestorePaths.teams();
    const teamsDocRef = doc(db, teamsDocPath);

    const unsubscribeTeams = onSnapshot(
      teamsDocRef,
      (snapshot) => {
        // Only show loading on initial load, not on subsequent updates
        if (isInitialLoad) {
          isInitialLoad = false;
        }

        if (!snapshot.exists()) {
          setTeams((prev) => {
            // Only update if state actually changed to prevent unnecessary re-renders
            if (prev === null) return null;
            return null;
          });
          setTeamsLoading(false);
          return;
        }

        const data = snapshot.data() as Partial<TeamResultsState> & {
          teamA?: Team;
          teamB?: Team;
        };

        let newTeams: Team[] | null = null;
        let newGeneratedAt: string | undefined = undefined;

        if (Array.isArray(data.teams)) {
          // Normalize teams only once - use stable references
          newTeams = data.teams.map((team, index) => {
            const fallbackColor =
              data.teams && data.teams.length === 2
                ? (index === 0 ? "blue" : "red")
                : TEAM_COLOR_SEQUENCE[index % TEAM_COLOR_SEQUENCE.length];

              return {
              ...team,
              players: team.players || [],
              colorKey: team.colorKey || fallbackColor,
            };
          });
          newGeneratedAt = data.generatedAt;
        } else if (data.teamA && data.teamB) {
          newTeams = [
            { ...data.teamA, colorKey: data.teamA.colorKey || "blue" },
            { ...data.teamB, colorKey: data.teamB.colorKey || "red" },
          ];
          newGeneratedAt = data.generatedAt;
        }

        // Only update state if teams data actually changed - use functional update for comparison
        setTeams((prev) => {
          if (newTeams === null) {
            return prev === null ? prev : null;
          }

          // Deep comparison to prevent unnecessary updates
          if (prev && prev.teams.length === newTeams.length && prev.generatedAt === newGeneratedAt) {
            // Check if teams are identical by comparing key properties
            const teamsUnchanged = prev.teams.every((prevTeam, i) => {
              const newTeam = newTeams![i];
              if (
                prevTeam.name !== newTeam.name ||
                prevTeam.totalSkill !== newTeam.totalSkill ||
                prevTeam.colorKey !== newTeam.colorKey ||
                (prevTeam.players?.length || 0) !== (newTeam.players?.length || 0)
              ) {
                return false;
              }
              
              // Compare player IDs if lengths match
              if (prevTeam.players && newTeam.players) {
                const prevIds = prevTeam.players.map(p => p?.id).filter(Boolean).sort().join(',');
                const newIds = newTeam.players.map(p => p?.id).filter(Boolean).sort().join(',');
                if (prevIds !== newIds) {
                  return false;
                }
              }
              
              return true;
            });

            if (teamsUnchanged) {
              return prev; // No change, return previous state to prevent re-render
            }
          }

          return {
            teams: newTeams,
            generatedAt: newGeneratedAt,
          };
        });

        setTeamsLoading(false);
      },
      (error) => {
        console.error("Firestore Teams Listener Error:", error);
        setTeamsLoading(false);
      }
    );

    return () => unsubscribeTeams();
  }, [db]);

  // --- LOGIC FUNCTIONS (Unchanged) ---

  // Function to check if a player name already exists (case-insensitive)
  const checkPlayerNameExists = async (playerName: string): Promise<boolean> => {
    if (!db) {
      return false;
    }

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const playersCollectionPath = `artifacts/${appId}/public/data/soccer_players`;
      const playersColRef = collection(db, playersCollectionPath);

      // Get all players and check for case-insensitive name match
      const querySnapshot = await getDocs(playersColRef);
      const normalizedInputName = playerName.trim().toLowerCase();

      return querySnapshot.docs.some((doc) => {
        const playerData = doc.data();
        const existingName = playerData.name?.toLowerCase() || "";
        return existingName === normalizedInputName;
      });
    } catch (error) {
      console.error("Error checking player name:", error);
      return false; // If check fails, allow registration (fail open)
    }
  };

  // Function to add a new player (writes to Firestore)
  const addPlayer = async (playerData: Omit<Player, "id">, isSelfRegistration = false) => {
    if (!db) {
      setError("Database connection not ready. Please wait.");
      throw new Error("Database connection not ready. Please wait.");
    }

    // Check if player name already exists
    const nameExists = await checkPlayerNameExists(playerData.name);
    if (nameExists) {
      const errorMessage = `A player with the name "${playerData.name}" is already registered. Please use a different name.`;
      // Don't set global error here, let the modal handle it
      throw new Error(errorMessage);
    }

    // Clear any previous errors when starting a new registration
    setError(null);

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const playersCollectionPath = `artifacts/${appId}/public/data/soccer_players`;
    const playersColRef = collection(db, playersCollectionPath);

    try {
      const playerDoc = {
        name: playerData.name.trim(),
        position: playerData.position,
        skillLevel: playerData.skillLevel,
        isAvailable: true,
      };

      // If self-registration, add userId to link player to user
      if (isSelfRegistration && userId) {
        (playerDoc as any).userId = userId;
      } else if (!isSelfRegistration && userId) {
        // If admin/user adds a player, track who registered them
        (playerDoc as any).registeredBy = userId;
      }

      await addDoc(playersColRef, playerDoc);

      // Clear any previous errors on success
    setError(null);

      // If self-registration, mark user as registered immediately
      // This prevents the modal from reappearing on page reload
      if (isSelfRegistration) {
        setIsUserRegistered(true);
        setCheckingRegistration(false);
        setError(null); // Clear any errors on successful registration
        // Persist registration status in localStorage
        if (userId) {
          localStorage.setItem(`userRegistered_${userId}`, "true");
        }
      }
    } catch (e) {
      console.error("Error adding document: ", e);
      const errorMessage = "Failed to save player to database.";
      setError(errorMessage);
      throw e; // Re-throw for error handling in modal
    }
  };

  // Check user registration when userId or db changes
  useEffect(() => {
    const performCheck = async () => {
      if (!db || !userId) {
        setIsUserRegistered(null);
        setCheckingRegistration(false);
      return;
    }

      setCheckingRegistration(true);

      try {
        const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        const playersCollectionPath = `artifacts/${appId}/public/data/soccer_players`;
        const playersColRef = collection(db, playersCollectionPath);

        // Query players by userId
        const q = query(playersColRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        const registered = !querySnapshot.empty;
        setIsUserRegistered(registered);
        // Persist registration status in localStorage
        if (userId) {
          localStorage.setItem(`userRegistered_${userId}`, registered.toString());
        }
      } catch (error) {
        console.error("Error checking user registration:", error);
        setIsUserRegistered(false); // Default to false on error
      } finally {
        setCheckingRegistration(false);
      }
    };

    performCheck();
  }, [userId, db]); // Only check when userId or db changes

  // Function to update a player's position and skill level (writes to Firestore)
  const updatePlayer = async (playerId: string, updates: { position?: Position; skillLevel?: SkillLevel }) => {
    if (!db) {
      setError("Database connection not ready. Please wait.");
      return;
    }

    // Clear any previous errors
    setError(null);

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const playerDocPath = `artifacts/${appId}/public/data/soccer_players/${playerId}`;
    const playerDocRef = doc(db, playerDocPath);

    try {
      const updateData: any = {};
      if (updates.position !== undefined) {
        updateData.position = updates.position;
      }
      if (updates.skillLevel !== undefined) {
        updateData.skillLevel = updates.skillLevel;
      }

      await updateDoc(playerDocRef, updateData);
      // Clear error on success
      setError(null);
    } catch (e) {
      console.error("Error updating document: ", e);
      setError("Failed to update player in database.");
    }
  };

  // Function to delete a player (admin only)
  const deletePlayer = async (playerId: string) => {
    if (!db) {
      setError("Database connection not ready. Please wait.");
      return;
    }

    if (userRole !== "admin") {
      setError("Only admins can delete players.");
      return;
    }

    // Clear any previous errors
    setError(null);

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const playerDocPath = `artifacts/${appId}/public/data/soccer_players/${playerId}`;
    const playerDocRef = doc(db, playerDocPath);

    try {
      await deleteDoc(playerDocRef);
      // Clear teams from Firestore when a player is deleted
      await clearTeamsFromFirestore();
      // Clear error on success
      setError(null);
    } catch (e) {
      console.error("Error deleting player: ", e);
      setError("Failed to delete player from database.");
    }
  };

  // Function to clear teams from Firestore
  const clearTeamsFromFirestore = useCallback(async () => {
    if (!db) return;

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const teamsDocPath = `artifacts/${appId}/public/data/teams/current`;
      const teamsDocRef = doc(db, teamsDocPath);
      await deleteDoc(teamsDocRef);
      // The real-time listener will update the state automatically
    } catch (error) {
      console.error("Error clearing teams:", error);
    }
  }, [db]);

  // Function to update availability (updates local state only - ephemeral for the week)
  const toggleAvailability = useCallback(async (playerId: string) => {
    const player = availability.find((p) => p.id === playerId);
    if (!player) return;

    // Check if user has permission to toggle this player's availability
    // Admins can toggle all players
    // Regular users can only toggle their own player or players they registered
    if (userRole !== "admin" && userId) {
      const canToggle = player.userId === userId || player.registeredBy === userId;
      if (!canToggle) {
        startTransition(() => {
          setError("You can only change availability for your own player or players you registered.");
        });
        return;
      }
    }

    const newStatus = !player.isAvailable;

    // Optimistic UI update - update state immediately for better responsiveness
    startTransition(() => {
    setAvailability((prev) =>
      prev.map((p) =>
          p.id === playerId ? { ...p, isAvailable: newStatus } : p
      )
    );
    setError(null);
    });

    // Firestore operations can happen asynchronously without blocking UI
    if (!db) return;

    // Run Firestore updates in background
    Promise.resolve().then(async () => {
      try {
        const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        const playerDocPath = `artifacts/${appId}/public/data/soccer_players/${playerId}`;
        const playerDocRef = doc(db, playerDocPath);
        await updateDoc(playerDocRef, { isAvailable: newStatus });
        // Clear teams from Firestore when availability changes (non-blocking)
        await clearTeamsFromFirestore();
      } catch (e) {
        console.error("Error updating availability: ", e);
        startTransition(() => {
          setError("Failed to update availability.");
        });
      }
    });
  }, [availability, userRole, userId, db, clearTeamsFromFirestore]);

  const availablePlayers = useMemo(
    () => availability.filter((p) => p.isAvailable),
    [availability]
  );
  const availableCount = availablePlayers.length;
  const minPlayersRequired = Math.max(teamCount, 2);
  const canGenerateTeams = availableCount >= minPlayersRequired;

  // Team Generation Algorithm - saves to Firestore for all users to see
  const generateBalancedTeams = async () => {
    // Security check: Only admins can generate teams
    if (userRole !== "admin") {
      setError("Only adminS can generate teams.");
      return;
    }

    setError(null);
    const normalizedTeamCount = Math.min(Math.max(teamCount, 2), 6);
    if (normalizedTeamCount !== teamCount) {
      setTeamCount(normalizedTeamCount);
    }

    const minimumPlayersNeeded = Math.max(normalizedTeamCount, 2);
    if (availablePlayers.length < minimumPlayersNeeded) {
      setError(`Need at least ${minimumPlayersNeeded} available players to create ${normalizedTeamCount} team(s).`);
      return;
    }

    if (!db) {
      setError("Database connection not ready. Please wait.");
      return;
    }

    // Load team assignments from Firestore (for all team counts)
    let teamAssignments: Record<string, TeamColorKey> = {};
    try {
      const assignmentsPath = FirestorePaths.teamAssignments();
      const assignmentsRef = doc(db, assignmentsPath);
      const assignmentsDoc = await getDoc(assignmentsRef);
      if (assignmentsDoc.exists()) {
        const data = assignmentsDoc.data();
        teamAssignments = (data.assignments || {}) as Record<string, TeamColorKey>;
      }
    } catch (error) {
      console.error("Error loading team assignments:", error);
      // Continue without assignments if loading fails
    }

    const sortedPlayers = [...availablePlayers].sort((a, b) => b.skillLevel - a.skillLevel);

    const resolveColor = (index: number): Team["colorKey"] => {
      if (normalizedTeamCount === 2) {
        return index === 0 ? "red" : "blue";
      }
      return TEAM_COLOR_SEQUENCE[index % TEAM_COLOR_SEQUENCE.length];
    };

    const createdTeams: Team[] = Array.from({ length: normalizedTeamCount }, (_, index) => {
      const colorKey = resolveColor(index);
      // For 2 teams, explicitly name them "Red Team" and "Blue Team"
      let teamName: string;
      if (normalizedTeamCount === 2) {
        teamName = index === 0 ? "Red Team" : "Blue Team";
      } else {
        const label = getTeamColorLabel(colorKey);
        teamName = `${label} Team`;
      }
      return {
        name: teamName,
        players: [],
        totalSkill: 0,
        colorKey,
      };
    });

    // Create a map of colorKey to team index for quick lookup
    const colorKeyToTeamIndex = new Map<TeamColorKey, number>();
    createdTeams.forEach((team, index) => {
      if (team.colorKey) {
        colorKeyToTeamIndex.set(team.colorKey, index);
      }
    });

    // Separate players into pre-assigned and unassigned
    const preAssignedPlayers: { player: PlayerAvailability; teamIndex: number }[] = [];
    const unassignedPlayers: PlayerAvailability[] = [];

    sortedPlayers.forEach((player) => {
      const assignedColorKey = teamAssignments[player.id];
      if (assignedColorKey) {
        const teamIndex = colorKeyToTeamIndex.get(assignedColorKey);
        // Only add to pre-assigned if the assigned team exists in the current team setup
        if (teamIndex !== undefined) {
          preAssignedPlayers.push({ player, teamIndex });
        } else {
          // If assignment doesn't match any team, treat as unassigned
          unassignedPlayers.push(player);
        }
      } else {
        unassignedPlayers.push(player);
      }
    });

    // First, assign pre-assigned players to their designated teams
    preAssignedPlayers.forEach(({ player, teamIndex }) => {
      createdTeams[teamIndex].players.push(player);
      createdTeams[teamIndex].totalSkill += player.skillLevel;
    });

    // Then, distribute remaining players using balanced algorithm
    unassignedPlayers.forEach((player) => {
      let targetIndex = 0;
      for (let i = 1; i < createdTeams.length; i++) {
        const contender = createdTeams[i];
        const currentBest = createdTeams[targetIndex];
        if (
          contender.totalSkill < currentBest.totalSkill ||
          (contender.totalSkill === currentBest.totalSkill &&
            contender.players.length < currentBest.players.length)
        ) {
          targetIndex = i;
        }
      }

      createdTeams[targetIndex].players.push(player);
      createdTeams[targetIndex].totalSkill += player.skillLevel;
    });

    // Convert teams to plain objects for Firestore (ensure all data is serializable)
    // Remove undefined values as Firestore doesn't support them
    const teamsData = {
      teams: createdTeams.map((team) => {
        const teamData: any = {
          name: team.name,
          totalSkill: team.totalSkill,
          players: team.players.map((player) => {
            const playerData: any = {
              id: player.id,
              name: player.name,
              position: player.position,
              skillLevel: player.skillLevel,
              isAvailable: player.isAvailable,
            };
            // Only include optional fields if they are defined
            if (player.userId !== undefined) {
              playerData.userId = player.userId;
            }
            if (player.registeredBy !== undefined) {
              playerData.registeredBy = player.registeredBy;
            }
            return playerData;
          }),
        };
        // Only include colorKey if it's defined
        if (team.colorKey !== undefined) {
          teamData.colorKey = team.colorKey;
        }
        return teamData;
      }),
      generatedAt: new Date().toISOString(),
    };

    // Save teams to Firestore so all users can see them
    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const teamsDocPath = `artifacts/${appId}/public/data/teams/current`;
      const teamsDocRef = doc(db, teamsDocPath);
      await setDoc(teamsDocRef, teamsData, { merge: false });
      // The real-time listener will update the state automatically
    setView("teams");
      setError(null); // Clear any previous errors on success
    } catch (error: any) {
      console.error("Error saving teams:", error);
      const errorMessage = error?.message || "Unknown error occurred";
      setError(`Failed to save teams to database: ${errorMessage}`);
    }
  };

  // --- MAIN RENDER ---

  const isAppReady = isAuthReady && db;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{ 
          contain: 'layout style paint',
          willChange: 'auto'
        }}
        aria-hidden="true"
      >
        <div className="absolute -top-24 -right-16 w-72 sm:w-96 h-72 sm:h-96 bg-pink-500/30 blur-[130px] opacity-70" style={{ contain: 'layout style paint' }} />
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-indigo-500/20 blur-[140px]" style={{ contain: 'layout style paint' }} />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-blue-500/10 blur-[160px]" style={{ contain: 'layout style paint' }} />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.02)_25%,transparent_25%)]" style={{ contain: 'layout style paint' }} />
      </div>

      <div 
        className="relative z-10 px-2 sm:px-4 md:px-6 lg:px-10 py-4 sm:py-6 space-y-4 sm:space-y-6"
        style={{ 
          contain: 'layout style paint'
        }}
      >
        <header className="max-w-5xl mx-auto relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] p-5 sm:p-6 md:p-8 lg:p-10 shadow-2xl border-2 border-slate-700/60 z-20 overflow-hidden">
          {/* Elegant Background with Mountains */}
          <div className="absolute inset-0">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-red-900/20"></div>
            
            {/* Mountain silhouette - more elegant */}
            <svg className="absolute bottom-0 left-0 w-full h-24 sm:h-32 opacity-40" viewBox="0 0 1200 150" preserveAspectRatio="none">
              <path d="M0,150 L150,100 L300,110 L450,70 L600,85 L750,50 L900,65 L1050,45 L1200,60 L1200,150 Z" 
                    fill="url(#mountainGradient1)" />
              <path d="M0,150 L100,120 L250,100 L400,90 L550,75 L700,60 L850,50 L1000,55 L1200,50 L1200,150 Z" 
                    fill="url(#mountainGradient2)" />
              <defs>
                <linearGradient id="mountainGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#d97706" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#1e40af" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="mountainGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Subtle decorative orbs */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -ml-40 -mb-40"></div>
            <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-red-500/8 rounded-full blur-2xl"></div>
        </div>

          {/* Top Right Corner - Profile and Info */}
          {userId && userEmail && (
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-6 md:right-6 flex items-center gap-1.5 sm:gap-2 md:gap-3 z-30" style={{ overflow: 'visible' }}>
              <UserNotifications db={db} userId={userId} />
              <InfoTooltip />
              <ProfileMenu
                userEmail={userEmail}
                userRole={userRole}
                playerName={availability.find(p => p.userId === userId)?.name}
                onSignOut={handleSignOut}
            />
          </div>
        )}

          {/* Club Content */}
          <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {/* Club Logo - Centered */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300"></div>
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full bg-white/10 backdrop-blur-sm shadow-2xl border-[3px] border-amber-300/70 flex items-center justify-center transform hover:scale-110 hover:rotate-3 transition-all duration-300 overflow-hidden ring-4 ring-amber-500/20" style={{ aspectRatio: '1 / 1' }}>
                <img 
                  src={`${process.env.PUBLIC_URL || ''}/club-logo.png`}
                  alt="Sagarmatha FC Logo" 
                  className="w-full h-full object-cover rounded-full"
                  width="144"
                  height="144"
                  loading="eager"
                  style={{ aspectRatio: '1 / 1', objectFit: 'cover' }}
                  onError={(e) => {
                    console.error("Failed to load club logo from:", e.currentTarget.src);
                  }}
                />
                {/* Shine effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none"></div>
                {/* Animated ring */}
                <div className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-pulse"></div>
          </div>
        </div>

            {/* Club Name - Centered */}
            <div className="text-center space-y-2 sm:space-y-3 md:space-y-4 px-2">
              <h1 className="flex flex-col items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight flex-wrap justify-center">
                  <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent drop-shadow-lg">
                    Sagarmatha
        </span>
                  <span className="mx-1.5 sm:mx-2 md:mx-3 text-slate-300">FC</span>
            </span>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3 mt-1 flex-wrap px-2">
                  <div className="h-px w-6 sm:w-8 md:w-12 bg-gradient-to-r from-transparent via-amber-500/60 to-amber-500/60"></div>
                  <span className="uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[10px] sm:text-xs md:text-sm text-slate-400 font-semibold px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-700/50 whitespace-nowrap">
                    Excellence Through Unity
            </span>
                  <div className="h-px w-6 sm:w-8 md:w-12 bg-gradient-to-l from-transparent via-amber-500/60 to-amber-500/60"></div>
            </div>
        </h1>
        </div>
          </div>
      </header>

      {!isAppReady && (
        <div className="max-w-4xl mx-auto mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-6 p-12 bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-white/60 shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
                <div>
              <p className="font-bold text-xl sm:text-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Initializing application...
              </p>
              <p className="text-sm text-slate-600 font-medium">Please wait while we set everything up</p>
                </div>
                  </div>
          </div>
        )}

      {/* Conditional Rendering based on Auth Status */}
      {isAppReady && !userId && auth && (
        <AuthUI
          auth={auth}
          onSignIn={handleSuccessfulSignIn}
          error={error}
          setError={setError}
        />
      )}

      {/* Main Application Tabs (Visible only when logged in) */}
      {isAppReady && userId && (
        <>
            {/* Notifications Banner - Show critical notifications at top */}
            {db && <NotificationsBanner db={db} />}
            
            {/* Game Info Panel - Above tabs */}
            {userId && (
              <GameInfoPanel
                db={db}
                teams={teams?.teams || []}
                userRole={userRole}
                userId={userId}
                userEmail={userEmail || ""}
                players={availability}
                onNavigateToLeaderboard={() => handleViewChange("leaderboard")}
              />
            )}

            {/* Mobile Hamburger Menu Button - Visible only on mobile (below 640px) */}
            <div className="max-w-5xl mx-auto mb-2 px-2 mt-2 sm:mt-0 sm:mb-0 relative" style={{ display: 'block', zIndex: 45 }}>
          <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileMenuOpen(!mobileMenuOpen);
                }}
                type="button"
                style={{ position: 'relative', zIndex: 45 }}
                className={`w-full flex items-center justify-between p-3 backdrop-blur-xl rounded-2xl shadow-lg border transition-all duration-200 sm:hidden ${
                  view === "poll"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500/50"
                    : view === "leaderboard"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500/50"
                    : view === "teams"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500/50"
                    : view === "questions"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-blue-500/50"
                    : view === "admin"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-500/50"
                    : "bg-white/80 text-slate-700 border-white/60"
                }`}
              >
                <span className="font-semibold flex items-center gap-2">
                  {view === "poll" && <ListChecks className="w-4 h-4" />}
                  {view === "leaderboard" && <Award className="w-4 h-4" />}
                  {view === "teams" && <Trophy className="w-4 h-4" />}
                  {view === "questions" && <MessageCircle className="w-4 h-4" />}
                  {view === "admin" && <Shield className="w-4 h-4" />}
                  {view === "poll" && (
                    <>
                      Availability <span className="ml-1">({availableCount})</span>
                    </>
                  )}
                  {view === "leaderboard" && "Statistics"}
                  {view === "teams" && "Teams"}
                  {view === "questions" && "Questions"}
                  {view === "admin" && "Admin"}
                </span>
                <Menu className="w-5 h-5" />
          </button>
        </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 sm:hidden transition-opacity duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <div className="fixed top-0 left-0 right-0 bg-gradient-to-br from-slate-50/95 via-white/95 to-slate-50/95 backdrop-blur-xl rounded-b-3xl shadow-[0_20px_60px_rgba(15,23,42,0.3)] border-b-2 border-slate-200/60 z-50 sm:hidden max-h-[85vh] overflow-y-auto animate-in slide-in-from-top duration-300">
                  {/* Decorative background elements */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-3xl">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-200/30 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-purple-200/30 rounded-full blur-3xl"></div>
          </div>
                  
                  <div className="relative p-5 sm:p-6 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-slate-200/60">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-500 flex items-center justify-center shadow-lg ring-2 ring-indigo-200/50">
                          <Menu className="w-6 h-6 text-white" />
        </div>
                        <div>
                          <h2 className="font-bold text-xl bg-gradient-to-r from-slate-800 via-indigo-700 to-slate-800 bg-clip-text text-transparent">Navigation</h2>
                          <p className="text-xs text-slate-500 font-medium">Choose a section</p>
        </div>
                      </div>
          <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-slate-200/60 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 group"
                        aria-label="Close menu"
          >
                        <X className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
          </button>
        </div>
                    
                    {/* Menu Items */}
                    <div className="space-y-2.5">
                      <button
                        onClick={() => {
                          handleViewChange("poll");
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 transform ${
                          view === "poll"
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl scale-[1.02] border-2 border-indigo-500/50"
                            : "bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-indigo-50/80 hover:scale-[1.01] border border-slate-200/60 shadow-md hover:shadow-lg"
      }`}
    >
                        <div className={`p-2 rounded-xl ${view === "poll" ? "bg-white/20" : "bg-indigo-100"}`}>
                          <ListChecks className={`w-5 h-5 ${view === "poll" ? "text-white" : "text-indigo-600"}`} />
                        </div>
                        <span className="font-semibold flex-1 text-left">
                          Availability <span className="ml-1">({availableCount})</span>
        </span>
                      </button>

                      <button
                        onClick={() => {
                          handleViewChange("leaderboard");
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 transform ${
                          view === "leaderboard"
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl scale-[1.02] border-2 border-amber-500/50"
                            : "bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-amber-50/80 hover:scale-[1.01] border border-slate-200/60 shadow-md hover:shadow-lg"
                        }`}
                      >
                        <div className={`p-2 rounded-xl ${view === "leaderboard" ? "bg-white/20" : "bg-amber-100"}`}>
                          <Award className={`w-5 h-5 ${view === "leaderboard" ? "text-white" : "text-amber-600"}`} />
                        </div>
                        <span className="font-semibold flex-1 text-left">Statistics</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          handleViewChange("teams");
                          setMobileMenuOpen(false);
                        }}
                        disabled={!teams || !teams.teams || teams.teams.length === 0}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                          view === "teams"
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl scale-[1.02] border-2 border-amber-500/50"
                            : "bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-amber-50/80 hover:scale-[1.01] border border-slate-200/60 shadow-md hover:shadow-lg"
              }`}
            >
                        <div className={`p-2 rounded-xl ${view === "teams" ? "bg-white/20" : "bg-amber-100"}`}>
                          <Trophy className={`w-5 h-5 ${view === "teams" ? "text-white" : "text-amber-600"}`} />
          </div>
                        <span className="font-semibold flex-1 text-left">Teams</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          handleViewChange("questions");
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 transform ${
                          view === "questions"
                            ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-xl scale-[1.02] border-2 border-blue-500/50"
                            : "bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-blue-50/80 hover:scale-[1.01] border border-slate-200/60 shadow-md hover:shadow-lg"
                        }`}
                      >
                        <div className={`p-2 rounded-xl ${view === "questions" ? "bg-white/20" : "bg-blue-100"}`}>
                          <MessageCircle className={`w-5 h-5 ${view === "questions" ? "text-white" : "text-blue-600"}`} />
    </div>
                        <span className="font-semibold flex-1 text-left">Questions</span>
                      </button>
                      
                      {userRole === "admin" && (
            <button
                          onClick={() => {
                            handleViewChange("admin");
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 transform ${
                            view === "admin"
                              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl scale-[1.02] border-2 border-purple-500/50"
                              : "bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-purple-50/80 hover:scale-[1.01] border border-slate-200/60 shadow-md hover:shadow-lg"
                          }`}
                        >
                          <div className={`p-2 rounded-xl ${view === "admin" ? "bg-white/20" : "bg-purple-100"}`}>
                            <Shield className={`w-5 h-5 ${view === "admin" ? "text-white" : "text-purple-600"}`} />
                          </div>
                          <span className="font-semibold flex-1 text-left">Admin</span>
            </button>
          )}
        </div>
        </div>
                </div>
              </>
      )}

            {/* Desktop Tabs - Hidden on mobile, visible on sm and up */}
            <nav 
              className="max-w-5xl mx-auto hidden sm:flex flex-row justify-center items-stretch bg-gradient-to-b from-white/95 via-white/90 to-white/95 backdrop-blur-2xl rounded-t-2xl sm:rounded-t-3xl rounded-b-none p-2.5 sm:p-3 md:p-3.5 shadow-[0_10px_40px_rgba(15,23,42,0.15),0_0_0_1px_rgba(255,255,255,0.5)_inset] gap-1.5 sm:gap-2 mb-0 relative z-[100]"
              style={{ 
                height: '72px',
                contain: 'layout style paint',
                boxSizing: 'border-box'
              }}
            >
              {/* Decorative gradient line at top */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-400/30 via-purple-400/40 to-indigo-400/30 rounded-t-2xl sm:rounded-t-3xl"></div>
              {/* Subtle bottom border that connects with content */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-300/30 to-transparent"></div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewChange("poll");
              }}
              type="button"
              className={`group relative px-5 sm:px-6 md:px-7 lg:px-9 py-3 sm:py-3.5 md:py-4 min-h-[52px] font-semibold rounded-xl sm:rounded-2xl sm:rounded-l-2xl sm:rounded-r-none transition-all duration-300 text-sm sm:text-base md:text-lg relative z-[101] overflow-hidden ${
                view === "poll"
                  ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-[0_8px_24px_rgba(99,102,241,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset] ring-2 ring-indigo-400/50"
                  : "bg-white/60 text-slate-700 hover:bg-gradient-to-br hover:from-indigo-50/80 hover:via-purple-50/80 hover:to-indigo-50/80 hover:text-indigo-800 hover:shadow-lg hover:ring-1 hover:ring-indigo-200/50 border border-transparent hover:border-indigo-100/50"
              }`}
            >
              {view === "poll" && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/10 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                </>
              )}
              <span className="relative flex items-center justify-center gap-2.5">
                <ListChecks className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${view === "poll" ? "scale-110 drop-shadow-lg" : "group-hover:scale-110 text-indigo-600"}`} /> 
                <span className="hidden sm:inline font-semibold">Availability</span>
                <span className="sm:hidden font-semibold">Avail</span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-300 ${view === "poll" ? "bg-white/30 text-white shadow-md backdrop-blur-sm" : "bg-indigo-100/80 text-indigo-700 group-hover:bg-indigo-200/80"}`}>
                  {availableCount}
                </span>
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewChange("leaderboard");
              }}
              type="button"
              className={`group relative px-5 sm:px-6 md:px-7 lg:px-9 py-3 sm:py-3.5 md:py-4 min-h-[52px] font-semibold rounded-xl sm:rounded-none transition-all duration-300 text-sm sm:text-base md:text-lg relative z-[101] overflow-hidden ${
                view === "leaderboard"
                  ? "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-[0_8px_24px_rgba(245,158,11,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset] ring-2 ring-amber-400/50"
                  : "bg-white/60 text-slate-700 hover:bg-gradient-to-br hover:from-amber-50/80 hover:via-orange-50/80 hover:to-amber-50/80 hover:text-amber-800 hover:shadow-lg hover:ring-1 hover:ring-amber-200/50 border border-transparent hover:border-amber-100/50"
              }`}
            >
              {view === "leaderboard" && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/10 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                </>
              )}
              <span className="relative flex items-center justify-center gap-2.5">
                <Award className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${view === "leaderboard" ? "scale-110 drop-shadow-lg" : "group-hover:scale-110 text-amber-600"}`} /> 
                <span className="font-semibold">Statistics</span>
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewChange("teams");
              }}
              type="button"
              disabled={!teams || !teams.teams || teams.teams.length === 0}
              className={`group relative px-5 sm:px-6 md:px-7 lg:px-9 py-3 sm:py-3.5 md:py-4 min-h-[52px] font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed text-sm sm:text-base md:text-lg rounded-xl sm:rounded-none relative z-[101] overflow-hidden ${
                view === "teams"
                  ? "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-[0_8px_24px_rgba(245,158,11,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset] ring-2 ring-amber-400/50"
                  : "bg-white/60 text-slate-700 hover:bg-gradient-to-br hover:from-amber-50/80 hover:via-orange-50/80 hover:to-amber-50/80 hover:text-amber-800 hover:shadow-lg hover:ring-1 hover:ring-amber-200/50 border border-transparent hover:border-amber-100/50"
              }`}
            >
              {view === "teams" && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/10 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                </>
              )}
              <span className="relative flex items-center justify-center gap-2.5">
                <Trophy className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${view === "teams" ? "scale-110 drop-shadow-lg" : "group-hover:scale-110 text-amber-600"}`} /> 
                <span className="font-semibold">Teams</span>
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewChange("questions");
              }}
              type="button"
              className={`group relative px-5 sm:px-6 md:px-7 lg:px-9 py-3 sm:py-3.5 md:py-4 min-h-[52px] font-semibold rounded-xl sm:rounded-none transition-all duration-300 text-sm sm:text-base md:text-lg relative z-[101] overflow-hidden ${
                view === "questions"
                  ? "bg-gradient-to-br from-blue-500 via-cyan-600 to-blue-600 text-white shadow-[0_8px_24px_rgba(59,130,246,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset] ring-2 ring-blue-400/50"
                  : "bg-white/60 text-slate-700 hover:bg-gradient-to-br hover:from-blue-50/80 hover:via-cyan-50/80 hover:to-blue-50/80 hover:text-blue-800 hover:shadow-lg hover:ring-1 hover:ring-blue-200/50 border border-transparent hover:border-blue-100/50"
              }`}
            >
              {view === "questions" && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/10 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                </>
              )}
              <span className="relative flex items-center justify-center gap-2.5">
                <MessageCircle className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${view === "questions" ? "scale-110 drop-shadow-lg" : "group-hover:scale-110 text-blue-600"}`} /> 
                <span className="hidden sm:inline font-semibold">Questions</span>
                <span className="sm:hidden font-semibold">Q&A</span>
              </span>
            </button>
            {/* Admin button - Always render to prevent layout shift, hide when not admin */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewChange("admin");
              }}
              type="button"
              className={`group relative px-5 sm:px-6 md:px-7 lg:px-9 py-3 sm:py-3.5 md:py-4 min-h-[52px] font-semibold rounded-xl sm:rounded-r-2xl sm:rounded-l-none transition-all duration-300 text-sm sm:text-base md:text-lg relative z-[101] overflow-hidden ${
                userRole === "admin"
                  ? view === "admin"
                    ? "bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700 text-white shadow-[0_8px_24px_rgba(168,85,247,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset] ring-2 ring-purple-400/50"
                    : "bg-white/60 text-slate-700 hover:bg-gradient-to-br hover:from-purple-50/80 hover:via-pink-50/80 hover:to-purple-50/80 hover:text-purple-800 hover:shadow-lg hover:ring-1 hover:ring-purple-200/50 border border-transparent hover:border-purple-100/50"
                  : "opacity-0 pointer-events-none invisible"
              }`}
              disabled={userRole !== "admin"}
              aria-hidden={userRole !== "admin"}
            >
              {view === "admin" && userRole === "admin" && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/10 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                </>
              )}
              <span className="relative flex items-center justify-center gap-2.5">
                <Shield className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${view === "admin" ? "scale-110 drop-shadow-lg" : "group-hover:scale-110 text-purple-600"}`} /> 
                <span className="font-semibold">Admin</span>
              </span>
            </button>
          </nav>

          {/* Content Area */}
          <main 
            className="max-w-5xl mx-auto px-2 sm:px-3 md:px-4 relative" 
            style={{ 
              minHeight: '600px',
              contain: 'layout style paint'
            }}
          >
            {/* Decorative connection line between tabs and content */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-300/30 to-transparent"></div>
            <div 
              className={`transition-all duration-500 ease-in-out ${
                slideDirection === "left"
                  ? "translate-x-full opacity-0 pointer-events-none"
                  : slideDirection === "right"
                  ? "-translate-x-full opacity-0 pointer-events-none"
                  : "translate-x-0 opacity-100"
              }`}
              style={{ 
                willChange: slideDirection ? 'transform, opacity' : 'auto',
                contain: 'layout style paint'
              }}
            >
              {view === "poll" && (
                <WeeklyAvailabilityPoll
                  availability={availability}
                  loading={loading}
                  availableCount={availableCount}
                  onToggleAvailability={toggleAvailability}
                  onGenerateTeams={generateBalancedTeams}
                  onUpdatePlayer={updatePlayer}
                  onDeletePlayer={deletePlayer}
                  onAddPlayer={(player) => addPlayer(player, false)}
                  error={error}
                  disabled={!userId}
                  isAdmin={userRole === "admin"}
                  teamCount={teamCount}
                  onTeamCountChange={handleTeamCountChange}
                  minPlayersRequired={minPlayersRequired}
                  canGenerateTeams={canGenerateTeams}
                  currentUserId={userId}
                  db={db}
                  isActive={view === "poll"}
                  onNavigateToLeaderboard={() => handleViewChange("leaderboard")}
                  userEmail={userEmail || ""}
                  userRole={userRole}
                  openMOTMModal={openMOTMModal}
                  openKudosModal={openKudosModal}
                  openPointsModal={openPointsModal}
                  onModalOpened={handleModalOpened}
                />
            )}
              {view === "teams" && (
                teamsLoading ? (
                  <TeamResults
                    teams={[]}
                    generatedAt={undefined}
                    onBack={() => handleViewChange("poll")}
                    isActive={view === "teams"}
                    isLoading={true}
                  />
                ) : teams && teams.teams?.length > 0 ? (
                  <TeamResults
                    teams={teams.teams}
                    generatedAt={teams.generatedAt}
                    onBack={() => handleViewChange("poll")}
                    isActive={view === "teams"}
                    isLoading={false}
                  />
                ) : (
                  <div className="relative overflow-hidden backdrop-blur-xl p-8 sm:p-12 rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.15)] -mt-[1px] bg-gradient-to-br from-amber-50/95 via-orange-50/95 to-amber-50/95 border-l-2 border-r-2 border-b-2 border-amber-500/70 min-h-[400px]">
                    <div className="pointer-events-none absolute inset-0 opacity-60">
                      <div className="absolute -top-10 right-0 w-56 h-56 bg-amber-200/60 blur-[110px]" />
                      <div className="absolute bottom-0 left-4 w-64 h-64 bg-pink-200/50 blur-[120px]" />
                    </div>
                    <div className="relative z-10 text-center py-12 sm:py-16">
                      <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 mb-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl shadow-xl">
                        <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-amber-600" />
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">
                        No Teams Generated Yet
                      </h3>
                      <p className="text-slate-600 mb-6 max-w-md mx-auto">
                        Teams will appear here once an admin generates them from the Availability tab.
                      </p>
                      <button
                        onClick={() => handleViewChange("poll")}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <ListChecks className="w-5 h-5" />
                        Go to Availability
                      </button>
                    </div>
                  </div>
                )
              )}
              {view === "questions" && userId && (
                <QuestionsConcerns
                  db={db}
                  userId={userId}
                  userEmail={userEmail || ""}
                  userRole={userRole}
                  isActive={view === "questions"}
                />
              )}
              {view === "leaderboard" && userId && (
                <StatisticsDashboard
                  db={db}
                  userId={userId}
                  userEmail={userEmail || ""}
                  userRole={userRole}
                  players={availability}
                  isActive={view === "leaderboard"}
                />
              )}
              {view === "admin" && userRole === "admin" && userId && (
                <AdminDashboard
                  db={db}
                  userId={userId}
                  userEmail={userEmail || ""}
                  userRole={userRole}
                  onRoleUpdate={refreshUserRole}
                  players={availability}
                  isActive={view === "admin"}
                />
              )}
            </div>
          </main>
        </>
      )}

      {/* General Error Display */}
      {isAppReady && userId && error && (
        <div className="max-w-5xl mx-auto mt-4 px-4">
          <div className="relative p-4 sm:p-5 bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border-2 border-red-300/80 text-red-800 rounded-2xl text-sm sm:text-base font-semibold text-center shadow-xl shadow-red-500/20 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-500 rounded-t-2xl"></div>
            <div className="flex items-center justify-center gap-3">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="absolute top-2 right-2 p-1.5 hover:bg-red-100 rounded-lg transition-colors duration-200"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Self-Registration Modal (shown when user is not registered) */}
        {isAppReady && userId && !checkingRegistration && !isUserRegistered && userEmail && (
          <SelfRegistrationModal
            userEmail={userEmail}
            onRegister={async (player) => {
              await addPlayer(player, true);
            }}
          />
        )}

        {/* Loading state while checking registration */}
        {isAppReady && userId && checkingRegistration && (
          <div className="max-w-4xl mx-auto mt-8 text-center p-10">
            <div className="inline-flex flex-col items-center gap-4 p-8 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-white rounded-full animate-spin"></div>
              </div>
              <p className="font-bold text-lg sm:text-xl text-white drop-shadow-lg">
                Checking registration...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
