import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { TeamResultsState } from "../types/player";
import { FirestorePaths } from "../utils/firestorePaths";

declare const __app_id: string;

interface UseTeamsReturn {
  teams: TeamResultsState | null;
  loading: boolean;
}

export const useTeams = (db: any): UseTeamsReturn => {
  const [teams, setTeams] = useState<TeamResultsState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    let isInitialLoad = true;
    setLoading(true);
    const teamsDocPath = FirestorePaths.teams();
    const teamsDocRef = doc(db, teamsDocPath);

    const unsubscribeTeams = onSnapshot(
      teamsDocRef,
      (snapshot) => {
        if (isInitialLoad) {
          isInitialLoad = false;
        }

        if (!snapshot.exists()) {
          setTeams((prev) => (prev === null ? prev : null));
          setLoading(false);
          return;
        }

        const data = snapshot.data() as Partial<TeamResultsState> & {
          teamA?: any;
          teamB?: any;
        };

        let newTeams: any[] | null = null;
        let newGeneratedAt: string | undefined = undefined;

        if (Array.isArray(data.teams)) {
          newTeams = data.teams;
          newGeneratedAt = data.generatedAt;
        } else if (data.teamA && data.teamB) {
          newTeams = [data.teamA, data.teamB];
          newGeneratedAt = data.generatedAt;
        }

        setTeams((prev) => {
          if (newTeams === null) {
            return prev === null ? prev : null;
          }

          if (prev && prev.teams.length === newTeams!.length && prev.generatedAt === newGeneratedAt) {
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
              
              if (prevTeam.players && newTeam.players) {
                const prevIds = prevTeam.players.map((p: any) => p?.id).filter(Boolean).sort().join(',');
                const newIds = newTeam.players.map((p: any) => p?.id).filter(Boolean).sort().join(',');
                if (prevIds !== newIds) {
                  return false;
                }
              }
              
              return true;
            });

            if (teamsUnchanged) {
              return prev;
            }
          }

          return {
            teams: newTeams,
            generatedAt: newGeneratedAt,
          };
        });

        setLoading(false);
      },
      (error) => {
        console.error("Firestore Teams Listener Error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribeTeams();
  }, [db]);

  return { teams, loading };
};

