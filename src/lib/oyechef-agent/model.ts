/**
 * OyeChef model client.
 *
 * The core LLM for the multi-agent weekly report. It targets an OpenAI-compatible
 * Responses API (Azure AI Foundry by default, via the OYECHEF_MODEL_* env vars),
 * and falls back to standard OpenAI if only OPENAI_API_KEY is set. The planner is
 * deterministic and works with no keys at all — the model only enriches the
 * written report, so the demo never breaks if a call fails. Server-only.
 */

export interface ModelStatus {
  provider: string;
  connected: boolean;
  mode: "real" | "mock";
  model: string;
}

interface ModelConfig {
  url: string;
  key: string;
  model: string;
  provider: string;
  /** "responses" (Azure AI Foundry / OpenAI Responses API) or "chat" (chat/completions). */
  shape: "responses" | "chat";
}

function resolveConfig(): ModelConfig | null {
  const url = process.env.OYECHEF_MODEL_URL;
  const key = process.env.OYECHEF_MODEL_KEY;
  const model = process.env.OYECHEF_MODEL_NAME;
  if (url && key && model) {
    return {
      url,
      key,
      model,
      provider: "azure-ai-foundry",
      shape: url.includes("/responses") ? "responses" : "chat",
    };
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      key: openaiKey,
      model: process.env.OYECHEF_MODEL_NAME || "gpt-4o-mini",
      provider: "openai",
      shape: "chat",
    };
  }
  return null;
}

export function getModelStatus(): ModelStatus {
  const config = resolveConfig();
  return {
    provider: config?.provider ?? "none",
    connected: Boolean(config),
    mode: config ? "real" : "mock",
    model: config?.model ?? "deterministic",
  };
}

/**
 * Single model call. Returns the text output, or null on any error / no config,
 * so callers always have a deterministic fallback.
 */
export async function callModel(system: string, user: string): Promise<string | null> {
  const config = resolveConfig();
  if (!config) return null;

  // Azure AI Foundry's OpenAI-compatible surface accepts both api-key and Bearer.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "api-key": config.key,
    Authorization: `Bearer ${config.key}`,
  };

  try {
    if (config.shape === "responses") {
      const response = await fetch(config.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.model,
          input: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!response.ok) return null;
      const data = (await response.json()) as ResponsesPayload;
      return extractResponsesText(data);
    }

    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as ChatPayload;
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

/** Optionally enhance a written summary. Returns null with no model configured. */
export async function enhanceSummary(prompt: string, context: string): Promise<string | null> {
  return callModel(
    "You are OyeChef, an AI restaurant operations planner. Rewrite the planner's summary in 2-3 crisp sentences for a restaurant manager. Never invent numbers; only use the provided context.",
    `${prompt}\n\nContext:\n${context}`,
  );
}

/* ---- Response parsing for the Responses API ---- */

interface ResponsesPayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

interface ChatPayload {
  choices?: Array<{ message?: { content?: string } }>;
}

function extractResponsesText(data: ResponsesPayload): string | null {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const parts = data.output
    ?.flatMap((item) => item.content ?? [])
    .map((chunk) => chunk.text ?? "")
    .filter(Boolean);
  const joined = parts?.join("\n").trim();
  return joined && joined.length ? joined : null;
}
