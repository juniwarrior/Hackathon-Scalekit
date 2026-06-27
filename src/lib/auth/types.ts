export type UserRole = "owner" | "manager" | "staff";

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  restaurantId: string;
  organizationId: string;
  permissions: string[];
}

export interface Restaurant {
  restaurantId: string;
  name: string;
  locations: string[];
  timezone: string;
  cuisineType: string;
}

export interface AuthSession {
  user: AuthUser;
  restaurant: Restaurant;
  authenticated: boolean;
}
