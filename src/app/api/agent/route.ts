import { NextResponse } from "next/server";
import { routeAgentMessage } from "@/lib/oyechef-agent/agent";
import { callModel, getModelStatus } from "@/lib/oyechef-agent/model";
import { createOyeChefMemory } from "@/lib/oyechef-agent/memory";
import {
  getConnectedConnectorIds,
  isScalekitLive,
  readClients,
  readInventory,
  readReservations,
  type LiveRead,
} from "@/lib/scalekit/live";
import type { ConnectorId } from "@/lib/oyechef-agent/types";
import type { WeeklyPlan } from "@/lib/oyechef-agent/types";

/**
 * Chat endpoint. The deterministic router produces the data + card; the core
 * model (gpt-5.5) turns it into a natural answer. Memory questions are recalled
 * from Actian VectorAI (the agent's memory tool). Falls back to deterministic
 * text if the model is not configured or a call fails.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { question?: string; plan?: WeeklyPlan } | null;
  const question = body?.question?.trim();
  const plan = body?.plan;
  if (!question || !plan) {
    return NextResponse.json({ error: "question and plan are required" }, { status: 400 });
  }

  const routed = routeAgentMessage(plan, question);

  // Live reads: when the relevant connector is authorized, retrieve from the
  // real app (Calendar / Sheets / Airtable) instead of the mock plan.
  let liveLines: string[] = [];
  if (isScalekitLive() && routed.card) {
    const connected = new Set<ConnectorId>(await getConnectedConnectorIds());
    const tool = routed.card.tool;
    let live: LiveRead | null = null;
    if (tool === "reservations" && connected.has("google_calendar")) live = await readReservations();
    else if (tool === "inventory" && connected.has("google_sheets")) live = await readInventory();
    else if (tool === "clients" && connected.has("crm")) live = await readClients();
    if (live) {
      liveLines = live.items;
      routed.card = {
        tool: routed.card.tool,
        kind: "list",
        title: `${routed.card.title} (live)`,
        subtitle: `${live.count} records · live from ${live.source}`,
        toolLabel: live.source,
        items: live.items,
        footnote: `Retrieved live from ${live.source} via Scalekit.`,
      };
    }
  }

  // Memory tool: recall from Actian VectorAI (agent memory), not the live sources.
  let memoryLines: string[] = [];
  if (routed.card?.tool === "memory") {
    const memory = createOyeChefMemory();
    const keyword = await memory.search({ restaurantId: "rest-demo", query: question, limit: 6 });
    const recent = keyword.length ? keyword : await memory.search({ restaurantId: "rest-demo", query: "", limit: 6 });
    if (recent.length) {
      memoryLines = recent.map((m) => m.text);
      routed.card = { ...routed.card, items: memoryLines, subtitle: `${recent.length} memories · ${memory.mode}` };
    }
  }

  const context = [
    `Week: ${plan.weekLabel}`,
    `Reservations ${plan.summary.reservationCount}, guests ${plan.summary.expectedGuests}, revenue $${plan.summary.expectedRevenue}, occupancy ${plan.summary.occupancyPercentage}%, purchase orders ${plan.summary.purchaseOrderCount}, ${plan.summary.waitersCount} waiters / ${plan.summary.cooksCount} cooks.`,
    `Relevant data for this question: ${routed.text}`,
    liveLines.length ? `LIVE data retrieved from the connected app:\n- ${liveLines.join("\n- ")}` : "",
    memoryLines.length ? `Agent memory (Actian):\n- ${memoryLines.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const modelText = await callModel(
    "You are OyeChef, an AI restaurant operations planner. Answer the manager's question in 1-3 concise sentences using ONLY the provided data and agent memory. Never invent numbers.",
    `Question: ${question}\n\n${context}`,
  );

  return NextResponse.json({
    text: modelText ?? routed.text,
    card: routed.card ?? null,
    model: getModelStatus(),
    usedModel: Boolean(modelText),
  });
}
