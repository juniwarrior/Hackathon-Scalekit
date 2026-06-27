import { mockLogin } from "./mock-auth";
import type { AuthSession } from "./types";

export async function loginWithScalekitSaasAuth(email: string): Promise<AuthSession> {
  if (!process.env.SCALEKIT_CLIENT_ID || !process.env.SCALEKIT_CLIENT_SECRET) {
    return mockLogin(email);
  }
  return mockLogin(email);
}
