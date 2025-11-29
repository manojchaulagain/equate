import React, { useState, useEffect } from "react";
import { Users, Shield, User, Search, CheckCircle } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { UserRole } from "../../types/user";

declare const __app_id: string;

interface UserData {
  id: string;
  email: string;
  role: UserRole;
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch all users from Firestore
  useEffect(() => {
    if (!db) return;

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        // Note: This requires a collection of users or we need to query by email
        // For now, we'll create a helper to search by email or manage known users
        // Since Firestore doesn't have a direct way to list all authenticated users,
        // we'll need to maintain a users collection or search by email
        
        // For this implementation, we'll show a form to add/manage users by email
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError(`Failed to fetch users: ${err.message}`);
        setLoading(false);
      }
    };

    fetchUsers();
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
      <h2 className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent border-b-2 border-purple-200 pb-3 mb-6 flex items-center">
        <Shield className="mr-3 text-purple-600" size={28} /> User Role Management
      </h2>

      <div className="mb-6 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl shadow-md">
        <p className="text-sm text-blue-800 font-medium mb-2">
          How to set user roles:
        </p>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>Get the user's User ID from Firebase Authentication</li>
          <li>Use the form below to set their role</li>
          <li>Or manually create a document in Firestore at:</li>
        </ol>
        <code className="block mt-2 p-2 bg-blue-100 rounded text-xs text-blue-900">
          artifacts/{"{appId}"}/public/data/users/{"{userId}"}
        </code>
        <p className="text-xs text-blue-600 mt-2">
          With fields: <code className="bg-blue-100 px-1 rounded">email</code> and{" "}
          <code className="bg-blue-100 px-1 rounded">role</code> (value: "admin" or "user")
        </p>
      </div>

      {/* Add User by User ID Form */}
      <div className="mb-6 p-5 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl border-2 border-slate-300 shadow-md">
        <h3 className="text-xl font-bold text-slate-800 mb-4">
          Set Role by User ID
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const userId = formData.get("userId") as string;
            const email = formData.get("email") as string;
            const role = formData.get("role") as UserRole;

            if (userId && email && role) {
              handleSetUserRole(userId, email, role);
            }
          }}
          className="space-y-3"
        >
          <input
            type="text"
            name="userId"
            placeholder="Firebase User ID (UID)"
            required
            className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/80 shadow-sm"
          />
          <input
            type="email"
            name="email"
            placeholder="User Email"
            required
            className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/80 shadow-sm"
          />
          <select
            name="role"
            required
            className="w-full p-3 border-2 border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm"
          >
            <option value="user">Regular User</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Set User Role
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold shadow-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 text-emerald-700 rounded-xl text-sm font-semibold flex items-center shadow-md">
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
                className="w-full pl-12 p-3.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/80 shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-slate-50 rounded-xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-center space-x-4">
                  {user.role === "admin" ? (
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md">
                      <Shield className="text-white" size={24} />
                    </div>
                  ) : (
                    <div className="p-2 bg-slate-200 rounded-lg">
                      <User className="text-slate-600" size={24} />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{user.email}</p>
                    <p className="text-xs text-slate-500 font-medium">ID: {user.id}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-4 py-2 rounded-full text-xs font-bold shadow-md ${
                      user.role === "admin"
                        ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {user.role}
                  </span>
                  {user.id !== currentUserId && (
                    <button
                      onClick={() =>
                        updateUserRole(
                          user.id,
                          user.role === "admin" ? "user" : "admin"
                        )
                      }
                      disabled={updatingUserId === user.id}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-400 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                    >
                      {updatingUserId === user.id
                        ? "Updating..."
                        : user.role === "admin"
                        ? "Remove Admin"
                        : "Make Admin"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {users.length === 0 && !loading && (
        <div className="text-center p-8 bg-gradient-to-br from-slate-100 to-gray-100 rounded-xl border-2 border-dashed border-slate-300">
          <Users className="mx-auto mb-3 text-slate-400" size={40} />
          <p className="text-slate-600 font-semibold">No users found. Use the form above to set user roles.</p>
        </div>
      )}

      {loading && (
        <div className="text-center p-8 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border border-purple-200">
          <p className="text-purple-700 font-bold text-lg">Loading users...</p>
        </div>
      )}
      </div>
    </div>
  );

  async function handleSetUserRole(userId: string, email: string, role: UserRole) {
    if (!db) {
      setError("Database connection not ready.");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const userDocPath = `artifacts/${appId}/public/data/users/${userId}`;
      const userDocRef = doc(db, userDocPath);

      await setDoc(
        userDocRef,
        {
          email: email,
          role: role,
        },
        { merge: true }
      );

      // Add to local state if not already present
      setUsers((prev) => {
        const existing = prev.find((u) => u.id === userId);
        if (existing) {
          return prev.map((u) => (u.id === userId ? { ...u, email, role } : u));
        }
        return [...prev, { id: userId, email, role }];
      });

      setSuccess(`User role set to ${role} for ${email}`);
      onRoleUpdate();

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error setting user role:", err);
      setError(`Failed to set role: ${err.message}`);
    }
  }
};

export default UserManagement;

