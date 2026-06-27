import type { ApprovalGate, ConnectorId, WeeklyPlan } from "./types";

export interface OyeChefToolResult {
  connectorId: ConnectorId;
  label: string;
  status: "mocked" | "ready";
  approvalRequired: boolean;
}

export function getToolPlan(plan: WeeklyPlan): OyeChefToolResult[] {
  return [
    { connectorId: "google_sheets", label: `${plan.inventory.length} inventory rows read and ${plan.purchaseOrders.length} purchase order drafts prepared`, status: "mocked", approvalRequired: true },
    { connectorId: "gmail", label: "Reservation and vendor email drafts prepared", status: "mocked", approvalRequired: true },
    { connectorId: "google_calendar", label: "Reservation availability checked", status: "mocked", approvalRequired: false },
    { connectorId: "slack", label: "Shift instructions drafted", status: "mocked", approvalRequired: true },
    { connectorId: "crm", label: "CRM loyalty segments and promotions prepared", status: "mocked", approvalRequired: true },
    { connectorId: "actian", label: "Customer preference memories searched", status: "mocked", approvalRequired: false },
  ];
}

export function approvalCopy(gate: ApprovalGate) {
  const action = {
    staff_message: "sending staff messages",
    promotion: "activating promotions",
    reservation_reply: "replying to reservation requests",
    purchase_order: "creating purchase orders",
  }[gate.category];
  return `${gate.title} requires manager approval before ${action} through ${gate.tool}.`;
}
