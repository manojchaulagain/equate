import React, { useState, useEffect } from "react";
import { Bell, X, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, Timestamp } from "firebase/firestore";

declare const __app_id: string;

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: Timestamp;
  createdBy: string;
  isCritical: boolean;
}

interface NotificationsProps {
  db: any;
  userId: string;
  userEmail: string;
  userRole: string;
  isActive?: boolean;
}

const Notifications: React.FC<NotificationsProps> = ({ db, userId, userEmail, userRole, isActive = false }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isCritical, setIsCritical] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const notificationsPath = `artifacts/${appId}/public/data/notifications`;
    const notificationsRef = collection(db, notificationsPath);
    const q = query(notificationsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notificationsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];
        setNotifications(notificationsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching notifications:", err);
        setError("Failed to load notifications.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim() || !db) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const notificationsPath = `artifacts/${appId}/public/data/notifications`;
      const notificationsRef = collection(db, notificationsPath);

      await addDoc(notificationsRef, {
        title: newTitle.trim(),
        message: newMessage.trim(),
        isCritical,
        createdAt: Timestamp.now(),
        createdBy: userId,
      });

      setNewTitle("");
      setNewMessage("");
      setIsCritical(false);
      setShowAddModal(false);
      setError(null);
    } catch (err: any) {
      console.error("Error creating notification:", err);
      setError("Failed to create notification. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!db) return;

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const notificationPath = `artifacts/${appId}/public/data/notifications/${notificationId}`;
      const notificationRef = doc(db, notificationPath);
      await deleteDoc(notificationRef);
    } catch (err: any) {
      console.error("Error deleting notification:", err);
      setError("Failed to delete notification.");
    }
  };

  const isAdmin = userRole === "admin";

  return (
    <div
      className={`relative overflow-hidden backdrop-blur-xl p-4 sm:p-6 rounded-b-3xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.15)] -mt-[1px] ${
        isActive
          ? "bg-gradient-to-br from-orange-50/95 via-red-50/95 to-orange-50/95 border-l-2 border-r-2 border-b-2 border-orange-500/70"
          : "bg-white/90 border border-white/70 border-t-0"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-orange-200/50 blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-red-200/50 blur-[80px]" />
      </div>
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-rose-600 bg-clip-text text-transparent pb-2 flex items-center gap-2">
              <Bell className="text-orange-600" size={24} />
              Notifications
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-2">
              {isAdmin ? "Create and manage critical notifications for all users." : "View important announcements from admins."}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-2xl hover:from-orange-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>New Notification</span>
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="text-center p-8">
            <p className="text-slate-600 font-medium">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-orange-50 rounded-2xl border-2 border-dashed border-orange-200">
            <Bell className="mx-auto text-orange-400 mb-3" size={48} />
            <p className="text-slate-600 font-medium">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 sm:p-5 rounded-2xl border-2 shadow-md ${
                  notification.isCritical
                    ? "bg-gradient-to-br from-red-50 to-orange-50 border-red-400"
                    : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {notification.isCritical && (
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <h3 className="text-base sm:text-lg font-bold text-slate-800">
                        {notification.title}
                      </h3>
                      {notification.isCritical && (
                        <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                          Critical
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-slate-500">
                      {notification.createdAt?.toDate().toLocaleString()}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110 flex-shrink-0"
                      title="Delete notification"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Notification Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-gradient-to-br from-slate-50/98 via-white/98 to-slate-50/98 backdrop-blur-xl w-[calc(100%-2rem)] max-w-full sm:max-w-2xl mx-4 my-4 sm:my-8 max-h-[90vh] sm:max-h-[85vh] rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.4)] border-2 border-orange-200/60 p-5 sm:p-6 md:p-8 relative overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
              {/* Decorative background elements */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-200/40 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-red-200/40 rounded-full blur-3xl"></div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewTitle("");
                  setNewMessage("");
                  setIsCritical(false);
                  setError(null);
                }}
                className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-white/95 backdrop-blur-sm border-2 border-slate-200/60 rounded-full shadow-lg hover:shadow-xl hover:bg-white hover:border-slate-300 transition-all duration-200 hover:scale-110 active:scale-95 group"
                type="button"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
              </button>

              <div className="relative z-10">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="text-orange-600" size={24} />
                Create Notification
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => {
                      setNewTitle(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter notification title"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-150"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter notification message"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-150 resize-none min-h-[120px]"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isCritical"
                    checked={isCritical}
                    onChange={(e) => setIsCritical(e.target.checked)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="isCritical" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Mark as Critical
                  </label>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewTitle("");
                      setNewMessage("");
                      setIsCritical(false);
                      setError(null);
                    }}
                    className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-all duration-200"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newTitle.trim() || !newMessage.trim() || isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:shadow-none"
                  >
                    {isSubmitting ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

