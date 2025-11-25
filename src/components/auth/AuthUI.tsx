import React, { useState } from "react";
import { LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User,
} from "firebase/auth";

interface AuthUIProps {
  auth: any;
  onSignIn: (user: User) => void;
  error: string | null;
  setError: (msg: string | null) => void;
}

const AuthUI: React.FC<AuthUIProps> = ({ auth, onSignIn, error, setError }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (isSignUp) {
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setIsProcessing(true);

    try {
      let userCredential;
      if (isSignUp) {
        // Sign up
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      } else {
        // Sign in
        userCredential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      }

      // Success - onSignIn will be called automatically by auth state change
      // But we can also call it directly
      onSignIn(userCredential.user);

      // Reset form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Authentication error:", err); // eslint-disable-line no-console
      
      // Handle specific Firebase errors
      let errorMessage = "Authentication failed. Please try again.";
      
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please sign in instead.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      } else if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email. Please sign up first.";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gradient-to-br from-white via-indigo-50/50 to-purple-50/50 p-8 rounded-2xl shadow-2xl max-w-md mx-auto mt-10 space-y-5 border-2 border-indigo-100 backdrop-blur-sm"
    >
      <h2 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent pb-3 mb-4 flex items-center justify-center border-b-2 border-indigo-200">
        {isSignUp ? (
          <>
            <UserPlus className="mr-3 text-indigo-600" size={28} /> Sign Up
          </>
        ) : (
          <>
            <LogIn className="mr-3 text-indigo-600" size={28} /> Sign In
          </>
        )}
      </h2>
      
      <p className="text-sm text-slate-700 text-center font-medium bg-slate-100/50 px-4 py-2 rounded-lg">
        {isSignUp
          ? "Create a new account to get started"
          : "Enter your credentials to sign in"}
      </p>

      <div>
        <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-3.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/80 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-2">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder={isSignUp ? "At least 6 characters" : "Enter your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 pr-12 bg-white/80 shadow-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {isSignUp && (
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-700 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full p-3.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 pr-12 bg-white/80 shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700 rounded-xl text-sm font-semibold shadow-md">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isProcessing || email.trim().length === 0 || password.trim().length === 0 || (isSignUp && confirmPassword.trim().length === 0)}
        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:shadow-none flex items-center justify-center transform hover:scale-105 disabled:transform-none"
      >
        {isProcessing
          ? isSignUp
            ? "Creating Account..."
            : "Signing In..."
          : isSignUp
          ? "Sign Up"
          : "Sign In"}
      </button>

      <div className="text-center pt-4 border-t-2 border-indigo-200">
        <p className="text-sm text-slate-600 font-medium">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={toggleMode}
            className="text-indigo-600 hover:text-purple-600 font-bold bg-indigo-50 px-3 py-1 rounded-lg hover:bg-indigo-100 transition-all duration-200"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </form>
  );
};

export default AuthUI;
