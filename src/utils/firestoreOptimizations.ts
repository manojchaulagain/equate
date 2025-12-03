/**
 * Firestore query optimizations
 */

import { collection, query, where, getDocs, QueryConstraint } from "firebase/firestore";

/**
 * Optimized query with caching to reduce Firestore reads
 */
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export async function cachedQuery(
  db: any,
  collectionPath: string,
  constraints: QueryConstraint[] = [],
  cacheKey?: string
): Promise<any[]> {
  const key = cacheKey || `${collectionPath}_${JSON.stringify(constraints)}`;
  const cached = queryCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const collectionRef = collection(db, collectionPath);
  const q = query(collectionRef, ...constraints);
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  queryCache.set(key, { data, timestamp: Date.now() });
  return data;
}

/**
 * Clear query cache (useful after mutations)
 */
export function clearQueryCache(pattern?: string) {
  if (pattern) {
    const keys = Array.from(queryCache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    queryCache.clear();
  }
}

/**
 * Batch check player names to reduce Firestore reads
 */
export async function batchCheckPlayerNames(
  db: any,
  names: string[],
  appId: string
): Promise<Set<string>> {
  const existingNames = new Set<string>();
  
  if (names.length === 0) return existingNames;

  try {
    const playersCollectionPath = `artifacts/${appId}/public/data/soccer_players`;
    const playersColRef = collection(db, playersCollectionPath);
    const snapshot = await getDocs(playersColRef);
    
    const allNames = snapshot.docs.map(doc => 
      doc.data().name?.toLowerCase().trim() || ""
    );
    
    names.forEach(name => {
      const normalized = name.toLowerCase().trim();
      if (allNames.includes(normalized)) {
        existingNames.add(name);
      }
    });
  } catch (error) {
    console.error("Error batch checking player names:", error);
  }
  
  return existingNames;
}

