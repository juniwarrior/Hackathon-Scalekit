import type { ConnectorStatus } from "./types";

export const connectorDefinitions: ConnectorStatus[] = [
  {
    id: "google_sheets",
    name: "Google Sheets",
    connected: true,
    mode: "mock",
    required: true,
    read: [
      { label: "Inventory", description: "Ingredient quantities, reorder thresholds, and vendor sheets." },
      { label: "Mock POS sales/orders", description: "Order rows and menu item sales history." },
      { label: "Staff schedules", description: "Weekly waiter and cook shifts." },
    ],
    write: [{ label: "Purchase order drafts", description: "Draft rows that require manager approval." }],
  },
  {
    id: "gmail",
    name: "Gmail",
    connected: true,
    mode: "mock",
    required: true,
    read: [
      { label: "Vendor emails", description: "Supplier messages and delivery updates." },
      { label: "Customer reservation emails", description: "Reservation requests and replies." },
      { label: "Promotion emails", description: "Past promotion responses." },
    ],
    write: [{ label: "Draft replies", description: "Reservation, vendor, and promotion email drafts." }],
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    connected: true,
    mode: "mock",
    required: true,
    read: [
      { label: "Reservations", description: "Booked service times and table availability." },
      { label: "Catering events", description: "Large events that affect demand and staffing." },
    ],
    write: [{ label: "Draft calendar holds", description: "Reservation holds only after approval." }],
  },
  {
    id: "crm",
    name: "Airtable",
    connected: true,
    mode: "mock",
    required: false,
    read: [
      { label: "Client CRM base", description: "Customer profile and visit history in Airtable." },
      { label: "Loyalty points", description: "Tier, points balance, and redemption behavior." },
      { label: "Customer promotions", description: "Promotion eligibility and past results." },
    ],
    write: [{ label: "CRM updates", description: "Promotion and loyalty records after manager approval." }],
  },
  {
    id: "actian",
    name: "Actian VectorAI DB",
    connected: true,
    mode: "mock",
    required: false,
    read: [
      { label: "Agent memory", description: "Restaurant planning notes and previous weekly report summaries." },
      { label: "Customer preferences", description: "Favorite dishes, allergies, and service preferences." },
      { label: "Promotion history", description: "Which promotions worked for this restaurant." },
    ],
    write: [{ label: "Planning memory", description: "Weekly report summaries and approval preferences." }],
  },
];
