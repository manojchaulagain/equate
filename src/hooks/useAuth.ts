import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { UserRole } from "../types/user";

declare const __app_id: string;

interface UseAuthReturn {
  auth: any;
  db: any;
  userId: string | null;
  userEmail: string | null;
  userRole: UserRole;
  isAuthReady: boolean;
  signOut: () => Promise<void>;
  refreshUserRole: () => Promise<void>;
}

export const useAuth = (firebaseConfig: any): UseAuthReturn => {
  const [auth, setAuth] = useState<any>(null);
  const [db, setDb] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("user");
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);

      setDb(firestore);
      setAuth(authInstance);

      const unsubscribeAuth = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          setUserId(user.uid);
          setUserEmail(user.email);
          
          if (firestore && user.email) {
            try {
              const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
              const userDocPath = `artifacts/${appId}/public/data/users/${user.uid}`;
              const userDocRef = doc(firestore, userDocPath);
              const userDocSnap = await getDoc(userDocRef);
              
              if (!userDocSnap.exists()) {
                await setDoc(userDocRef, {
                  email: user.email,
                  role: "user",
                  lastLogin: Timestamp.now(),
                }, { merge: true });
              } else {
                const existingData = userDocSnap.data();
                await setDoc(userDocRef, {
                  email: user.email,
                  role: existingData.role || "user",
                  lastLogin: Timestamp.now(),
                }, { merge: true });
              }
            } catch (error) {
              console.error("Error creating/updating user document:", error);
            }
          }
        } else {
          setUserId(null);
          setUserEmail(null);
          setUserRole("user");
        }
        setIsAuthReady(true);
      });

      return () => unsubscribeAuth();
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setIsAuthReady(true);
    }
  }, [firebaseConfig]);

  useEffect(() => {
    if (!db || !userId) {
      setUserRole("user");
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
          setUserRole("user");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole("user");
      }
    };

    fetchUserRole();
  }, [db, userId]);

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      setUserId(null);
      setUserEmail(null);
      setUserRole("user");
    }
  };

  const refreshUserRole = async () => {
    if (!db || !userId) return;

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

  return {
    auth,
    db,
    userId,
    userEmail,
    userRole,
    isAuthReady,
    signOut: handleSignOut,
    refreshUserRole,
  };
};

