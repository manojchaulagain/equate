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

// Three-way availability status
export type AvailabilityStatus = 'unavailable' | 'no_response' | 'available';

export interface Player {
  id: string;
  name: string;
  position: Position;
  skillLevel: SkillLevel;
  jerseyNumber?: number; // Jersey number for the player (0-99)
  isAvailable?: boolean; // Legacy boolean field for backwards compatibility
  availabilityStatus?: AvailabilityStatus; // New three-way status
  userId?: string; // User ID of the user who registered this player (for self-registration)
  registeredBy?: string; // User ID of the user who registered this player (for admin-added players)
}

export interface PlayerAvailability extends Player {
  isAvailable: boolean; // Computed from availabilityStatus for backwards compat
  availabilityStatus: AvailabilityStatus;
}

// Helper to convert legacy boolean to new status
export const booleanToAvailabilityStatus = (isAvailable: boolean | undefined): AvailabilityStatus => {
  if (isAvailable === true) return 'available';
  if (isAvailable === false) return 'unavailable';
  return 'no_response'; // Default to no response if undefined
};

// Helper to convert new status to legacy boolean (available = true, others = false)
export const availabilityStatusToBoolean = (status: AvailabilityStatus): boolean => {
  return status === 'available';
};

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

