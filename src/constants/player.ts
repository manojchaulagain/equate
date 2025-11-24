import { Position, SkillLevel } from "../types/player";

export const POSITIONS: Position[] = [
  "GK",
  "LB",
  "RB",
  "CB",
  "CDM",
  "CM",
  "CAM",
  "ST",
  "LW",
  "RW",
];

export const POSITION_LABELS: Record<Position, string> = {
  GK: "Goalkeeper",
  LB: "Left Back",
  RB: "Right Back",
  CB: "Center Back",
  CDM: "Center Defensive Midfielder",
  CM: "Center Midfielder",
  CAM: "Center Attacking Midfielder",
  ST: "Striker",
  LW: "Left Winger",
  RW: "Right Winger",
};

export const SKILL_LABELS: Record<SkillLevel, string> = {
  1: "Newbie",
  2: "Rookie",
  3: "Beginner",
  4: "Intermediate",
  5: "Average",
  6: "Solid",
  7: "Advanced",
  8: "Veteran",
  9: "Elite",
  10: "Legend",
};

