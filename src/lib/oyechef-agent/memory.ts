import { createActianMemory } from "@/lib/memory/actian-memory";
import { createMockMemory } from "@/lib/memory/mock-memory";
import type { AgentMemory } from "@/lib/memory/types";

export function createOyeChefMemory(): AgentMemory {
  if (process.env.ACTIAN_VECTOR_URL && process.env.ACTIAN_VECTOR_API_KEY) {
    return createActianMemory({
      url: process.env.ACTIAN_VECTOR_URL,
      apiKey: process.env.ACTIAN_VECTOR_API_KEY,
    });
  }
  return createMockMemory();
}
