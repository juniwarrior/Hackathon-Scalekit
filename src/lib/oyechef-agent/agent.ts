/**
 * OyeChef agent orchestration layer.
 *
 * This is OyeChef's own deterministic orchestration — it does not reuse any
 * third-party agent/orchestration code. It exposes a small set of "tools" over
 * the weekly plan and routes a natural-language message (or a direct sidebar
 * tool invocation) to the right tool, returning a short conversational answer
 * plus an optional structured card the chat renders inline.
 */

import type {
  InventoryItem,
  PurchaseOrder,
  Reservation,
  StaffShift,
  WeeklyPlan,
} from "./types";

export type AgentToolId =
  | "reservations"
  | "clients"
  | "inventory"
  | "staff"
  | "purchase_order"
  | "allergens"
  | "promotions"
  | "revenue"
  | "summary"
  | "memory";

export type AgentCardKind =
  | "reservations"
  | "clients"
  | "inventory"
  | "staff"
  | "purchase_order"
  | "metrics"
  | "list"
  | "employee";

export interface AgentMetric {
  label: string;
  value: string;
}

export interface StaffEmail {
  id: string;
  employeeName: string;
  to: string;
  subject: string;
  /** Clock time the reminder is sent — 10 minutes before the shift. */
  sentAt: string;
  day: string;
  shiftTime: string;
  body: string;
  status: "sent" | "scheduled";
}

export interface EmployeeHistory {
  name: string;
  role: string;
  to: string;
  shifts: StaffShift[];
  emails: StaffEmail[];
}

export interface AgentCard {
  tool: AgentToolId;
  kind: AgentCardKind;
  title: string;
  subtitle?: string;
  /** Which connected tool the data came from (shown as a chip). */
  toolLabel: string;
  reservations?: Reservation[];
  inventory?: InventoryItem[];
  staff?: StaffShift[];
  purchaseOrder?: PurchaseOrder;
  metrics?: AgentMetric[];
  items?: string[];
  employee?: EmployeeHistory;
  footnote?: string;
}

export interface AgentResponse {
  text: string;
  card?: AgentCard;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Human-readable label shown for each sidebar section. */
export const sectionToTool: Record<string, AgentToolId> = {
  clients: "clients",
  inventory: "inventory",
  reservations: "reservations",
  staff: "staff",
};

export const sectionPrompt: Record<AgentToolId, string> = {
  reservations: "Show me this week's reservations.",
  clients: "Show me the client and CRM overview.",
  inventory: "Show me the inventory plan.",
  staff: "Show me the staff schedule.",
  purchase_order: "Show me the purchase orders.",
  allergens: "Are there any allergens?",
  promotions: "What promotions are recommended?",
  revenue: "What revenue do we expect?",
  summary: "Give me the weekly summary.",
  memory: "What do you remember about this restaurant?",
};

function findDay(text: string): string | null {
  const lower = text.toLowerCase();
  return DAYS.find((day) => lower.includes(day.toLowerCase())) ?? null;
}

/* ------------------------------------------------------------------ */
/* Staff shift-reminder emails (Gmail)                                  */
/* ------------------------------------------------------------------ */

function emailAddressFor(name: string): string {
  const handle = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, ".");
  return `${handle}@oyechef.demo`;
}

/** Subtract 10 minutes from a "10:00 AM" style clock time. */
function tenMinutesBefore(time: string): string {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return time;
  let hour = parseInt(match[1], 10) % 12;
  if (/pm/i.test(match[3])) hour += 12;
  let total = hour * 60 + parseInt(match[2], 10) - 10;
  if (total < 0) total += 24 * 60;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const ampm = hh < 12 ? "AM" : "PM";
  const hour12 = ((hh + 11) % 12) + 1;
  return `${hour12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

/** All shift-reminder emails for the week — one per shift, sent 10 min before. */
export function getStaffReminderEmails(plan: WeeklyPlan): StaffEmail[] {
  return plan.staffShifts.map((shift) => ({
    id: `email-${shift.shiftId}`,
    employeeName: shift.employeeName,
    to: emailAddressFor(shift.employeeName),
    subject: `Shift reminder — ${shift.day} ${shift.startTime}`,
    sentAt: tenMinutesBefore(shift.startTime),
    day: shift.day,
    shiftTime: `${shift.startTime} – ${shift.endTime}`,
    body: `Hi ${shift.employeeName.split(" ")[0]}, this is your reminder that your ${shift.role} shift on ${shift.day} starts at ${shift.startTime} — in 10 minutes. See you at OyeChef.`,
    status: "scheduled",
  }));
}

function employeeHistoryTool(plan: WeeklyPlan, name: string): AgentResponse {
  const shifts = plan.staffShifts.filter((s) => s.employeeName === name);
  const emails = getStaffReminderEmails(plan).filter((e) => e.employeeName === name);
  const role = shifts[0]?.role ?? "staff";
  if (!shifts.length) {
    return { text: `I couldn't find ${name} on this week's schedule.` };
  }
  return {
    text: `${name} (${role}) has ${shifts.length} shifts this week. ${emails.length} reminder emails are scheduled — each sent 10 minutes before the shift.`,
    card: {
      tool: "staff",
      kind: "employee",
      title: name,
      subtitle: `${role} · ${shifts.length} shifts · ${emails.length} reminder emails`,
      toolLabel: "Gmail",
      employee: { name, role, to: emailAddressFor(name), shifts, emails },
      footnote: "Reminder emails are sent automatically 10 minutes before each shift.",
    },
  };
}

/** Public: open one employee's full history (shifts worked + emails sent). */
export function runEmployeeHistory(plan: WeeklyPlan, name: string): AgentResponse {
  return employeeHistoryTool(plan, name);
}

/* ------------------------------------------------------------------ */
/* Tools                                                                */
/* ------------------------------------------------------------------ */

function reservationsTool(plan: WeeklyPlan, day: string | null): AgentResponse {
  const list = day ? plan.reservations.filter((r) => r.day === day) : plan.reservations;
  const guests = list.reduce((sum, r) => sum + r.adults + r.children, 0);
  const accepted = list.filter((r) => r.status === "accepted").length;
  const rejected = list.length - accepted;
  const scope = day ? `on ${day}` : "this week";
  return {
    text: `You have ${list.length} reservations ${scope} covering ${guests} guests — ${accepted} accepted and ${rejected} rejected or waitlisted.`,
    card: {
      tool: "reservations",
      kind: "reservations",
      title: day ? `${day} reservations` : "Weekly reservations",
      subtitle: `${list.length} reservations · ${guests} guests`,
      toolLabel: "Google Calendar",
      reservations: list,
      footnote: "Reservation replies require manager approval.",
    },
  };
}

function clientsTool(plan: WeeklyPlan): AgentResponse {
  const vip = plan.clients.filter((c) => c.crmStatus === "VIP");
  const returning = plan.clients.filter((c) => c.isReturning).length;
  return {
    text: `This week's guests include ${vip.length} VIPs and ${returning} returning clients. Loyalty tier and points are tracked per client.`,
    card: {
      tool: "clients",
      kind: "clients",
      title: "Clients & CRM",
      subtitle: `${plan.clients.length} clients · ${vip.length} VIP · ${returning} returning`,
      toolLabel: "Airtable",
      reservations: plan.clients,
      footnote: "CRM record updates require manager approval.",
    },
  };
}

function inventoryTool(plan: WeeklyPlan): AgentResponse {
  const reorder = plan.inventory.filter((i) => i.orderQuantityKg > 0);
  const totalCost = reorder.reduce((sum, i) => sum + i.estimatedCostUsd, 0);
  return {
    text: `${reorder.length} products need reordering this week for an estimated $${totalCost.toLocaleString()}. Full inventory plan is below.`,
    card: {
      tool: "inventory",
      kind: "inventory",
      title: "Inventory plan",
      subtitle: `${plan.inventory.length} products · ${reorder.length} to reorder · $${totalCost.toLocaleString()}`,
      toolLabel: "Google Sheets",
      inventory: plan.inventory,
      footnote: "Purchase orders require manager approval.",
    },
  };
}

function staffTool(plan: WeeklyPlan): AgentResponse {
  const waiters = new Set(plan.staffShifts.filter((s) => s.role === "waiter").map((s) => s.employeeName));
  const cooks = new Set(plan.staffShifts.filter((s) => s.role === "cook").map((s) => s.employeeName));
  return {
    text: `The schedule has ${waiters.size} waiters and ${cooks.size} cooks across ${plan.staffShifts.length} shifts. A reminder email goes to each employee 10 minutes before their shift. Click anyone to see their history.`,
    card: {
      tool: "staff",
      kind: "staff",
      title: "Staff schedule",
      subtitle: `${waiters.size} waiters · ${cooks.size} cooks · ${plan.staffShifts.length} shifts`,
      toolLabel: "Google Sheets / Gmail",
      staff: plan.staffShifts,
      footnote: "A reminder email is sent to each employee 10 minutes before their shift.",
    },
  };
}

function purchaseOrderTool(plan: WeeklyPlan, product?: string): AgentResponse {
  const order = product
    ? plan.purchaseOrders.find((o) => o.product.toLowerCase() === product.toLowerCase())
    : undefined;

  if (product && order) {
    return {
      text: `${order.product} order: ${order.quantityKg} kg from ${order.vendor}, about $${order.estimatedCostUsd.toLocaleString()}, delivery ${order.deliveryDay}. Planned dishes: ${order.plannedDishes.join(", ")}.`,
      card: {
        tool: "purchase_order",
        kind: "purchase_order",
        title: `${order.product} purchase order`,
        subtitle: order.vendor,
        toolLabel: "Google Sheets",
        purchaseOrder: order,
        footnote: "This purchase order requires manager approval.",
      },
    };
  }

  const total = plan.purchaseOrders.reduce((sum, o) => sum + o.estimatedCostUsd, 0);
  return {
    text: `There are ${plan.purchaseOrders.length} purchase orders drafted for about $${total.toLocaleString()} total, all pending manager approval.`,
    card: {
      tool: "purchase_order",
      kind: "inventory",
      title: "Purchase orders",
      subtitle: `${plan.purchaseOrders.length} orders · $${total.toLocaleString()}`,
      toolLabel: "Google Sheets",
      inventory: plan.inventory.filter((i) => i.orderQuantityKg > 0),
      footnote: "All purchase orders require manager approval.",
    },
  };
}

function allergensTool(plan: WeeklyPlan): AgentResponse {
  const flagged = plan.reservations.filter(
    (r) => r.allergiesOrSpecialRequirements && r.allergiesOrSpecialRequirements.toLowerCase() !== "no restrictions",
  );
  return {
    text: `${plan.allergySummary.length} allergy or special-requirement notes this week across ${flagged.length} reservations. Confirm them in pre-service.`,
    card: {
      tool: "allergens",
      kind: "list",
      title: "Allergens & special requirements",
      subtitle: `${flagged.length} flagged reservations`,
      toolLabel: "Gmail / Google Calendar",
      items: plan.allergySummary,
      footnote: "Surface these on table notes before service.",
    },
  };
}

function promotionsTool(plan: WeeklyPlan): AgentResponse {
  return {
    text: `Here are the recommended promotions for unsold and overstock items, plus loyalty offers.`,
    card: {
      tool: "promotions",
      kind: "list",
      title: "Recommended promotions",
      subtitle: `${plan.promotions.length} promotions`,
      toolLabel: "Airtable",
      items: plan.promotions,
      footnote: "Promotions require manager approval before CRM or email writes.",
    },
  };
}

function revenueTool(plan: WeeklyPlan): AgentResponse {
  const s = plan.summary;
  return {
    text: `Expected revenue is $${s.expectedRevenue.toLocaleString()} at ${s.occupancyPercentage}% occupancy with ${s.expectedGuests} guests.`,
    card: {
      tool: "revenue",
      kind: "metrics",
      title: "Expected performance",
      toolLabel: "Mock POS",
      metrics: [
        { label: "Expected revenue", value: `$${s.expectedRevenue.toLocaleString()}` },
        { label: "Expected guests", value: String(s.expectedGuests) },
        { label: "Occupancy", value: `${s.occupancyPercentage}%` },
        { label: "Reservations", value: String(s.reservationCount) },
      ],
    },
  };
}

function summaryTool(plan: WeeklyPlan): AgentResponse {
  const s = plan.summary;
  return {
    text: `${plan.weekLabel}: ${s.reservationCount} reservations, ${s.expectedGuests} guests, $${s.expectedRevenue.toLocaleString()} expected revenue, ${s.occupancyPercentage}% occupancy.`,
    card: {
      tool: "summary",
      kind: "metrics",
      title: plan.weekLabel,
      subtitle: "Weekly summary",
      toolLabel: "OyeChef planner",
      metrics: [
        { label: "Reservations", value: String(s.reservationCount) },
        { label: "Expected guests", value: String(s.expectedGuests) },
        { label: "Expected revenue", value: `$${s.expectedRevenue.toLocaleString()}` },
        { label: "Occupancy", value: `${s.occupancyPercentage}%` },
        { label: "Purchase orders", value: String(s.purchaseOrderCount) },
        { label: "Waiters / cooks", value: `${s.waitersCount} / ${s.cooksCount}` },
      ],
    },
  };
}

function memoryTool(plan: WeeklyPlan): AgentResponse {
  // Deterministic "what's happening" recall from the plan. On the server the
  // /api/agent route replaces these with real Actian VectorAI search results.
  const notes = [
    ...plan.crmOpportunities.slice(0, 2),
    ...plan.recommendations.slice(0, 2),
    plan.allergySummary.length ? `Allergy notes on file: ${plan.allergySummary.slice(0, 3).join("; ")}.` : "",
  ].filter(Boolean);
  return {
    text: "Here's what I remember about this restaurant and what's happening this week, recalled from agent memory.",
    card: {
      tool: "memory",
      kind: "list",
      title: "Agent memory (Actian)",
      subtitle: "Daily memory · what's happening",
      toolLabel: "Actian VectorAI DB",
      items: notes,
      footnote: "Memory gives context. Live data still comes from the connected source tools.",
    },
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/** Run a tool directly (used by sidebar clicks). */
export function runAgentTool(plan: WeeklyPlan, tool: AgentToolId): AgentResponse {
  switch (tool) {
    case "reservations":
      return reservationsTool(plan, null);
    case "clients":
      return clientsTool(plan);
    case "inventory":
      return inventoryTool(plan);
    case "staff":
      return staffTool(plan);
    case "purchase_order":
      return purchaseOrderTool(plan);
    case "allergens":
      return allergensTool(plan);
    case "promotions":
      return promotionsTool(plan);
    case "revenue":
      return revenueTool(plan);
    case "memory":
      return memoryTool(plan);
    case "summary":
    default:
      return summaryTool(plan);
  }
}

/** Route a free-text message to the right tool. */
export function routeAgentMessage(plan: WeeklyPlan, message: string): AgentResponse {
  const text = message.trim();
  const lower = text.toLowerCase();
  if (!lower) return { text: "" };

  if (
    lower.includes("remember") ||
    lower.includes("memory") ||
    lower.includes("recall") ||
    lower.includes("what do you know") ||
    lower.includes("preferences on file") ||
    lower.includes("what's happening") ||
    lower.includes("learned")
  ) {
    return memoryTool(plan);
  }
  if (lower.includes("red meat") || lower.includes("beef")) {
    return purchaseOrderTool(plan, "Beef");
  }
  if (lower.includes("salmon")) {
    return purchaseOrderTool(plan, "Salmon");
  }
  if (lower.includes("waiter") || lower.includes("cook") || lower.includes("shift") || lower.includes("schedule") || lower.includes("staff")) {
    return staffTool(plan);
  }
  if (lower.includes("allerg") || lower.includes("special") || lower.includes("gluten") || lower.includes("nut") || lower.includes("shellfish") || lower.includes("dairy")) {
    return allergensTool(plan);
  }
  if (lower.includes("promo") || lower.includes("discount") || lower.includes("deal") || lower.includes("loyalty") || lower.includes("points")) {
    return promotionsTool(plan);
  }
  if (lower.includes("purchase") || lower.includes("order")) {
    return purchaseOrderTool(plan);
  }
  if (lower.includes("inventory") || lower.includes("stock") || lower.includes("ingredient")) {
    return inventoryTool(plan);
  }
  if (lower.includes("revenue") || lower.includes("sales") || lower.includes("occupancy") || lower.includes("money")) {
    return revenueTool(plan);
  }
  if (lower.includes("client") || lower.includes("crm") || lower.includes("vip") || lower.includes("customer")) {
    return clientsTool(plan);
  }
  if (lower.includes("reservation") || lower.includes("booking") || lower.includes("table") || findDay(lower)) {
    return reservationsTool(plan, findDay(lower));
  }
  if (lower.includes("summary") || lower.includes("overview") || lower.includes("week") || lower.includes("kpi")) {
    return summaryTool(plan);
  }

  return {
    text: "I can answer questions about this weekly plan — clients, reservations, inventory, staff, purchase orders, allergens, promotions, and revenue. Try the suggested prompts or click a section in the sidebar.",
  };
}
