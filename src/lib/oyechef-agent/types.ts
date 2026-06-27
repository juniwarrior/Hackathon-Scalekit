export type ConnectorId =
  | "google_sheets"
  | "gmail"
  | "google_calendar"
  | "slack"
  | "crm"
  | "actian";

export type PlanningSection = "home" | "clients" | "inventory" | "reservations" | "staff";

export type ReservationStatus = "accepted" | "rejected";
export type CrmStatus = "new" | "returning" | "VIP";
export type StaffRole = "waiter" | "cook";
export type ApprovalCategory = "staff_message" | "promotion" | "reservation_reply" | "purchase_order";

export interface CustomerProfile {
  customerId: string;
  name: string;
  crmStatus: CrmStatus;
  loyaltyTier: "Bronze" | "Silver" | "Gold" | "Platinum";
  pointsBalance: number;
  favoriteDishes: string[];
  allergies: string[];
  lifetimeSpend: number;
  averagePreviousSpend: number;
  promotionEligibility: string;
}

export interface Reservation {
  reservationId: string;
  customerId: string;
  customerName: string;
  day: string;
  time: string;
  adults: number;
  children: number;
  status: ReservationStatus;
  tableArea: string;
  allergiesOrSpecialRequirements: string;
  crmStatus: CrmStatus;
  isReturning: boolean;
  averagePreviousSpend: number;
  promotionStatus: string;
  loyaltyTier: string;
  pointsBalance: number;
  recommendedAction: string;
}

export interface InventoryItem {
  product: string;
  currentQuantityKg: number;
  reorderThresholdKg: number;
  expectedUsageKg: number;
  orderQuantityKg: number;
  estimatedCostUsd: number;
  deliveryDay: string;
  plannedDishes: string[];
  expectedQuantityToSell: number;
  promotionRecommendation?: string;
}

export interface StaffShift {
  shiftId: string;
  employeeName: string;
  role: StaffRole;
  day: string;
  startTime: string;
  endTime: string;
}

export interface MenuItem {
  menuItemId: string;
  name: string;
  price: number;
  ingredients: Array<{ product: string; quantityKg: number }>;
}

export interface PosOrder {
  orderId: string;
  day: string;
  customerId?: string;
  items: Array<{ menuItemId: string; quantity: number }>;
  total: number;
}

export interface LoyaltyTransaction {
  transactionId: string;
  customerId: string;
  day: string;
  points: number;
  reason: string;
}

export interface RestaurantDataSet {
  restaurantName: string;
  weekLabel: string;
  weekStart: string;
  capacityPerService: number;
  customers: CustomerProfile[];
  reservations: Reservation[];
  inventory: InventoryItem[];
  staffShifts: StaffShift[];
  menuItems: MenuItem[];
  posOrders: PosOrder[];
  loyaltyTransactions: LoyaltyTransaction[];
}

export interface WeeklySummary {
  reservationCount: number;
  expectedGuests: number;
  expectedRevenue: number;
  occupancyPercentage: number;
  purchaseOrderCount: number;
  waitersCount: number;
  cooksCount: number;
}

export interface PurchaseOrder {
  purchaseOrderId: string;
  vendor: string;
  product: string;
  quantityKg: number;
  estimatedCostUsd: number;
  deliveryDay: string;
  plannedDishes: string[];
  approvalRequired: boolean;
}

export interface AuditEvent {
  id: string;
  tool: string;
  event: string;
  timestamp: string;
}

export interface ApprovalGate {
  id: string;
  category: ApprovalCategory;
  title: string;
  status: "needs_approval" | "approved" | "drafted";
  tool: string;
}

export interface WeeklyPlan {
  reportId: string;
  weekLabel: string;
  weekStart: string;
  generatedAt: string;
  summary: WeeklySummary;
  clients: Reservation[];
  reservations: Reservation[];
  inventory: InventoryItem[];
  staffShifts: StaffShift[];
  purchaseOrders: PurchaseOrder[];
  promotions: string[];
  allergySummary: string[];
  staffSummary: string[];
  crmOpportunities: string[];
  recommendations: string[];
  auditEvents: AuditEvent[];
  approvalGates: ApprovalGate[];
  demandByDay: Array<{ day: string; guests: number; revenue: number }>;
}

export interface AnalysisStep {
  id: string;
  label: string;
  detail: string;
}
