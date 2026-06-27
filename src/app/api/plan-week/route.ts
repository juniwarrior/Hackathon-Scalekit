import { NextResponse } from "next/server";
import { weeklyPlanRequestSchema } from "@/lib/oyechef-agent/planner";
import { planWeekAutonomously } from "@/lib/oyechef-agent/orchestrator";
import { getModelStatus } from "@/lib/oyechef-agent/model";
import { runWeeklyReportAgents } from "@/lib/oyechef-agent/multi-agent";
import { createOyeChefMemory } from "@/lib/oyechef-agent/memory";
import {
  getConnectedConnectorIds,
  isScalekitLive,
  readClients,
  readInventory,
  readReservations,
} from "@/lib/scalekit/live";
import type { ConnectorId } from "@/lib/oyechef-agent/types";
import { getCurrentDemoDataSet, makeRestaurantDataSet } from "@/lib/oyechef-agent/mock-data";

export async function POST(request: Request) {
  const payload = weeklyPlanRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const data = payload.data.weekLabel
    ? makeRestaurantDataSet(payload.data.weekLabel, "2026-06-29", 4)
    : getCurrentDemoDataSet();

  // Autonomous run: tool calls flow through the Scalekit gateway.
  const { plan, invocations } = planWeekAutonomously(data);

  // Live counts: read the real apps and reflect them in the activity + KPIs.
  const live: { reservations: number | null; inventory: number | null; clients: number | null } = {
    reservations: null,
    inventory: null,
    clients: null,
  };
  if (isScalekitLive()) {
    const connected = new Set<ConnectorId>(await getConnectedConnectorIds());
    const [resv, inv, cli] = await Promise.all([
      connected.has("google_calendar") ? readReservations() : Promise.resolve(null),
      connected.has("google_sheets") ? readInventory() : Promise.resolve(null),
      connected.has("crm") ? readClients() : Promise.resolve(null),
    ]);
    for (const item of invocations) {
      if (item.action === "readInventory" && inv) item.summary = `Read ${inv.count} inventory rows from Google Sheets (live).`;
      if (item.action === "checkAvailability" && resv) item.summary = `Read ${resv.count} reservations from Google Calendar (live).`;
      if (item.action === "matchCustomers" && cli) item.summary = `Matched ${cli.count} client records from Airtable (live).`;
    }
    if (resv) plan.summary.reservationCount = resv.count;
    live.reservations = resv?.count ?? null;
    live.inventory = inv?.count ?? null;
    live.clients = cli?.count ?? null;
  }

  // Multi-agent weekly report through the core model (deterministic fallback).
  const narrative = await runWeeklyReportAgents(plan);

  // Persist this week's summary to the agent's Actian memory.
  const memory = createOyeChefMemory();
  await memory
    .store({
      kind: "weekly_report_summary",
      restaurantId: "rest-demo",
      text: `${plan.weekLabel}: ${plan.summary.reservationCount} reservations, ${plan.summary.expectedGuests} guests, $${plan.summary.expectedRevenue} expected revenue, ${plan.summary.purchaseOrderCount} purchase orders.`,
    })
    .catch(() => null);

  return NextResponse.json({
    plan,
    invocations,
    model: getModelStatus(),
    narrative,
    live,
  });
}
