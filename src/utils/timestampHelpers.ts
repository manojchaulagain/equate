/**
 * Utility functions for handling Firestore Timestamps
 * Centralizes date/time conversion logic
 */

import { Timestamp } from "firebase/firestore";

/**
 * Convert a Firestore timestamp to a JavaScript Date
 */
export function timestampToDate(timestamp: Timestamp | any): Date | null {
  if (!timestamp) return null;
  
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  }
  
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  
  return null;
}

/**
 * Get formatted date string from timestamp
 */
export function getFormattedDate(timestamp: Timestamp | any): string {
  const date = timestampToDate(timestamp);
  if (!date) return "N/A";
  
  return date.toLocaleString();
}

/**
 * Get timestamp in milliseconds for sorting
 */
export function getTimestampMs(timestamp: Timestamp | any): number {
  if (!timestamp) return 0;
  
  if (timestamp.toMillis && typeof timestamp.toMillis === "function") {
    return timestamp.toMillis();
  }
  
  if (timestamp.seconds) {
    return timestamp.seconds * 1000;
  }
  
  return 0;
}

/**
 * Sort array by timestamp (descending - newest first)
 */
export function sortByTimestamp<T extends { createdAt?: Timestamp | any }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const aTime = getTimestampMs(a.createdAt);
    const bTime = getTimestampMs(b.createdAt);
    return bTime - aTime;
  });
}

