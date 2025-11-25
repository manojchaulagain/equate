import React, { useState, useMemo, useEffect } from "react";
import { ListChecks, Users, Trophy, LogOut, Shield } from "lucide-react";

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
import AuthUI from "./components/auth/AuthUI";
import WeeklyAvailabilityPoll from "./components/poll/WeeklyAvailabilityPoll";
import TeamResults from "./components/teams/TeamResults";
import UserManagement from "./components/admin/UserManagement";
import SelfRegistrationModal from "./components/players/SelfRegistrationModal";

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
  const [view, setView] = useState<"poll" | "teams" | "admin">("poll");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUserRegistered, setIsUserRegistered] = useState<boolean | null>(null);
  const [checkingRegistration, setCheckingRegistration] = useState(true);

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

      const unsubscribeAuth = onAuthStateChanged(authInstance, (user) => {
        if (user) {
          setUserId(user.uid);
          setUserEmail(user.email);
          // Check localStorage for registration status on auth state change
          const stored = localStorage.getItem(`userRegistered_${user.uid}`);
          if (stored === "true") {
            setIsUserRegistered(true);
            setCheckingRegistration(false);
          } else {
            setIsUserRegistered(null);
            setCheckingRegistration(true);
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
  const handleSuccessfulSignIn = (user: User) => {
    setUserId(user.uid);
    setUserEmail(user.email);
    setError(null);
    // Check localStorage first, then trigger check if not found
    const stored = localStorage.getItem(`userRegistered_${user.uid}`);
    if (stored === "true") {
      setIsUserRegistered(true);
      setCheckingRegistration(false);
    } else {
      setIsUserRegistered(null);
      setCheckingRegistration(true);
    }
    // Note: The registration check useEffect will run automatically when userId changes
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
        const loadedPlayers: Player[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            skillLevel: Math.max(
              1,
              Math.min(10, data.skillLevel || 5)
            ) as SkillLevel,
            position: POSITIONS.includes(data.position as Position)
              ? (data.position as Position)
              : "CM",
          } as Player;
        });

        // Update availability list, maintaining existing availability status if possible
        setAvailability((prevAvailability) => {
          const updatedAvailability: PlayerAvailability[] = loadedPlayers.map(
            (p) => {
              const existing = prevAvailability.find((ep) => ep.id === p.id);
              return {
                ...p,
                isAvailable: existing ? existing.isAvailable : true,
              };
            }
          );

          return updatedAvailability;
        });

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
        if (snapshot.exists()) {
          const data = snapshot.data();
          setTeams({
            teamA: data.teamA as Team,
            teamB: data.teamB as Team,
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
      };

      // If self-registration, add userId to link player to user
      if (isSelfRegistration && userId) {
        (playerDoc as any).userId = userId;
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

  // Function to update availability (updates local state only - ephemeral for the week)
  const toggleAvailability = (playerId: string) => {
    setAvailability((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, isAvailable: !p.isAvailable } : p
      )
    );
    // Clear teams from Firestore when availability changes
    clearTeamsFromFirestore();
    setError(null);
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

  // Team Generation Algorithm - saves to Firestore for all users to see
  const generateBalancedTeams = async () => {
    // Security check: Only admins can generate teams
    if (userRole !== "admin") {
      setError("Only administrators can generate teams.");
      return;
    }

    setError(null);
    const availablePlayers = availability.filter((p) => p.isAvailable);

    if (availablePlayers.length < 2) {
      setError("Need at least 2 available players to form teams!");
      return;
    }

    if (!db) {
      setError("Database connection not ready. Please wait.");
      return;
    }

    const sortedPlayers = [...availablePlayers].sort(
      (a, b) => b.skillLevel - a.skillLevel
    );

    let teamA: Team = { name: "Team A (Blue)", players: [], totalSkill: 0 };
    let teamB: Team = { name: "Team B (Red)", players: [], totalSkill: 0 };

    const numPlayers = sortedPlayers.length;
    const half = Math.floor(numPlayers / 2);

    for (let i = 0; i < half; i++) {
      const playerHigh = sortedPlayers[i];
      const playerLow = sortedPlayers[numPlayers - 1 - i];

      if (Math.random() < 0.5) {
        teamA.players.push(playerHigh);
        teamA.totalSkill += playerHigh.skillLevel;

        teamB.players.push(playerLow);
        teamB.totalSkill += playerLow.skillLevel;
      } else {
        teamA.players.push(playerLow);
        teamA.totalSkill += playerLow.skillLevel;

        teamB.players.push(playerHigh);
        teamB.totalSkill += playerHigh.skillLevel;
      }
    }

    if (numPlayers % 2 !== 0) {
      const middlePlayer = sortedPlayers[half];

      if (teamA.totalSkill <= teamB.totalSkill) {
        teamA.players.push(middlePlayer);
        teamA.totalSkill += middlePlayer.skillLevel;
      } else {
        teamB.players.push(middlePlayer);
        teamB.totalSkill += middlePlayer.skillLevel;
      }
    }

    const teamsData: TeamResultsState = { teamA, teamB };

    // Save teams to Firestore so all users can see them
    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const teamsDocPath = `artifacts/${appId}/public/data/teams/current`;
      const teamsDocRef = doc(db, teamsDocPath);
      await setDoc(teamsDocRef, teamsData);
      // The real-time listener will update the state automatically
      setView("teams");
    } catch (error) {
      console.error("Error saving teams:", error);
      setError("Failed to save teams to database.");
    }
  };

  const availableCount = useMemo(
    () => availability.filter((p) => p.isAvailable).length,
    [availability]
  );

  // --- MAIN RENDER ---

  const isAppReady = isAuthReady && db;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-3 sm:p-6 md:p-8 font-sans">
      <header className="text-center mb-4 sm:mb-6 md:mb-8 bg-gradient-to-r from-white/80 to-indigo-50/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-indigo-100">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="flex items-center">
            <Users className="text-indigo-600 mr-2 sm:mr-3" size={28} /> 
            <span className="whitespace-nowrap">Soccer Team</span>
          </div>
          <span className="whitespace-nowrap">Balancer</span>
        </h1>
        <p className="text-slate-700 mt-2 text-sm sm:text-base md:text-lg font-medium px-2">
          Manage players, track availability, and generate fair teams.
          <span className="block text-xs sm:text-sm font-semibold mt-2 text-emerald-700 bg-emerald-50 px-2 sm:px-3 py-1 rounded-full inline-block">
            The Player Roster is shared. Sign-in required for access.
          </span>
        </p>

        {/* User Info and Sign Out */}
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-3 sm:space-x-4">
          {userEmail && (
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 bg-white/70 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl shadow-md border border-indigo-200 w-full sm:w-auto">
              <p className="text-xs sm:text-sm font-medium text-slate-700 text-center sm:text-left">
                <span className="hidden sm:inline">Logged in as: </span>
                <span className="font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent break-all sm:break-normal">{userEmail}</span>
              </p>
              {userRole === "admin" && (
                <span className="px-2 sm:px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full text-xs font-bold shadow-md whitespace-nowrap">
                  Admin
                </span>
              )}
            </div>
          )}
          {userId && (
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center text-xs sm:text-sm text-white font-semibold px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:from-red-600 hover:to-rose-700 transform hover:scale-105 w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4 mr-1" /> <span>Sign Out</span>
            </button>
          )}
        </div>
      </header>

      {!isAppReady && (
        <div className="text-center p-10 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl border border-indigo-200 shadow-lg">
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
          <nav className="flex flex-col sm:flex-row justify-center mb-4 sm:mb-6 md:mb-8 bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl p-1.5 sm:p-2 shadow-xl border border-indigo-100 w-full sm:w-auto sm:inline-flex mx-auto gap-1 sm:gap-0">
            <button
              onClick={() => setView("poll")}
              className={`px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 font-bold rounded-lg sm:rounded-l-xl sm:rounded-r-none transition-all duration-300 text-xs sm:text-sm md:text-base ${
                view === "poll"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-[1.02] sm:scale-105"
                  : "bg-transparent text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
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
              onClick={() => setView("teams")}
              disabled={!teams}
              className={`px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm md:text-base rounded-lg sm:rounded-none ${
                userRole !== "admin" ? "sm:rounded-r-xl" : ""
              } ${
                view === "teams"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg transform scale-[1.02] sm:scale-105"
                  : "bg-transparent text-slate-600 hover:bg-amber-50 hover:text-amber-700"
              }`}
            >
              <span className="flex items-center justify-center">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> 
                <span>Teams</span>
              </span>
            </button>
            {userRole === "admin" && (
              <button
                onClick={() => setView("admin")}
                className={`px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 font-bold rounded-lg sm:rounded-r-xl sm:rounded-l-none transition-all duration-300 text-xs sm:text-sm md:text-base ${
                  view === "admin"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transform scale-[1.02] sm:scale-105"
                    : "bg-transparent text-slate-600 hover:bg-purple-50 hover:text-purple-700"
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
          <main className="max-w-4xl mx-auto px-2 sm:px-4">
            {view === "poll" && (
              <WeeklyAvailabilityPoll
                availability={availability}
                loading={loading}
                availableCount={availableCount}
                onToggleAvailability={toggleAvailability}
                onGenerateTeams={generateBalancedTeams}
                onUpdatePlayer={updatePlayer}
                onAddPlayer={(player) => addPlayer(player, false)}
                error={error}
                disabled={!userId}
                isAdmin={userRole === "admin"}
              />
            )}
            {view === "teams" && teams && (
              <TeamResults
                teamA={teams.teamA}
                teamB={teams.teamB}
                onBack={() => setView("poll")}
              />
            )}
            {view === "admin" && userRole === "admin" && userId && (
              <UserManagement
                db={db}
                currentUserId={userId}
                onRoleUpdate={refreshUserRole}
              />
            )}
          </main>
        </>
      )}

      {/* General Error Display */}
      {isAppReady && userId && error && (
        <div className="max-w-4xl mx-auto mt-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold text-center shadow-lg">
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
        <div className="text-center p-10 font-semibold text-xl text-gray-600">
          Checking registration...
        </div>
      )}
    </div>
  );
}
