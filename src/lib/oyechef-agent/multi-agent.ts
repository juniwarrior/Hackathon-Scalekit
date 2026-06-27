/**
 * OyeChef multi-agent weekly report.
 *
 * A panel of specialist agents (demand, inventory, staffing, CRM) each analyze
 * the same weekly plan in parallel through the core model, then a lead agent
 * synthesizes their notes into a manager-ready summary. With no model configured
 * every agent falls back to a deterministic note, so the report always renders.
 * Server-only (uses the model key).
 */

import { callModel, getModelStatus } from "./model";
import type { WeeklyPlan } from "./types";

export interface AgentReportSection {
  agent: string;
  focus: string;
  text: string;
}

export interface WeeklyReportNarrative {
  mode: "real" | "mock";
  model: string;
  sections: AgentReportSection[];
  summary: string;
}

function planContext(plan: WeeklyPlan): string {
  const s = plan.summary;
  const reorder = plan.inventory.filter((i) => i.orderQuantityKg > 0);
  return [
    `Week: ${plan.weekLabel}`,
    `Reservations: ${s.reservationCount}, expected guests: ${s.expectedGuests}, expected revenue: $${s.expectedRevenue}, occupancy: ${s.occupancyPercentage}%`,
    `Staff: ${s.waitersCount} waiters, ${s.cooksCount} cooks, ${plan.staffShifts.length} shifts`,
    `Purchase orders: ${s.purchaseOrderCount}. Reorder items: ${reorder.map((i) => `${i.product} ${i.orderQuantityKg}kg ($${i.estimatedCostUsd})`).join(", ") || "none"}`,
    `Promotions: ${plan.promotions.join("; ") || "none"}`,
    `Allergies/special requirements: ${plan.allergySummary.join("; ") || "none"}`,
  ].join("\n");
}

interface Specialist {
  agent: string;
  focus: string;
  instruction: string;
  fallback: (plan: WeeklyPlan) => string;
}

const SPECIALISTS: Specialist[] = [
  {
    agent: "Demand & Revenue",
    focus: "forecasting covers and revenue",
    instruction: "Assess expected demand, revenue, and occupancy for the week. Call out the busiest days and any revenue risk.",
    fallback: (p) =>
      `Expecting ${p.summary.expectedGuests} guests across ${p.summary.reservationCount} reservations for about $${p.summary.expectedRevenue.toLocaleString()} at ${p.summary.occupancyPercentage}% occupancy. Watch the Friday and Saturday evening peaks.`,
  },
  {
    agent: "Inventory & Purchasing",
    focus: "stock and purchase orders",
    instruction: "Review inventory levels and the purchase orders. Flag the most urgent reorders and any overstock that needs a promotion.",
    fallback: (p) => {
      const reorder = p.inventory.filter((i) => i.orderQuantityKg > 0);
      return `${reorder.length} products need reordering (~$${reorder.reduce((sum, i) => sum + i.estimatedCostUsd, 0).toLocaleString()}). Approve the red meat and seafood orders before the delivery cutoff.`;
    },
  },
  {
    agent: "Staffing",
    focus: "schedule coverage",
    instruction: "Evaluate whether staffing matches demand. Note any shift gaps and confirm the shift-reminder emails.",
    fallback: (p) =>
      `${p.summary.waitersCount} waiters and ${p.summary.cooksCount} cooks scheduled. Reminder emails go out 10 minutes before each of the ${p.staffShifts.length} shifts.`,
  },
  {
    agent: "CRM & Promotions",
    focus: "loyalty and promotions",
    instruction: "Identify loyalty and promotion opportunities for VIP and returning guests, plus allergen handling.",
    fallback: (p) =>
      `Promotions to run: ${p.promotions.slice(0, 3).join("; ") || "none"}. Confirm allergen notes: ${p.allergySummary.slice(0, 4).join("; ") || "none"}.`,
  },
];

export async function runWeeklyReportAgents(plan: WeeklyPlan): Promise<WeeklyReportNarrative> {
  const status = getModelStatus();
  const ctx = planContext(plan);

  const sections = await Promise.all(
    SPECIALISTS.map(async (spec) => {
      const text = status.connected
        ? await callModel(
            `You are the OyeChef ${spec.agent} agent, focused on ${spec.focus}. Reply in 2-3 sentences for a restaurant manager. Only use the provided week data; never invent numbers.`,
            `${spec.instruction}\n\nWeek data:\n${ctx}`,
          )
        : null;
      return { agent: spec.agent, focus: spec.focus, text: text ?? spec.fallback(plan) };
    }),
  );

  const synthesized = status.connected
    ? await callModel(
        "You are the OyeChef lead planning agent. Synthesize the specialist notes into a single 3-4 sentence weekly summary for the manager. Be concrete and action-oriented.",
        sections.map((s) => `${s.agent}: ${s.text}`).join("\n"),
      )
    : null;

  const summary =
    synthesized ??
    `${plan.weekLabel}: ${plan.summary.expectedGuests} guests and $${plan.summary.expectedRevenue.toLocaleString()} expected. Approve ${plan.summary.purchaseOrderCount} purchase orders, confirm allergen notes, and the shift-reminder emails are scheduled.`;

  return { mode: status.mode, model: status.model, sections, summary };
}
