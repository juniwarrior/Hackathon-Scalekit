import { z } from "zod";
import { getCurrentDemoDataSet, seededReportInputs } from "./mock-data";
import type { AnalysisStep, RestaurantDataSet, WeeklyPlan } from "./types";

const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const weeklyPlanRequestSchema = z.object({
  weekLabel: z.string().optional(),
  useDemoData: z.boolean().optional(),
});

export const analysisSteps: AnalysisStep[] = [
  { id: "inventory", label: "Inventory", detail: "Checking current stock, usage by dish, expiring and overstocked items." },
  { id: "waiters", label: "Waiters", detail: "Counting waiter coverage by service window." },
  { id: "schedules", label: "Schedules", detail: "Comparing shifts with reservation demand." },
  { id: "reservations", label: "Reservations", detail: "Reviewing accepted, rejected, and waitlisted reservations." },
  { id: "staff", label: "Staff", detail: "Balancing cooks and front-of-house staffing." },
  { id: "crm", label: "CRM promotions", detail: "Finding loyalty opportunities and promotion eligibility." },
  { id: "purchase_orders", label: "Purchase orders", detail: "Drafting purchase orders that require manager approval." },
  { id: "expected_demand", label: "Expected demand", detail: "Forecasting covers, revenue, and occupancy by day." },
  { id: "allergies", label: "Allergies and special requirements", detail: "Surfacing allergies, birthdays, high chairs, and service notes." },
];

export function createWeeklyPlan(data: RestaurantDataSet = getCurrentDemoDataSet()): WeeklyPlan {
  const acceptedReservations = data.reservations.filter((reservation) => reservation.status === "accepted");
  const expectedGuests = acceptedReservations.reduce((sum, reservation) => sum + reservation.adults + reservation.children, 0);
  const expectedRevenue = Math.round(
    acceptedReservations.reduce((sum, reservation) => {
      const knownSpend = reservation.averagePreviousSpend || 94;
      return sum + Math.max(knownSpend, (reservation.adults + reservation.children) * 42);
    }, 0),
  );
  const purchaseOrders = data.inventory
    .filter((item) => item.orderQuantityKg > 0)
    .map((item, index) => ({
      purchaseOrderId: `po-${data.weekStart}-${index + 1}`,
      vendor: item.product === "Beef" ? "Prime Meats Co." : item.product === "Salmon" ? "Harbor Fish Market" : "Chef Supply Market",
      product: item.product,
      quantityKg: item.orderQuantityKg,
      estimatedCostUsd: item.estimatedCostUsd,
      deliveryDay: item.deliveryDay,
      plannedDishes: item.plannedDishes,
      approvalRequired: true,
    }));
  const waiters = new Set(data.staffShifts.filter((shift) => shift.role === "waiter").map((shift) => shift.employeeName));
  const cooks = new Set(data.staffShifts.filter((shift) => shift.role === "cook").map((shift) => shift.employeeName));
  const demandByDay = dayOrder.map((day) => {
    const reservations = acceptedReservations.filter((reservation) => reservation.day === day);
    const guests = reservations.reduce((sum, reservation) => sum + reservation.adults + reservation.children, 0);
    return {
      day,
      guests,
      revenue: Math.round(reservations.reduce((sum, reservation) => sum + Math.max(reservation.averagePreviousSpend, 88), 0)),
    };
  });
  const allergySummary = Array.from(
    new Set(
      data.reservations
        .map((reservation) => reservation.allergiesOrSpecialRequirements)
        .filter((value) => value && value.toLowerCase() !== "no restrictions"),
    ),
  );
  const promotions = Array.from(
    new Set([
      ...data.inventory.map((item) => item.promotionRecommendation).filter(Boolean),
      ...data.reservations.map((reservation) => reservation.promotionStatus).filter(Boolean),
    ] as string[]),
  ).slice(0, 7);

  return {
    reportId: `report-${data.weekStart}`,
    weekLabel: data.weekLabel,
    weekStart: data.weekStart,
    generatedAt: new Date().toISOString(),
    summary: {
      reservationCount: data.reservations.length,
      expectedGuests,
      expectedRevenue,
      occupancyPercentage: Math.min(100, Math.round((expectedGuests / data.capacityPerService) * 100)),
      purchaseOrderCount: purchaseOrders.length,
      waitersCount: waiters.size,
      cooksCount: cooks.size,
    },
    clients: data.reservations,
    reservations: data.reservations,
    inventory: data.inventory,
    staffShifts: data.staffShifts,
    purchaseOrders,
    promotions,
    allergySummary,
    staffSummary: dayOrder.map((day) => {
      const shifts = data.staffShifts.filter((shift) => shift.day === day);
      const waiterCount = shifts.filter((shift) => shift.role === "waiter").length;
      const cookCount = shifts.filter((shift) => shift.role === "cook").length;
      return `${day}: ${waiterCount} waiters and ${cookCount} cooks scheduled`;
    }),
    crmOpportunities: [
      "Invite VIP guests Maria Alvarez and Elena Garcia to a chef table approval flow.",
      "Send double points offer for salmon bowls from 4-6 PM to returning seafood customers.",
      "Use 50% discount until Saturday for customers eligible for unsold dessert and ice cream promotions.",
      "Convert new customers with first-visit appetizer and birthday point bonuses.",
    ],
    recommendations: [
      "Approve the red meat purchase order before Tuesday morning delivery cutoff.",
      "Draft Slack shift notes for Friday and Saturday because guest demand peaks after 7 PM.",
      "Ask the manager to approve promotion messages before CRM or email writes.",
      "Confirm gluten-free, shellfish, nut, dairy-free, high chair, and birthday requirements in pre-service.",
      "Keep demo data active until Scalekit connectors are connected for real Sheets, Gmail, Calendar, Slack, and CRM actions.",
    ],
    auditEvents: [
      { id: "audit-1", tool: "Google Sheets", event: "Inventory analyzed from mock Sheets adapter", timestamp: "09:00 AM" },
      { id: "audit-2", tool: "Gmail", event: "Reservation request read and classified", timestamp: "09:03 AM" },
      { id: "audit-3", tool: "Airtable", event: "Returning client and loyalty status identified", timestamp: "09:05 AM" },
      { id: "audit-4", tool: "Slack", event: "Staff message drafted and held for manager approval", timestamp: "09:08 AM" },
      { id: "audit-5", tool: "Google Calendar", event: "Reservation availability checked", timestamp: "09:11 AM" },
      { id: "audit-6", tool: "Actian", event: "Customer preference memory retrieved", timestamp: "09:13 AM" },
    ],
    approvalGates: [
      { id: "approval-1", category: "staff_message", title: "Friday peak shift instructions", status: "needs_approval", tool: "Slack" },
      { id: "approval-2", category: "promotion", title: "Double points on salmon bowls", status: "needs_approval", tool: "Airtable" },
      { id: "approval-3", category: "reservation_reply", title: "Waitlist replies for Tuesday and Thursday", status: "drafted", tool: "Gmail" },
      { id: "approval-4", category: "purchase_order", title: "Red meat and seafood purchase orders", status: "needs_approval", tool: "Google Sheets" },
    ],
    demandByDay,
  };
}

export function seedWeeklyReports(): WeeklyPlan[] {
  return seededReportInputs.map((dataset) => createWeeklyPlan(dataset));
}

export function answerWeeklyPlanQuestion(plan: WeeklyPlan, question: string): string {
  const normalized = question.trim().toLowerCase();
  if (!normalized) return "";

  if (normalized.includes("waiter") || normalized.includes("waiters")) {
    const waiterShifts = plan.staffShifts.filter((shift) => shift.role === "waiter");
    return waiterShifts
      .map((shift) => `${shift.employeeName}: ${shift.day}, ${shift.startTime}-${shift.endTime}`)
      .join("\n");
  }

  if (normalized.includes("red meat") || normalized.includes("beef")) {
    const beefOrder = plan.purchaseOrders.find((order) => order.product.toLowerCase() === "beef");
    if (!beefOrder) return "No beef purchase order is needed for this weekly plan.";
    return `Red meat purchase order: ${beefOrder.quantityKg} kg of beef from ${beefOrder.vendor}, estimated at $${beefOrder.estimatedCostUsd}, delivery ${beefOrder.deliveryDay}. Planned dishes: ${beefOrder.plannedDishes.join(", ")}. Manager approval is required.`;
  }

  if (normalized.includes("tuesday")) {
    const tuesday = plan.reservations.filter((reservation) => reservation.day === "Tuesday");
    const guests = tuesday.reduce((sum, reservation) => sum + reservation.adults + reservation.children, 0);
    const accepted = tuesday.filter((reservation) => reservation.status === "accepted").length;
    const rejected = tuesday.filter((reservation) => reservation.status === "rejected").length;
    return `Tuesday has ${tuesday.length} reservations covering ${guests} guests: ${accepted} accepted and ${rejected} rejected or waitlisted.`;
  }

  if (normalized.includes("allergen") || normalized.includes("allergy") || normalized.includes("allergies") || normalized.includes("special")) {
    return `Allergy and special requirement summary: ${plan.allergySummary.join("; ")}. Confirm these in pre-service and table notes.`;
  }

  if (normalized.includes("reservation") || normalized.includes("client")) {
    return `This report has ${plan.summary.reservationCount} reservations and ${plan.summary.expectedGuests} expected guests. Accepted clients include ${plan.reservations.filter((reservation) => reservation.status === "accepted").slice(0, 5).map((reservation) => reservation.customerName).join(", ")}.`;
  }

  if (normalized.includes("inventory") || normalized.includes("purchase") || normalized.includes("order")) {
    const orders = plan.purchaseOrders.slice(0, 5).map((order) => `${order.product}: ${order.quantityKg} kg, $${order.estimatedCostUsd}, delivery ${order.deliveryDay}`);
    return `Purchase planning requires ${plan.summary.purchaseOrderCount} drafted orders. ${orders.join("; ")}. All purchase orders require manager approval.`;
  }

  if (normalized.includes("promotion") || normalized.includes("promo") || normalized.includes("loyalty") || normalized.includes("points")) {
    return `Promotion opportunities: ${plan.promotions.slice(0, 5).join("; ")}. Loyalty context is included on the Clients table with tier and points balance.`;
  }

  if (normalized.includes("revenue") || normalized.includes("sales") || normalized.includes("occupancy")) {
    return `Expected revenue is $${plan.summary.expectedRevenue.toLocaleString()} with ${plan.summary.occupancyPercentage}% projected occupancy and ${plan.summary.expectedGuests} expected guests.`;
  }

  if (normalized.includes("staff") || normalized.includes("cook") || normalized.includes("shift")) {
    return plan.staffSummary.join("\n");
  }

  return "I can answer questions about this weekly plan, including clients, reservations, inventory, staff, purchase orders, allergens, and promotions.";
}
