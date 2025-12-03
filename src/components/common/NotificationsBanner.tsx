import React, { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { FirestorePaths } from "../../utils/firestorePaths";

interface NotificationsBannerProps {
  db: any;
}

const NotificationsBanner: React.FC<NotificationsBannerProps> = React.memo(({ db }) => {
  const [criticalNotifications, setCriticalNotifications] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const dismissedIdsRef = useRef<string[]>([]);
  
  useEffect(() => {
    dismissedIdsRef.current = dismissedIds;
  }, [dismissedIds]);

  useEffect(() => {
    if (!db) return;

    const notificationsPath = FirestorePaths.notifications();
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
          .filter((n: any) => n.isCritical && !dismissedIdsRef.current.includes(n.id));
        setCriticalNotifications(notifications.slice(0, 3));
      },
      (err) => {
        console.error("Error fetching notifications:", err);
      }
    );

    return () => unsubscribe();
  }, [db]);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  return (
    <div 
      className="max-w-5xl mx-auto px-2 sm:px-3 md:px-4 space-y-2"
      style={{ 
        minHeight: criticalNotifications.length === 0 ? '0px' : 'auto',
        contain: 'layout style paint'
      }}
    >
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
});

NotificationsBanner.displayName = "NotificationsBanner";

export default NotificationsBanner;

