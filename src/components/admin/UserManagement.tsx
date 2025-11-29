import React, { useState, useEffect } from "react";
import { Users, Shield, User, Search, CheckCircle, Trash2, Edit2, X, Save } from "lucide-react";
import { doc, setDoc, collection, onSnapshot, deleteDoc, query, where, getDocs } from "firebase/firestore";
import { UserRole } from "../../types/user";

declare const __app_id: string;

interface UserData {
  id: string;
  email: string;
  role: UserRole;
  createdAt?: any;
  lastLogin?: any;
  playerName?: string;
}

interface UserManagementProps {
  db: any;
  currentUserId: string;
  onRoleUpdate: () => void;
  isActive?: boolean;
}

const UserManagement: React.FC<UserManagementProps> = ({
  db,
  currentUserId,
  onRoleUpdate,
  isActive = false,
}) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("user");
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch all users from Firestore
  useEffect(() => {
    if (!db) return;

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const usersPath = `artifacts/${appId}/public/data/users`;
    const usersRef = collection(db, usersPath);

    const unsubscribe = onSnapshot(
      usersRef,
      async (snapshot) => {
        const usersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UserData[];

        // Fetch player names for each user
        const playersPath = `artifacts/${appId}/public/data/soccer_players`;
        const playersRef = collection(db, playersPath);
        
        try {
          const playersSnapshot = await getDocs(playersRef);
          const playersMap = new Map<string, string>();
          
          playersSnapshot.docs.forEach((playerDoc) => {
            const playerData = playerDoc.data();
            if (playerData.userId) {
              playersMap.set(playerData.userId, playerData.name);
            }
          });

          // Add player names to users
          const usersWithNames = usersData.map((user) => ({
            ...user,
            playerName: playersMap.get(user.id) || undefined,
          }));

          setUsers(usersWithNames);
          setLoading(false);
        } catch (err) {
          console.error("Error fetching player names:", err);
          setUsers(usersData);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error fetching users:", err);
        setError("Failed to load users.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db]);

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!db) {
      setError("Database connection not ready.");
      return;
    }

    setUpdatingUserId(userId);
    setError(null);
    setSuccess(null);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const userDocPath = `artifacts/${appId}/public/data/users/${userId}`;
      const userDocRef = doc(db, userDocPath);
      
      await setDoc(
        userDocRef,
        {
          email: users.find((u) => u.id === userId)?.email || "",
          role: newRole,
        },
        { merge: true }
      );

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      setSuccess(`User role updated to ${newRole}`);
      onRoleUpdate(); // Notify parent to refresh role

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error updating user role:", err);
      setError(`Failed to update role: ${err.message}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const addUserByEmail = async (email: string) => {
    if (!db || !email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      // In a real app, you'd need to get the user's UID from their email
      // For now, we'll use a simplified approach where admins can set roles
      // by providing the user's email (which maps to their Firebase Auth UID)
      
      // This is a placeholder - in production, you'd want to:
      // 1. Look up the user by email in Firebase Auth
      // 2. Get their UID
      // 3. Create/update their role document
      
      setError("To set a user's role, you need their User ID. Please use the manual method below.");
    } catch (err: any) {
      console.error("Error adding user:", err);
      setError(`Failed to add user: ${err.message}`);
    }
  };

  const handleEditClick = (user: UserData) => {
    setEditingUserId(user.id);
    setEditEmail(user.email);
    setEditRole(user.role);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditEmail("");
    setEditRole("user");
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!db || !editingUserId) return;

    if (!editEmail.trim()) {
      setError("Email cannot be empty.");
      return;
    }

    setUpdatingUserId(editingUserId);
    setError(null);
    setSuccess(null);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const userDocPath = `artifacts/${appId}/public/data/users/${editingUserId}`;
      const userDocRef = doc(db, userDocPath);
      
      await setDoc(
        userDocRef,
        {
          email: editEmail.trim(),
          role: editRole,
        },
        { merge: true }
      );

      setSuccess(`User details updated successfully`);
      setEditingUserId(null);
      onRoleUpdate();

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error updating user:", err);
      setError(`Failed to update user: ${err.message}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteClick = (user: UserData) => {
    setUserToDelete(user);
    setError(null);
  };

  const handleConfirmDelete = async () => {
    if (!db || !userToDelete) return;

    setDeletingUserId(userToDelete.id);
    setError(null);
    setSuccess(null);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      
      // Delete associated players (where userId matches or registeredBy matches)
      const playersPath = `artifacts/${appId}/public/data/soccer_players`;
      const playersRef = collection(db, playersPath);
      
      // Query players where userId matches
      const q1 = query(playersRef, where("userId", "==", userToDelete.id));
      const snapshot1 = await getDocs(q1);
      const deletePromises1 = snapshot1.docs.map((doc) => deleteDoc(doc.ref));
      
      // Query players where registeredBy matches
      const q2 = query(playersRef, where("registeredBy", "==", userToDelete.id));
      const snapshot2 = await getDocs(q2);
      const deletePromises2 = snapshot2.docs.map((doc) => deleteDoc(doc.ref));
      
      // Delete all associated players
      await Promise.all([...deletePromises1, ...deletePromises2]);
      
      // Delete user document
      const userDocPath = `artifacts/${appId}/public/data/users/${userToDelete.id}`;
      const userDocRef = doc(db, userDocPath);
      await deleteDoc(userDocRef);

      setSuccess(`User ${userToDelete.email} and associated players deleted successfully`);
      setUserToDelete(null);
      onRoleUpdate();

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error deleting user:", err);
      setError(`Failed to delete user: ${err.message}`);
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <div className={`relative overflow-hidden backdrop-blur-xl p-6 sm:p-8 rounded-b-2xl rounded-t-none shadow-[0_20px_60px_rgba(15,23,42,0.18)] -mt-[1px] ${
      isActive 
        ? "bg-gradient-to-br from-purple-50/95 via-pink-50/95 to-purple-50/95 border-l-2 border-r-2 border-b-2 border-purple-500/70" 
        : "bg-white/90 border border-white/70 border-t-0"
    }`}>
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-10 right-0 w-56 h-56 bg-purple-200/60 blur-[110px]" />
        <div className="absolute bottom-0 left-4 w-64 h-64 bg-pink-200/50 blur-[120px]" />
      </div>
      <div className="relative z-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent border-b-2 border-purple-200 pb-3 flex items-center">
          <Shield className="mr-3 text-purple-600" size={28} /> User Management
        </h2>
        {users.length > 0 && (
          <div className="text-sm font-semibold text-slate-600 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200">
            Total Users: {users.length}
          </div>
        )}
      </div>

      <div className="mb-6 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl shadow-md">
        <p className="text-sm text-blue-800 font-medium mb-2">
          User Management:
        </p>
        <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>View all users who have signed in to the app</li>
          <li>Edit user email and role directly from the user list</li>
          <li>Toggle admin status using the "Make Admin" / "Remove Admin" button</li>
          <li>Delete users (this will also delete all associated players)</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          User documents are automatically created when users sign in for the first time.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-2xl text-sm font-semibold shadow-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 text-emerald-700 rounded-2xl text-sm font-semibold flex items-center shadow-md">
          <CheckCircle className="mr-2" size={18} />
          {success}
        </div>
      )}

      {/* Users List */}
      {users.length > 0 && (
        <>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="w-full pl-12 p-3.5 border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/80 shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 bg-gradient-to-r from-white to-slate-50 rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-all duration-200"
              >
                {editingUserId === user.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => {
                          setEditEmail(e.target.value);
                          setError(null);
                        }}
                        className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                        disabled={updatingUserId === user.id}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Role
                      </label>
                      <select
                        value={editRole}
                        onChange={(e) => {
                          setEditRole(e.target.value as UserRole);
                          setError(null);
                        }}
                        className="w-full p-3 border-2 border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                        disabled={updatingUserId === user.id}
                      >
                        <option value="user">Regular User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={updatingUserId === user.id}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:shadow-none flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={updatingUserId === user.id}
                        className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-all duration-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      {user.role === "admin" ? (
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-md flex-shrink-0">
                          <Shield className="text-white" size={20} />
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-200 rounded-xl flex-shrink-0">
                          <User className="text-slate-600" size={20} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-base sm:text-lg truncate">
                          {user.playerName || user.email}
                        </p>
                        <p className="text-xs text-slate-500 font-medium break-words">
                          {user.playerName && <span className="break-all">{user.email}</span>}
                          {user.playerName && (user.lastLogin || !user.lastLogin) && <span> • </span>}
                          {user.lastLogin && (
                            <span>
                              Last login: {user.lastLogin.toDate ? user.lastLogin.toDate().toLocaleDateString() : (user.lastLogin.seconds ? new Date(user.lastLogin.seconds * 1000).toLocaleDateString() : "Never")}
                            </span>
                          )}
                          {!user.lastLogin && <span>Last login: Never</span>}
                        </p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">ID: {user.id}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:space-x-2 sm:flex-nowrap">
                      <span
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold shadow-md whitespace-nowrap ${
                          user.role === "admin"
                            ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {user.role}
                      </span>
                      {user.id !== currentUserId && (
                        <>
                          <button
                            onClick={() => handleEditClick(user)}
                            className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110 flex-shrink-0"
                            title="Edit user"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="p-2 bg-gradient-to-br from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110 flex-shrink-0"
                            title="Delete user"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={() =>
                              updateUserRole(
                                user.id,
                                user.role === "admin" ? "user" : "admin"
                              )
                            }
                            disabled={updatingUserId === user.id}
                            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-400 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none whitespace-nowrap flex-shrink-0"
                          >
                            {updatingUserId === user.id
                              ? "Updating..."
                              : user.role === "admin"
                              ? "Remove Admin"
                              : "Make Admin"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {users.length === 0 && !loading && (
        <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-gray-100 rounded-2xl border-2 border-dashed border-slate-300">
          <Users className="mx-auto mb-3 text-slate-400" size={40} />
          <p className="text-slate-600 font-semibold mb-2">No users found in the database.</p>
          <p className="text-xs text-slate-500">User documents are automatically created when users sign in. If you don't see any users, they may not have signed in yet.</p>
        </div>
      )}

      {loading && (
        <div className="text-center p-8 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl border border-purple-200">
          <p className="text-purple-700 font-bold text-lg">Loading users...</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-50/95 via-white/95 to-slate-50/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.3)] border-2 border-red-200/60 max-w-md w-full p-5 sm:p-6 md:p-7 relative my-auto animate-in slide-in-from-bottom-4 duration-300">
            {/* Decorative background elements */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-red-200/30 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-rose-200/30 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Delete User?
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 mb-2 pl-1">
                Are you sure you want to delete <span className="font-semibold text-slate-800">{userToDelete.email}</span>?
              </p>
              <p className="text-xs sm:text-sm text-red-600 mb-6 font-semibold pl-1 bg-red-50/50 p-3 rounded-xl border border-red-200">
                ⚠️ This will also delete all players associated with this user (players registered by them and their own player profile). This action cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="px-5 py-2.5 bg-slate-200/80 text-slate-800 font-semibold rounded-xl hover:bg-slate-300 transition-all duration-200 hover:scale-105 active:scale-95"
                  disabled={deletingUserId === userToDelete.id}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deletingUserId === userToDelete.id}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:shadow-none flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95"
                >
                  {deletingUserId === userToDelete.id ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>Delete User</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );

};

export default UserManagement;

