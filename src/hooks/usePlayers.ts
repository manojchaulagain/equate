import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { PlayerAvailability, Position, SkillLevel } from "../types/player";
import { POSITIONS } from "../constants/player";
import { FirestorePaths } from "../utils/firestorePaths";

declare const __app_id: string;

interface UsePlayersReturn {
  players: PlayerAvailability[];
  loading: boolean;
  availablePlayers: PlayerAvailability[];
  availableCount: number;
}

export const usePlayers = (db: any): UsePlayersReturn => {
  const [players, setPlayers] = useState<PlayerAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    setLoading(true);
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
            jerseyNumber: data.jerseyNumber !== undefined && data.jerseyNumber !== null ? Number(data.jerseyNumber) : undefined,
            userId: data.userId || undefined,
            registeredBy: data.registeredBy || undefined,
          } as PlayerAvailability;
        });

        setPlayers(loadedPlayers);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Listener Error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribeSnapshot();
  }, [db]);

  const availablePlayers = useMemo(
    () => players.filter((p) => p.isAvailable),
    [players]
  );

  const availableCount = useMemo(
    () => availablePlayers.length,
    [availablePlayers]
  );

  return {
    players,
    loading,
    availablePlayers,
    availableCount,
  };
};

