export type UserRole = "admin" | "user";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}

