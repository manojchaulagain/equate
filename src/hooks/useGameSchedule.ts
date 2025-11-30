/**
 * Custom hook to fetch and subscribe to game schedule
 * Prevents duplicate fetching across components
 */

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { GameSchedule } from "../utils/gameSchedule";
import { FirestorePaths } from "../utils/firestorePaths";

export function useGameSchedule(db: any): GameSchedule | null {
  const [gameSchedule, setGameSchedule] = useState<GameSchedule | null>(null);

  useEffect(() => {
    if (!db) return;

    const schedulePath = FirestorePaths.gameSchedule();
    const scheduleRef = doc(db, schedulePath);

    const unsubscribe = onSnapshot(
      scheduleRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setGameSchedule(snapshot.data() as GameSchedule);
        } else {
          setGameSchedule(null);
        }
      },
      (err) => {
        console.error("Error fetching game schedule:", err);
        setGameSchedule(null);
      }
    );

    return () => unsubscribe();
  }, [db]);

  return gameSchedule;
}

