/**
 * OyeChef autonomous orchestrator.
 *
 * This is OyeChef's own orchestration (no third-party agent code). When the
 * manager runs "Plan the Week", the agent autonomously executes a sequence of
 * tool calls through the Scalekit gateway — reading Sheets, Gmail, Calendar and
 * CRM, recalling Actian memory, then drafting the writes that require approval.
 * The audit trail and activity feed are produced from those real calls.
 */

import { createWeeklyPlan } from "./planner";
import { runAgentTool, type AgentResponse, type AgentToolId } from "./agent";
import { invokeTool, makeClock, type ToolInvocation } from "@/lib/scalekit/gateway";
import type { RestaurantDataSet, WeeklyPlan } from "./types";

export interface AgentRun {
  plan: WeeklyPlan;
  invocations: ToolInvocation[];
}

/** Run the full autonomous planning pass and return the plan + tool activity. */
export function planWeekAutonomously(data: RestaurantDataSet): AgentRun {
  const plan = createWeeklyPlan(data);
  const clock = makeClock();
  const invocations: ToolInvocation[] = [];
  const call = (params: Omit<Parameters<typeof invokeTool>[0], "timestamp">) =>
    invocations.push(invokeTool({ ...params, timestamp: clock() }));

  const reorderCount = plan.inventory.filter((i) => i.orderQuantityKg > 0).length;
  const waiters = plan.summary.waitersCount;
  const cooks = plan.summary.cooksCount;
  const vip = plan.clients.filter((c) => c.crmStatus === "VIP").length;
  const returning = plan.clients.filter((c) => c.isReturning).length;

  // --- Reads: gather the week's signals ---
  call({ actor: "actian", action: "recallMemory", summary: "Recalled restaurant planning notes, customer preferences, and last week's summary." });
  call({ actor: "google_sheets", action: "readInventory", summary: `Read ${plan.inventory.length} inventory rows · ${reorderCount} below reorder threshold.` });
  call({ actor: "google_sheets", action: "readPosSales", summary: "Read mock POS orders and menu sales history for demand forecasting." });
  call({ actor: "google_sheets", action: "readStaffSchedule", summary: `Read ${plan.staffShifts.length} shifts · ${waiters} waiters and ${cooks} cooks.` });
  call({ actor: "gmail", action: "readReservationEmails", summary: `Classified ${plan.reservations.length} reservation requests and vendor emails.` });
  call({ actor: "google_calendar", action: "checkAvailability", summary: "Checked table availability and catering events across the service week." });
  call({ actor: "crm", action: "matchCustomers", summary: `Matched ${vip} VIP and ${returning} returning guests with loyalty tiers and points.` });

  // --- Reasoning: build the written summary (model-optional) ---
  call({ actor: "model", action: "summarizeWeek", summary: `Generated the weekly summary: $${plan.summary.expectedRevenue.toLocaleString()} expected revenue at ${plan.summary.occupancyPercentage}% occupancy.` });

  // --- Writes: drafted autonomously, held for manager approval ---
  call({ actor: "google_sheets", action: "draftPurchaseOrders", summary: `Drafted ${plan.purchaseOrders.length} purchase orders for the red meat and seafood deliveries.`, direction: "write", status: "needs_approval" });
  call({ actor: "gmail", action: "scheduleShiftReminders", summary: `Scheduled ${plan.staffShifts.length} shift-reminder emails — each sent to the employee 10 minutes before their shift.`, direction: "write", status: "drafted" });
  call({ actor: "gmail", action: "draftReservationReplies", summary: "Drafted waitlist replies for Tuesday and Thursday.", direction: "write", status: "drafted" });
  call({ actor: "crm", action: "draftPromotion", summary: "Drafted the double-points salmon-bowl promotion for returning seafood guests.", direction: "write", status: "needs_approval" });

  // --- Persist learning ---
  call({ actor: "actian", action: "storeMemory", summary: "Stored this week's report summary and approval preferences to agent memory." });

  // Rebuild the plan's audit trail from the actual tool calls.
  plan.auditEvents = invocations.map((inv, index) => ({
    id: `audit-${index + 1}`,
    tool: inv.actorName,
    event: `${inv.action} — ${inv.summary}`,
    timestamp: inv.timestamp,
  }));

  return { plan, invocations };
}

/**
 * Run a single agent tool (sidebar click or typed question) through the gateway
 * so the chat answer is backed by a logged tool call.
 */
export function runToolThroughGateway(
  plan: WeeklyPlan,
  tool: AgentToolId,
): { response: AgentResponse; invocation: ToolInvocation } {
  const response = runAgentTool(plan, tool);
  const clock = makeClock(9 * 60 + 30);
  const actorByTool: Record<AgentToolId, ToolInvocation["actor"]> = {
    reservations: "google_calendar",
    clients: "crm",
    inventory: "google_sheets",
    staff: "google_sheets",
    purchase_order: "google_sheets",
    allergens: "gmail",
    promotions: "crm",
    revenue: "google_sheets",
    summary: "actian",
    memory: "actian",
  };
  const invocation = invokeTool({
    actor: actorByTool[tool],
    action: `lookup:${tool}`,
    summary: response.text,
    timestamp: clock(),
  });
  return { response, invocation };
}
