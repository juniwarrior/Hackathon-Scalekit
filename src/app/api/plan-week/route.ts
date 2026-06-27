import { NextResponse } from "next/server";
import { weeklyPlanRequestSchema } from "@/lib/oyechef-agent/planner";
import { planWeekAutonomously } from "@/lib/oyechef-agent/orchestrator";
import { getModelStatus } from "@/lib/oyechef-agent/model";
import { runWeeklyReportAgents } from "@/lib/oyechef-agent/multi-agent";
import { createOyeChefMemory } from "@/lib/oyechef-agent/memory";
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
  });
}
