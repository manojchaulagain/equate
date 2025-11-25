export type Position =
  | "GK"
  | "LB"
  | "RB"
  | "CB"
  | "CDM"
  | "CM"
  | "CAM"
  | "ST"
  | "LW"
  | "RW";

export type SkillLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Player {
  id: string;
  name: string;
  position: Position;
  skillLevel: SkillLevel;
  isAvailable?: boolean;
}

export interface PlayerAvailability extends Player {
  isAvailable: boolean;
}

export type TeamColorKey =
  | "blue"
  | "red"
  | "emerald"
  | "purple"
  | "orange"
  | "teal"
  | "amber"
  | "slate"
  | "pink";

export interface Team {
  name: string;
  players: PlayerAvailability[];
  totalSkill: number;
  colorKey?: TeamColorKey;
}

export interface TeamResultsState {
  teams: Team[];
  generatedAt?: string;
}

