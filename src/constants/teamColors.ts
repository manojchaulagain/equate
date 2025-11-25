import { TeamColorKey } from "../types/player";

export interface TeamColorTheme {
  label: string;
  cardBg: string;
  cardBorder: string;
  headingText: string;
  statText: string;
  countText: string;
  badgeBg: string;
  badgeText: string;
  listBg: string;
  listBorder: string;
}

export const TEAM_COLOR_SEQUENCE: TeamColorKey[] = [
  "blue",
  "red",
  "emerald",
  "purple",
  "orange",
  "teal",
  "amber",
  "slate",
  "pink",
];

export const TEAM_COLOR_THEMES: Record<TeamColorKey, TeamColorTheme> = {
  blue: {
    label: "Blue",
    cardBg: "bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50",
    cardBorder: "border-blue-400",
    headingText: "bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent",
    statText: "bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent",
    countText: "text-blue-600",
    badgeBg: "bg-blue-500",
    badgeText: "text-white",
    listBg: "bg-gradient-to-r from-blue-100/80 to-cyan-100/80",
    listBorder: "border-blue-200",
  },
  red: {
    label: "Red",
    cardBg: "bg-gradient-to-br from-red-50 via-rose-50 to-pink-50",
    cardBorder: "border-red-400",
    headingText: "bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent",
    statText: "bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent",
    countText: "text-red-600",
    badgeBg: "bg-red-500",
    badgeText: "text-white",
    listBg: "bg-gradient-to-r from-red-100/80 to-rose-100/80",
    listBorder: "border-red-200",
  },
  emerald: {
    label: "Emerald",
    cardBg: "bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50",
    cardBorder: "border-emerald-400",
    headingText: "bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent",
    statText: "bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent",
    countText: "text-emerald-600",
    badgeBg: "bg-emerald-500",
    badgeText: "text-white",
    listBg: "bg-gradient-to-r from-emerald-100/80 to-teal-100/80",
    listBorder: "border-emerald-200",
  },
  purple: {
    label: "Purple",
    cardBg: "bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50",
    cardBorder: "border-purple-400",
    headingText: "bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent",
    statText: "bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent",
    countText: "text-purple-600",
    badgeBg: "bg-purple-500",
    badgeText: "text-white",
    listBg: "bg-gradient-to-r from-purple-100/80 to-pink-100/80",
    listBorder: "border-purple-200",
  },
  orange: {
    label: "Orange",
    cardBg: "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50",
    cardBorder: "border-orange-400",
    headingText: "bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent",
    statText: "bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent",
    countText: "text-orange-600",
    badgeBg: "bg-orange-500",
    badgeText: "text-white",
    listBg: "bg-gradient-to-r from-orange-100/80 to-amber-100/80",
    listBorder: "border-orange-200",
  },
  teal: {
    label: "Teal",
    cardBg: "bg-gradient-to-br from-cyan-50 via-teal-50 to-slate-50",
    cardBorder: "border-teal-400",
    headingText: "bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent",
    statText: "bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent",
    countText: "text-teal-600",
    badgeBg: "bg-teal-500",
    badgeText: "text-white",
    listBg: "bg-gradient-to-r from-teal-100/80 to-cyan-100/80",
    listBorder: "border-teal-200",
  },
  amber: {
    label: "Amber",
    cardBg: "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50",
    cardBorder: "border-amber-400",
    headingText: "bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent",
    statText: "bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent",
    countText: "text-amber-600",
    badgeBg: "bg-amber-500",
    badgeText: "text-white",
    listBg: "bg-gradient-to-r from-amber-100/80 to-yellow-100/80",
    listBorder: "border-amber-200",
  },
  slate: {
    label: "Slate",
    cardBg: "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50",
    cardBorder: "border-slate-400",
    headingText: "bg-gradient-to-r from-slate-600 to-gray-600 bg-clip-text text-transparent",
    statText: "bg-gradient-to-r from-slate-600 to-gray-600 bg-clip-text text-transparent",
    countText: "text-slate-600",
    badgeBg: "bg-slate-600",
    badgeText: "text-white",
    listBg: "bg-gradient-to-r from-slate-100/80 to-gray-100/80",
    listBorder: "border-slate-200",
  },
  pink: {
    label: "Pink",
    cardBg: "bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50",
    cardBorder: "border-pink-400",
    headingText: "bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent",
    statText: "bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent",
    countText: "text-pink-600",
    badgeBg: "bg-pink-500",
    badgeText: "text-white",
    listBg: "bg-gradient-to-r from-pink-100/80 to-rose-100/80",
    listBorder: "border-pink-200",
  },
};

export const getTeamColorTheme = (key: TeamColorKey = "blue") =>
  TEAM_COLOR_THEMES[key] ?? TEAM_COLOR_THEMES.blue;

export const getTeamColorLabel = (key: TeamColorKey = "blue") =>
  getTeamColorTheme(key).label;

