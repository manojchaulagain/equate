import React, { useState, useEffect, useRef } from "react";
import { Bell, X, Heart, Star, CheckCircle } from "lucide-react";
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from "firebase/firestore";

declare const __app_id: string;

interface UserNotification {
  id: string;
  userId: string;
  type: "kudos" | "motm";
  message: string;
  fromUserEmail: string;
  relatedPlayerId?: string;
  relatedPlayerName?: string;
  createdAt: Timestamp | any;
  read: boolean;
}

interface UserNotificationsProps {
  db: any;
  userId: string;
}

const UserNotifications: React.FC<UserNotificationsProps> = ({ db, userId }) => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!db || !userId) return;

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const notificationsPath = `artifacts/${appId}/public/data/userNotifications`;
    const notificationsRef = collection(db, notificationsPath);
    const q = query(notificationsRef, where("userId", "==", userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notificationsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UserNotification[];

        const sortedNotifications = notificationsData.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds || 0) * 1000;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds || 0) * 1000;
          return bTime - aTime;
        });

        setNotifications(sortedNotifications);
        setUnreadCount(sortedNotifications.filter((n) => !n.read).length);
      },
      (err) => {
        console.error("Error fetching notifications:", err);
      }
    );

    return () => unsubscribe();
  }, [db, userId]);

  const markAsRead = async (notificationId: string) => {
    if (!db) return;

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const notificationPath = `artifacts/${appId}/public/data/userNotifications/${notificationId}`;
      const notificationRef = doc(db, notificationPath);
      await updateDoc(notificationRef, { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!db || unreadCount === 0) return;

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const unreadNotifications = notifications.filter((n) => !n.read);

      await Promise.all(
        unreadNotifications.map((notification) => {
          const notificationPath = `artifacts/${appId}/public/data/userNotifications/${notification.id}`;
          const notificationRef = doc(db, notificationPath);
          return updateDoc(notificationRef, { read: true });
        })
      );
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  // Calculate dropdown position when opening
  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popupWidth = Math.min(380, window.innerWidth - 16); // Max width with 8px margin on each side
      const rightEdge = window.innerWidth - rect.right;
      const leftEdge = rect.left;
      
      // Ensure popup stays within viewport
      // If there's not enough space on the right, position from left instead
      let right = rightEdge;
      if (rightEdge < 8) {
        right = window.innerWidth - leftEdge - popupWidth;
      }
      right = Math.max(8, Math.min(right, window.innerWidth - popupWidth - 8));
      
      // Check if popup would go below viewport
      const estimatedHeight = Math.min(500, window.innerHeight - 100); // Max height with some margin
      const spaceBelow = window.innerHeight - rect.bottom;
      let top = rect.bottom + 8;
      if (spaceBelow < estimatedHeight && rect.top > estimatedHeight) {
        // Position above button if not enough space below
        top = rect.top - estimatedHeight - 8;
      }
      
      setDropdownPosition({
        top: Math.max(8, top),
        right: right,
      });
    } else {
      setDropdownPosition(null);
    }
  }, [showDropdown]);

  const getFormattedDate = (timestamp: Timestamp | any) => {
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    return "N/A";
  };

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/20 transition-all duration-300 hover:scale-110 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-slate-900/50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-[95]"
            onClick={() => setShowDropdown(false)}
          />
          {dropdownPosition && (
            <div 
              className="fixed w-[320px] sm:w-[380px] max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border-2 border-slate-200 z-[100] overflow-hidden flex flex-col"
              style={{
                top: `${dropdownPosition.top}px`,
                right: `${dropdownPosition.right}px`,
                left: 'auto',
                maxHeight: `calc(100vh - ${dropdownPosition.top + 8}px)`,
              }}
            >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="mx-auto text-slate-400 mb-2" size={32} />
                  <p className="text-sm text-slate-600">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !notification.read ? "bg-blue-50/50" : ""
                      }`}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-xl flex-shrink-0 ${
                            notification.type === "kudos"
                              ? "bg-gradient-to-br from-pink-500 to-rose-600"
                              : "bg-gradient-to-br from-yellow-500 to-amber-600"
                          }`}
                        >
                          {notification.type === "kudos" ? (
                            <Heart className="text-white" size={18} />
                          ) : (
                            <Star className="text-white" size={18} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 mb-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-500">
                            {getFormattedDate(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserNotifications;

