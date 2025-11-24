import React, { useState, useMemo, useEffect } from "react";
import { Plus, ListChecks, Users, Trophy, LogOut, Shield } from "lucide-react";

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
  deleteDoc,
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
import PlayerRegistrationForm from "./components/players/PlayerRegistrationForm";
import WeeklyAvailabilityPoll from "./components/poll/WeeklyAvailabilityPoll";
import TeamResults from "./components/teams/TeamResults";
import UserManagement from "./components/admin/UserManagement";

// --- GLOBAL CANVAS VARIABLES (Mandatory) ---
declare const __app_id: string;
const __firebase_config = {
  apiKey: "AIzaSyASFx_hSsJ2Rq9qdJuaND7fsRy-Vlsc34c",
  authDomain: "team-balancer-f196a.firebaseapp.com",
  projectId: "team-balancer-f196a",
  storageBucket: "team-balancer-f196a.firebasestorage.app",
  messagingSenderId: "203717528050",
  appId: "1:203717528050:web:b44ab600e2255cdea3836b",
  measurementId: "G-FL3HFEJYNE"
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
  const [view, setView] = useState<"register" | "poll" | "teams" | "admin">("poll");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        } else {
          setUserId(null);
          setUserEmail(null);
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
      setUserId(null);
      setUserEmail(null);
      setUserRole("user"); // Reset role on sign out
      setTeams(null); // Clear teams on sign out
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

  // Function to add a new player (writes to Firestore)
  const addPlayer = async (playerData: Omit<Player, "id">) => {
    if (!db) {
      setError("Database connection not ready. Please wait.");
      return;
    }

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const playersCollectionPath = `artifacts/${appId}/public/data/soccer_players`;
    const playersColRef = collection(db, playersCollectionPath);

    try {
      await addDoc(playersColRef, {
        name: playerData.name,
        position: playerData.position,
        skillLevel: playerData.skillLevel,
      });
    } catch (e) {
      console.error("Error adding document: ", e);
      setError("Failed to save player to database.");
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
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 flex items-center justify-center">
          <Users className="text-indigo-600 mr-3" size={32} /> Soccer Team
          Balancer
        </h1>
        <p className="text-gray-600 mt-2">
          Manage players, track availability, and generate fair teams.
          <span className="block text-xs font-semibold mt-1 text-green-700">
            The Player Roster is shared. Sign-in required for access.
          </span>
        </p>

        {/* User Info and Sign Out */}
        <div className="mt-4 flex justify-center items-center space-x-4">
          {userEmail && (
            <p className="text-sm font-medium text-gray-700">
              Logged in as:{" "}
              <span className="font-semibold text-indigo-600">{userEmail}</span>
              {userRole === "admin" && (
                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                  Admin
                </span>
              )}
            </p>
          )}
          {userId && (
            <button
              onClick={handleSignOut}
              className="flex items-center text-sm text-red-600 hover:text-red-800 font-medium p-2 bg-red-100 rounded-lg transition duration-200"
            >
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </button>
          )}
        </div>
      </header>

      {!isAppReady && (
        <div className="text-center p-10 font-semibold text-xl text-gray-600">
          Initializing application...
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
          <nav className="flex justify-center mb-8">
            <button
              onClick={() => setView("register")}
              className={`px-6 py-3 font-semibold rounded-l-xl transition-colors ${
                view === "register"
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-white text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Plus className="inline w-4 h-4 mr-2" /> Register
            </button>
            <button
              onClick={() => setView("poll")}
              className={`px-6 py-3 font-semibold transition-colors ${
                view === "poll"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-white text-gray-600 hover:bg-gray-200"
              }`}
            >
              <ListChecks className="inline w-4 h-4 mr-2" /> Availability (
              {availableCount})
            </button>
            <button
              onClick={() => setView("teams")}
              disabled={!teams}
              className={`px-6 py-3 font-semibold transition-colors disabled:opacity-50 ${
                userRole !== "admin" ? "rounded-r-xl" : ""
              } ${
                view === "teams"
                  ? "bg-yellow-500 text-white shadow-lg"
                  : "bg-white text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Trophy className="inline w-4 h-4 mr-2" /> Teams
            </button>
            {userRole === "admin" && (
              <button
                onClick={() => setView("admin")}
                className={`px-6 py-3 font-semibold rounded-r-xl transition-colors ${
                  view === "admin"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-white text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Shield className="inline w-4 h-4 mr-2" /> Admin
              </button>
            )}
          </nav>

          {/* Content Area */}
          <main className="max-w-4xl mx-auto">
            {view === "register" && (
              <PlayerRegistrationForm
                onAddPlayer={addPlayer}
                disabled={loading || !userId}
              />
            )}
            {view === "poll" && (
              <WeeklyAvailabilityPoll
                availability={availability}
                loading={loading}
                availableCount={availableCount}
                onToggleAvailability={toggleAvailability}
                onGenerateTeams={generateBalancedTeams}
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
        <div className="max-w-4xl mx-auto mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm font-medium text-center">
          {error}
        </div>
      )}
    </div>
  );
}
