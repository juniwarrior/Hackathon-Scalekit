import { mockSession } from "./mock-auth";
import type { AuthSession } from "./types";

export function getMockSession(): AuthSession {
  return mockSession;
}
