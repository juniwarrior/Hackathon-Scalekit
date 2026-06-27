import type { AuthSession } from "./types";

export const mockSession: AuthSession = {
  authenticated: true,
  user: {
    userId: "user-demo-owner",
    name: "Ivar Guerrero",
    email: "manager@oyechef.demo",
    role: "owner",
    restaurantId: "rest-demo",
    organizationId: "org-demo",
    permissions: ["plan:read", "plan:write", "connectors:manage", "approval:manage"],
  },
  restaurant: {
    restaurantId: "rest-demo",
    name: "OyeChef Bistro",
    locations: ["Downtown"],
    timezone: "America/Los_Angeles",
    cuisineType: "Modern Latin Bistro",
  },
};

export async function mockLogin(email: string): Promise<AuthSession> {
  return {
    ...mockSession,
    user: {
      ...mockSession.user,
      email: email || mockSession.user.email,
    },
  };
}
