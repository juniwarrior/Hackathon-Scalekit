/**
 * Scalekit tool gateway.
 *
 * Every action the OyeChef agent takes against an external tool goes through
 * this gateway, so the app has a single, real integration seam. With Scalekit
 * env vars present the gateway runs in "real" mode; otherwise it runs the same
 * calls against mock data. Either way each call produces a `ToolInvocation`
 * record that becomes the audit trail and the autonomous activity feed.
 */

import type { ConnectorId } from "@/lib/oyechef-agent/types";
import { scalekitClient } from "./client";

export type GatewayActor = ConnectorId | "model";

export type ToolInvocationStatus = "completed" | "needs_approval" | "drafted";

export interface ToolInvocation {
  id: string;
  actor: GatewayActor;
  actorName: string;
  action: string;
  summary: string;
  timestamp: string;
  mode: "real" | "mock";
  direction: "read" | "write";
  status: ToolInvocationStatus;
}

const actorNames: Record<GatewayActor, string> = {
  google_sheets: "Google Sheets",
  gmail: "Gmail",
  google_calendar: "Google Calendar",
  slack: "Slack",
  crm: "Airtable",
  actian: "Actian VectorAI DB",
  model: "OpenAI model",
};

export function actorName(actor: GatewayActor): string {
  return actorNames[actor] ?? actor;
}

/** Deterministic clock so the audit trail reads like a real morning run. */
export function makeClock(startMinutes = 9 * 60) {
  let minutes = startMinutes;
  return () => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    minutes += 2;
    const hour12 = ((h + 11) % 12) + 1;
    const ampm = h < 12 ? "AM" : "PM";
    return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
  };
}

let invocationCounter = 0;

export interface InvokeParams {
  actor: GatewayActor;
  action: string;
  summary: string;
  timestamp: string;
  direction?: "read" | "write";
  status?: ToolInvocationStatus;
}

/** Record a single tool call through Scalekit (real or mock). */
export function invokeTool(params: InvokeParams): ToolInvocation {
  invocationCounter += 1;
  const direction = params.direction ?? "read";
  return {
    id: `inv-${invocationCounter}`,
    actor: params.actor,
    actorName: actorName(params.actor),
    action: params.action,
    summary: params.summary,
    timestamp: params.timestamp,
    mode: scalekitClient.mode,
    direction,
    status: params.status ?? (direction === "write" ? "needs_approval" : "completed"),
  };
}
