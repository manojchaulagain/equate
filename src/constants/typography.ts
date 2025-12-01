/**
 * Typography Constants
 * 
 * This file defines consistent typography styles used throughout the application.
 * Use these classes to ensure consistent, elegant text styling across all components.
 */

export const Typography = {
  // Headings
  h1: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight",
  h2: "text-xl sm:text-2xl md:text-3xl font-bold tracking-tight",
  h3: "text-lg sm:text-xl md:text-2xl font-bold",
  h4: "text-base sm:text-lg font-semibold",
  
  // Body Text
  body: "text-sm sm:text-base font-normal",
  bodyLarge: "text-base sm:text-lg font-normal",
  bodySmall: "text-xs sm:text-sm font-normal",
  
  // Labels
  label: "text-xs sm:text-sm font-semibold",
  labelSmall: "text-xs font-semibold",
  
  // Helper/Description Text
  helper: "text-xs sm:text-sm font-medium text-slate-600",
  helperSmall: "text-xs font-medium text-slate-500",
  
  // Button Text
  button: "text-sm sm:text-base font-semibold",
  buttonSmall: "text-xs sm:text-sm font-semibold",
  
  // Badge/Status Text
  badge: "text-xs font-bold",
  
  // Colors
  colors: {
    primary: "text-slate-800",
    secondary: "text-slate-600",
    muted: "text-slate-500",
    inverse: "text-white",
    error: "text-red-700",
    success: "text-green-700",
    warning: "text-amber-700",
    info: "text-blue-700",
  },
  
  // Gradient Text Classes
  gradients: {
    amber: "bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 bg-clip-text text-transparent",
    indigo: "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent",
    blue: "bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent",
    purple: "bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent",
    green: "bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent",
  },
} as const;

export type TypographyKey = keyof typeof Typography;
export type TypographyColorKey = keyof typeof Typography.colors;
export type TypographyGradientKey = keyof typeof Typography.gradients;

