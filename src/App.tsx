import React, { useState, useMemo, useEffect, useRef } from "react";
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
} from "./types/player";
import { UserRole } from "./types/user";
import { POSITIONS } from "./constants/player";
import { TEAM_COLOR_SEQUENCE, getTeamColorLabel } from "./constants/teamColors";
import AuthUI from "./components/auth/AuthUI";
import WeeklyAvailabilityPoll from "./components/poll/WeeklyAvailabilityPoll";
import TeamResults from "./components/teams/TeamResults";
import UserManagement from "./components/admin/UserManagement";
import GameSchedule from "./components/admin/GameSchedule";
import SelfRegistrationModal from "./components/players/SelfRegistrationModal";
import QuestionsConcerns from "./components/questions/QuestionsConcerns";
import Notifications from "./components/notifications/Notifications";
import UserNotifications from "./components/notifications/UserNotifications";
import Leaderboard from "./components/leaderboard/Leaderboard";
import KudosBoard from "./components/kudos/KudosBoard";
import ManOfTheMatch from "./components/motm/ManOfTheMatch";

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
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
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
            className="fixed inset-0 z-[90]"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown Menu - Fixed positioning to escape header bounds */}
          {menuPosition && (
            <div 
              className="fixed w-[280px] sm:w-[320px] md:w-[360px] max-w-[calc(100vw-1rem)] bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/60 z-[100] overflow-visible animate-in fade-in slide-in-from-top-2 duration-200"
              style={{
                top: `${menuPosition.top}px`,
                right: `${Math.max(menuPosition.right, 8)}px`,
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
          setTooltipPosition({
            top: rect.bottom + 12,
            right: window.innerWidth - rect.right,
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
            className="fixed inset-0 z-[90]"
            onClick={() => setIsOpen(false)}
          />
          {/* Tooltip */}
          {tooltipPosition && (
            <div
              className="fixed w-[min(calc(100vw-2rem),400px)] sm:w-[420px] bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl text-white text-xs sm:text-sm rounded-3xl shadow-2xl pointer-events-auto z-[100] border border-slate-700/60 p-4 sm:p-5 transition-all duration-200"
              style={{
                top: `${tooltipPosition.top}px`,
                right: `${Math.max(tooltipPosition.right, 8)}px`,
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
const NotificationsBanner: React.FC<{ db: any }> = ({ db }) => {
  const [criticalNotifications, setCriticalNotifications] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!db) return;

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const notificationsPath = `artifacts/${appId}/public/data/notifications`;
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
          .filter((n: any) => n.isCritical && !dismissedIds.includes(n.id));
        setCriticalNotifications(notifications.slice(0, 3)); // Show max 3
      },
      (err) => {
        console.error("Error fetching notifications:", err);
      }
    );

    return () => unsubscribe();
  }, [db, dismissedIds]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  if (criticalNotifications.length === 0) return null;

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-3 md:px-4 mb-4 space-y-2">
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
};

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
  const [teamCount, setTeamCount] = useState<number>(2);
  const [view, setView] = useState<"poll" | "teams" | "questions" | "admin" | "leaderboard">("poll");
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Helper to determine slide direction based on tab order
  const getTabOrder = (tab: "poll" | "teams" | "questions" | "admin" | "leaderboard"): number => {
    return tab === "poll" ? 0 : tab === "leaderboard" ? 1 : tab === "teams" ? 2 : tab === "questions" ? 3 : 4;
  };
  
  const handleViewChange = (newView: "poll" | "teams" | "questions" | "admin" | "leaderboard") => {
    if (view !== newView) {
      const currentOrder = getTabOrder(view);
      const newOrder = getTabOrder(newView);
      setSlideDirection(newOrder > currentOrder ? "left" : "right");
      setTimeout(() => {
        setView(newView);
        setTimeout(() => setSlideDirection(null), 500);
      }, 50);
    }
  };
  const [loading, setLoading] = useState(true);
  const [isUserRegistered, setIsUserRegistered] = useState<boolean | null>(null);
  const [checkingRegistration, setCheckingRegistration] = useState(true);

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

  const handleTeamCountChange = (count: number) => {
    setTeamCount(count);
    setError(null);
  };

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
    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const playersCollectionPath = `artifacts/${appId}/public/data/soccer_players`;
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

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const teamsDocPath = `artifacts/${appId}/public/data/teams/current`;
    const teamsDocRef = doc(db, teamsDocPath);

    const unsubscribeTeams = onSnapshot(
      teamsDocRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setTeams(null);
          return;
        }

        const data = snapshot.data() as Partial<TeamResultsState> & {
          teamA?: Team;
          teamB?: Team;
        };

        if (Array.isArray(data.teams)) {
          const normalizedTeams = data.teams.map((team, index) => {
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

          setTeams({
            teams: normalizedTeams,
            generatedAt: data.generatedAt,
          });
          return;
        }

        if (data.teamA && data.teamB) {
          setTeams({
            teams: [
              { ...data.teamA, colorKey: data.teamA.colorKey || "blue" },
              { ...data.teamB, colorKey: data.teamB.colorKey || "red" },
            ],
            generatedAt: data.generatedAt,
          });
        } else {
          setTeams(null);
        }
      },
      (error) => {
        console.error("Firestore Teams Listener Error:", error);
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

  // Function to update availability (updates local state only - ephemeral for the week)
  const toggleAvailability = async (playerId: string) => {
    const player = availability.find((p) => p.id === playerId);
    if (!player) return;

    // Check if user has permission to toggle this player's availability
    // Admins can toggle all players
    // Regular users can only toggle their own player or players they registered
    if (userRole !== "admin" && userId) {
      const canToggle = player.userId === userId || player.registeredBy === userId;
      if (!canToggle) {
        setError("You can only change availability for your own player or players you registered.");
        return;
      }
    }

    const newStatus = !player.isAvailable;

    setAvailability((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, isAvailable: newStatus } : p
      )
    );
    // Clear teams from Firestore when availability changes
    clearTeamsFromFirestore();
    setError(null);

    if (!db) return;

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const playerDocPath = `artifacts/${appId}/public/data/soccer_players/${playerId}`;
      const playerDocRef = doc(db, playerDocPath);
      await updateDoc(playerDocRef, { isAvailable: newStatus });
    } catch (e) {
      console.error("Error updating availability: ", e);
      setError("Failed to update availability.");
    }
  };

  // Function to clear teams from Firestore
  const clearTeamsFromFirestore = async () => {
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
  };

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

    const sortedPlayers = [...availablePlayers].sort((a, b) => b.skillLevel - a.skillLevel);

    const resolveColor = (index: number): Team["colorKey"] => {
      if (normalizedTeamCount === 2) {
        return index === 0 ? "red" : "blue";
      }
      return TEAM_COLOR_SEQUENCE[index % TEAM_COLOR_SEQUENCE.length];
    };

    const createdTeams: Team[] = Array.from({ length: normalizedTeamCount }, (_, index) => {
      const colorKey = resolveColor(index);
      const label = getTeamColorLabel(colorKey);
      return {
        name: `${label} Team`,
        players: [],
        totalSkill: 0,
        colorKey,
      };
    });

    sortedPlayers.forEach((player) => {
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
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-16 w-72 sm:w-96 h-72 sm:h-96 bg-pink-500/30 blur-[130px] opacity-70" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-indigo-500/20 blur-[140px]" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-blue-500/10 blur-[160px]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.02)_25%,transparent_25%)]" />
          </div>

      <div className="relative z-10 px-2 sm:px-4 md:px-6 lg:px-10 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <header className="max-w-5xl mx-auto relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-2xl border border-slate-700/50 z-20 overflow-hidden">
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
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-6 md:right-6 flex items-center gap-1.5 sm:gap-2 md:gap-3 z-30">
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
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full bg-white/10 backdrop-blur-sm shadow-2xl border-[3px] border-amber-300/60 flex items-center justify-center transform hover:scale-105 transition-all duration-300 overflow-hidden">
                <img 
                  src={`${process.env.PUBLIC_URL || ''}/club-logo.png`}
                  alt="Sagarmatha FC Logo" 
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    console.error("Failed to load club logo from:", e.currentTarget.src);
                  }}
                />
                {/* Shine effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none"></div>
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
          <div className="max-w-4xl mx-auto text-center p-10 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_20px_50px_rgba(15,23,42,0.2)]">
            <p className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Initializing application...
            </p>
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
            
            {/* Mobile Hamburger Menu Button */}
            <div className="max-w-5xl mx-auto sm:hidden mb-2 px-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`w-full flex items-center justify-between p-3 backdrop-blur-xl rounded-2xl shadow-lg border transition-all duration-200 ${
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
                  {view === "poll" && "Availability"}
                  {view === "leaderboard" && "Leaderboard"}
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
                  className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <div className="fixed top-0 left-0 right-0 bg-white rounded-b-3xl shadow-2xl z-50 sm:hidden max-h-[80vh] overflow-y-auto">
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                      <h2 className="font-bold text-lg text-slate-800">Menu</h2>
                      <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-slate-600" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        handleViewChange("poll");
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 ${
                        view === "poll"
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <ListChecks className="w-5 h-5" />
                      <span className="font-semibold">Availability ({availableCount})</span>
                    </button>
                    <button
                      onClick={() => {
                        handleViewChange("leaderboard");
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 ${
                        view === "leaderboard"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Award className="w-5 h-5" />
                      <span className="font-semibold">Leaderboard</span>
                    </button>
                    <button
                      onClick={() => {
                        handleViewChange("teams");
                        setMobileMenuOpen(false);
                      }}
                      disabled={!teams || !teams.teams || teams.teams.length === 0}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                        view === "teams"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Trophy className="w-5 h-5" />
                      <span className="font-semibold">Teams</span>
                    </button>
                    <button
                      onClick={() => {
                        handleViewChange("questions");
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 ${
                        view === "questions"
                          ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-semibold">Questions</span>
                    </button>
                    {userRole === "admin" && (
                      <button
                        onClick={() => {
                          handleViewChange("admin");
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 ${
                          view === "admin"
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <Shield className="w-5 h-5" />
                        <span className="font-semibold">Admin</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Desktop Tabs - Hidden on mobile */}
            <nav className="max-w-5xl mx-auto hidden sm:flex flex-row justify-center bg-white/80 backdrop-blur-xl rounded-t-2xl sm:rounded-t-3xl rounded-b-none p-1 sm:p-1.5 md:p-2 shadow-[0_15px_40px_rgba(15,23,42,0.15)] border border-white/60 border-b-0 gap-1 sm:gap-0 mb-0 relative z-10">
            <button
              onClick={() => handleViewChange("poll")}
              className={`px-3 sm:px-4 md:px-5 lg:px-6 py-2.5 sm:py-2.5 md:py-3 min-h-[44px] sm:min-h-0 font-semibold rounded-xl sm:rounded-2xl sm:rounded-l-2xl sm:rounded-r-none transition-all duration-300 text-xs sm:text-sm md:text-base ${
                view === "poll"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-[1.02] sm:scale-[1.03]"
                  : "bg-transparent text-slate-600 hover:bg-indigo-50/60 hover:text-indigo-700"
              }`}
            >
              <span className="flex items-center justify-center">
                <ListChecks className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> 
                <span className="hidden sm:inline">Availability </span>
                <span className="sm:hidden">Avail</span>
                <span className="ml-1">({availableCount})</span>
              </span>
            </button>
            <button
              onClick={() => handleViewChange("leaderboard")}
              className={`px-3 sm:px-4 md:px-5 lg:px-6 py-2.5 sm:py-2.5 md:py-3 min-h-[44px] sm:min-h-0 font-semibold rounded-xl sm:rounded-none transition-all duration-300 text-xs sm:text-sm md:text-base ${
                view === "leaderboard"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg transform scale-[1.02] sm:scale-[1.03]"
                  : "bg-transparent text-slate-600 hover:bg-amber-50/60 hover:text-amber-700"
              }`}
            >
              <span className="flex items-center justify-center">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> 
                <span>Leaderboard</span>
              </span>
            </button>
            <button
              onClick={() => handleViewChange("teams")}
              disabled={!teams || !teams.teams || teams.teams.length === 0}
              className={`px-3 sm:px-4 md:px-5 lg:px-6 py-2.5 sm:py-2.5 md:py-3 min-h-[44px] sm:min-h-0 font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm md:text-base rounded-xl sm:rounded-none ${
                view === "teams"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg transform scale-[1.02] sm:scale-[1.03]"
                  : "bg-transparent text-slate-600 hover:bg-amber-50/60 hover:text-amber-700"
              }`}
            >
              <span className="flex items-center justify-center">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> 
                <span>Teams</span>
              </span>
            </button>
            <button
              onClick={() => handleViewChange("questions")}
              className={`px-3 sm:px-4 md:px-5 lg:px-6 py-2.5 sm:py-2.5 md:py-3 min-h-[44px] sm:min-h-0 font-semibold rounded-xl sm:rounded-none transition-all duration-300 text-xs sm:text-sm md:text-base ${
                view === "questions"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg transform scale-[1.02] sm:scale-[1.03]"
                  : "bg-transparent text-slate-600 hover:bg-blue-50/60 hover:text-blue-700"
              }`}
            >
              <span className="flex items-center justify-center">
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> 
                <span className="hidden sm:inline">Questions</span>
                <span className="sm:hidden">Q&A</span>
              </span>
            </button>
            {userRole === "admin" && (
              <button
                onClick={() => handleViewChange("admin")}
                className={`px-3 sm:px-4 md:px-5 lg:px-6 py-2.5 sm:py-2.5 md:py-3 min-h-[44px] sm:min-h-0 font-semibold rounded-xl sm:rounded-r-2xl sm:rounded-l-none transition-all duration-300 text-xs sm:text-sm md:text-base ${
                  view === "admin"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transform scale-[1.02] sm:scale-[1.03]"
                    : "bg-transparent text-slate-600 hover:bg-purple-50/60 hover:text-purple-700"
                }`}
              >
                <span className="flex items-center justify-center">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> 
                  <span>Admin</span>
                </span>
              </button>
            )}
          </nav>

          {/* Content Area */}
          <main className="max-w-5xl mx-auto px-2 sm:px-3 md:px-4 -mt-[1px] overflow-hidden relative">
            <div 
              className={`transition-all duration-500 ease-in-out ${
                slideDirection === "left"
                  ? "translate-x-full opacity-0"
                  : slideDirection === "right"
                  ? "-translate-x-full opacity-0"
                  : "translate-x-0 opacity-100"
              }`}
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
                />
              )}
              {view === "teams" && teams && teams.teams?.length > 0 && (
                <TeamResults
                  teams={teams.teams}
                  generatedAt={teams.generatedAt}
                  onBack={() => handleViewChange("poll")}
                  isActive={view === "teams"}
                />
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
                <div className="space-y-6">
                  <Leaderboard
                    db={db}
                    userId={userId}
                    userEmail={userEmail || ""}
                    userRole={userRole}
                    players={availability}
                    isActive={view === "leaderboard"}
                  />
                  <KudosBoard
                    db={db}
                    userId={userId}
                    userEmail={userEmail || ""}
                    players={availability}
                    isActive={view === "leaderboard"}
                  />
                  <ManOfTheMatch
                    db={db}
                    userId={userId}
                    userEmail={userEmail || ""}
                    players={availability}
                    isActive={view === "leaderboard"}
                  />
                </div>
              )}
              {view === "admin" && userRole === "admin" && userId && (
                <div className="space-y-6">
                  <GameSchedule
                    db={db}
                    userId={userId}
                    userEmail={userEmail || ""}
                    isActive={view === "admin"}
                  />
                  <Notifications
                    db={db}
                    userId={userId}
                    userEmail={userEmail || ""}
                    userRole={userRole}
                    isActive={view === "admin"}
                  />
                  <UserManagement
                    db={db}
                    currentUserId={userId}
                    onRoleUpdate={refreshUserRole}
                    isActive={view === "admin"}
                  />
                </div>
              )}
            </div>
          </main>
        </>
      )}

      {/* General Error Display */}
      {isAppReady && userId && error && (
          <div className="max-w-4xl mx-auto mt-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-2xl text-sm font-semibold text-center shadow-lg">
          {error}
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
          <div className="text-center p-10 font-semibold text-xl text-gray-200">
            Checking registration...
          </div>
        )}
      </div>
    </div>
  );
}
