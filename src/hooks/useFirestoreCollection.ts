/**
 * Custom hook for subscribing to Firestore collections
 * Provides a reusable pattern for real-time data fetching
 */

import { useState, useEffect } from "react";
import { collection, query, QueryConstraint, onSnapshot, Query } from "firebase/firestore";

interface UseFirestoreCollectionOptions<T> {
  db: any;
  collectionPath: string;
  queryConstraints?: QueryConstraint[];
  transform?: (data: any) => T;
  enabled?: boolean;
}

export function useFirestoreCollection<T = any>({
  db,
  collectionPath,
  queryConstraints = [],
  transform,
  enabled = true,
}: UseFirestoreCollectionOptions<T>): {
  data: T[];
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const collectionRef = collection(db, collectionPath);
    const q: Query = queryConstraints.length > 0
      ? query(collectionRef, ...queryConstraints)
      : collectionRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const items = snapshot.docs.map((doc) => {
            const item = { id: doc.id, ...doc.data() };
            return transform ? transform(item) : item;
          }) as T[];
          setData(items);
          setLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      },
      (err) => {
        console.error(`Error fetching collection ${collectionPath}:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, collectionPath, enabled, transform]);

  return { data, loading, error: error };
}

