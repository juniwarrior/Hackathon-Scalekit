import type { AgentMemory, MemoryRecord, MemorySearchQuery } from "./types";
import { createMockMemory } from "./mock-memory";

interface ActianMemoryConfig {
  url: string;
  apiKey: string;
}

/**
 * Actian VectorAI DB adapter — the agent's long-term ("daily") memory.
 *
 * The agent recalls context from here (what's happening, preferences, past
 * weekly summaries) while live operational data still comes from the source
 * tools (Sheets, Gmail, Calendar, CRM). Best-effort REST against the local
 * VectorAI instance; if it's unreachable or the shape differs, it transparently
 * falls back to an in-process store so memory always works.
 */
export function createActianMemory(config: ActianMemoryConfig): AgentMemory {
  const fallback = createMockMemory();
  const base = config.url.replace(/\/$/, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
    "x-api-key": config.apiKey,
  };

  async function call(path: string, body: unknown): Promise<unknown | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${base}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  return {
    mode: "actian",
    async store(record) {
      const result = (await call("/v1/memory", record)) as MemoryRecord | null;
      if (result && result.id) return result;
      return fallback.store(record);
    },
    async search(query: MemorySearchQuery) {
      const result = await call("/v1/memory/search", query);
      if (Array.isArray(result)) return result as MemoryRecord[];
      if (result && Array.isArray((result as { results?: MemoryRecord[] }).results)) {
        return (result as { results: MemoryRecord[] }).results;
      }
      return fallback.search(query);
    },
  };
}
