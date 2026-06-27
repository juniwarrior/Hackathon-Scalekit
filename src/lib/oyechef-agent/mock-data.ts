import type { InventoryItem, RestaurantDataSet, StaffShift, WeeklyPlan } from "./types";

const baseCustomers = [
  {
    customerId: "cust-001",
    name: "Maria Alvarez",
    crmStatus: "VIP" as const,
    loyaltyTier: "Platinum" as const,
    pointsBalance: 8420,
    favoriteDishes: ["Salmon bowl", "Avocado salad"],
    allergies: ["shellfish"],
    lifetimeSpend: 12840,
    averagePreviousSpend: 186,
    promotionEligibility: "Double points on seafood alternatives",
  },
  {
    customerId: "cust-002",
    name: "Derek Lee",
    crmStatus: "returning" as const,
    loyaltyTier: "Gold" as const,
    pointsBalance: 4360,
    favoriteDishes: ["Ribeye", "Pasta verde"],
    allergies: ["gluten-free"],
    lifetimeSpend: 5840,
    averagePreviousSpend: 142,
    promotionEligibility: "Red meat tasting invite",
  },
  {
    customerId: "cust-003",
    name: "Sofia Moreno",
    crmStatus: "new" as const,
    loyaltyTier: "Bronze" as const,
    pointsBalance: 220,
    favoriteDishes: ["Chicken Milanese"],
    allergies: ["dairy-free"],
    lifetimeSpend: 180,
    averagePreviousSpend: 0,
    promotionEligibility: "Welcome dessert voucher",
  },
  {
    customerId: "cust-004",
    name: "Olivia Chen",
    crmStatus: "returning" as const,
    loyaltyTier: "Silver" as const,
    pointsBalance: 1880,
    favoriteDishes: ["Avocado toast", "Fruit tart"],
    allergies: ["nuts"],
    lifetimeSpend: 2650,
    averagePreviousSpend: 96,
    promotionEligibility: "50% discount until Saturday",
  },
  {
    customerId: "cust-005",
    name: "James Patel",
    crmStatus: "VIP" as const,
    loyaltyTier: "Gold" as const,
    pointsBalance: 5920,
    favoriteDishes: ["Beef tagliata", "Tomato pasta"],
    allergies: [],
    lifetimeSpend: 7340,
    averagePreviousSpend: 168,
    promotionEligibility: "Private wine pairing",
  },
  {
    customerId: "cust-006",
    name: "Ana Torres",
    crmStatus: "returning" as const,
    loyaltyTier: "Silver" as const,
    pointsBalance: 2410,
    favoriteDishes: ["Ice cream trio"],
    allergies: ["high chair"],
    lifetimeSpend: 1980,
    averagePreviousSpend: 84,
    promotionEligibility: "Family lunch bundle",
  },
  {
    customerId: "cust-007",
    name: "Nina Brooks",
    crmStatus: "new" as const,
    loyaltyTier: "Bronze" as const,
    pointsBalance: 0,
    favoriteDishes: ["Rice bowl"],
    allergies: ["birthday note"],
    lifetimeSpend: 0,
    averagePreviousSpend: 0,
    promotionEligibility: "Birthday points bonus",
  },
  {
    customerId: "cust-008",
    name: "Carlos Rojas",
    crmStatus: "returning" as const,
    loyaltyTier: "Gold" as const,
    pointsBalance: 3880,
    favoriteDishes: ["Salmon bowl", "Bread pudding"],
    allergies: ["shellfish", "dairy-free"],
    lifetimeSpend: 4590,
    averagePreviousSpend: 121,
    promotionEligibility: "Double points on salmon bowls from 4-6 PM",
  },
  {
    customerId: "cust-009",
    name: "Priya Shah",
    crmStatus: "returning" as const,
    loyaltyTier: "Silver" as const,
    pointsBalance: 1725,
    favoriteDishes: ["Chicken salad"],
    allergies: ["gluten-free"],
    lifetimeSpend: 2190,
    averagePreviousSpend: 78,
    promotionEligibility: "Lunch loyalty multiplier",
  },
  {
    customerId: "cust-010",
    name: "Robert Kim",
    crmStatus: "new" as const,
    loyaltyTier: "Bronze" as const,
    pointsBalance: 140,
    favoriteDishes: ["Cheese board"],
    allergies: ["nuts"],
    lifetimeSpend: 210,
    averagePreviousSpend: 0,
    promotionEligibility: "First visit appetizer",
  },
  {
    customerId: "cust-011",
    name: "Elena Garcia",
    crmStatus: "VIP" as const,
    loyaltyTier: "Platinum" as const,
    pointsBalance: 10100,
    favoriteDishes: ["Beef short rib", "Avocado salad"],
    allergies: ["dairy-free"],
    lifetimeSpend: 15840,
    averagePreviousSpend: 224,
    promotionEligibility: "Chef table invite",
  },
  {
    customerId: "cust-012",
    name: "Liam Wilson",
    crmStatus: "returning" as const,
    loyaltyTier: "Gold" as const,
    pointsBalance: 4960,
    favoriteDishes: ["Pasta pomodoro", "Ice cream"],
    allergies: ["birthday note"],
    lifetimeSpend: 5120,
    averagePreviousSpend: 132,
    promotionEligibility: "50% discount until Saturday",
  },
];

const menuItems = [
  { menuItemId: "m-1", name: "Beef tagliata", price: 34, ingredients: [{ product: "Beef", quantityKg: 0.32 }, { product: "Tomatoes", quantityKg: 0.08 }] },
  { menuItemId: "m-2", name: "Chicken Milanese", price: 27, ingredients: [{ product: "Chicken", quantityKg: 0.28 }, { product: "Bread", quantityKg: 0.06 }] },
  { menuItemId: "m-3", name: "Salmon bowl", price: 29, ingredients: [{ product: "Salmon", quantityKg: 0.24 }, { product: "Rice", quantityKg: 0.18 }, { product: "Avocado", quantityKg: 0.12 }] },
  { menuItemId: "m-4", name: "Avocado salad", price: 21, ingredients: [{ product: "Avocado", quantityKg: 0.18 }, { product: "Lettuce", quantityKg: 0.12 }, { product: "Cheese", quantityKg: 0.05 }] },
  { menuItemId: "m-5", name: "Pasta pomodoro", price: 24, ingredients: [{ product: "Pasta", quantityKg: 0.22 }, { product: "Tomatoes", quantityKg: 0.16 }] },
  { menuItemId: "m-6", name: "Fruit and ice cream", price: 13, ingredients: [{ product: "Fruit", quantityKg: 0.12 }, { product: "Ice cream", quantityKg: 0.1 }] },
];

const inventoryProducts: InventoryItem[] = [
  { product: "Beef", currentQuantityKg: 18, reorderThresholdKg: 22, expectedUsageKg: 39, orderQuantityKg: 0, estimatedCostUsd: 0, deliveryDay: "Tuesday", plannedDishes: ["Beef tagliata", "Beef short rib", "Red meat tasting"], expectedQuantityToSell: 94 },
  { product: "Chicken", currentQuantityKg: 34, reorderThresholdKg: 20, expectedUsageKg: 31, orderQuantityKg: 0, estimatedCostUsd: 0, deliveryDay: "Monday", plannedDishes: ["Chicken Milanese", "Chicken salad"], expectedQuantityToSell: 86 },
  { product: "Lettuce", currentQuantityKg: 11, reorderThresholdKg: 10, expectedUsageKg: 17, orderQuantityKg: 0, estimatedCostUsd: 0, deliveryDay: "Monday", plannedDishes: ["Avocado salad", "Chicken salad"], expectedQuantityToSell: 112 },
  { product: "Cheese", currentQuantityKg: 8, reorderThresholdKg: 8, expectedUsageKg: 14, orderQuantityKg: 0, estimatedCostUsd: 0, deliveryDay: "Wednesday", plannedDishes: ["Cheese board", "Avocado salad"], expectedQuantityToSell: 58 },
  { product: "Ice cream", currentQuantityKg: 16, reorderThresholdKg: 8, expectedUsageKg: 12, orderQuantityKg: 0, estimatedCostUsd: 0, deliveryDay: "Friday", plannedDishes: ["Fruit and ice cream", "Ice cream trio"], expectedQuantityToSell: 74, promotionRecommendation: "50% discount until Saturday" },
  { product: "Fruit", currentQuantityKg: 20, reorderThresholdKg: 12, expectedUsageKg: 15, orderQuantityKg: 0, estimatedCostUsd: 0, deliveryDay: "Thursday", plannedDishes: ["Fruit tart", "Fruit and ice cream"], expectedQuantityToSell: 64 },
  { product: "Salmon", currentQuantityKg: 21, reorderThresholdKg: 18, expectedUsageKg: 33, orderQuantityKg: 0, estimatedCostUsd: 0, deliveryDay: "Wednesday", plannedDishes: ["Salmon bowl", "Grilled salmon"], expectedQuantityToSell: 90, promotionRecommendation: "Double points on salmon bowls from 4-6 PM" },
  { product: "Avocado", currentQuantityKg: 9, reorderThresholdKg: 12, expectedUsageKg: 19, orderQuantityKg: 0, estimatedCostUsd: 0, deliveryDay: "Monday", plannedDishes: ["Avocado salad", "Salmon bowl", "Avocado toast"], expectedQuantityToSell: 105 },
  { product: "Rice", currentQuantityKg: 42, reorderThresholdKg: 20, expectedUsageKg: 28, orderQuantityKg: 0, estimatedCostUsd: 0, deliveryDay: "Tuesday", plannedDishes: ["Salmon bowl", "Rice bowl"], expectedQuantityToSell: 118 },
  { product: "Tomatoes", currentQuantityKg: 14, reorderThresholdKg: 12, expectedUsageKg: 23, orderQuantityKg: 0, estimatedCostUsd: 0, deliveryDay: "Monday", plannedDishes: ["Pasta pomodoro", "Beef tagliata"], expectedQuantityToSell: 132 },
  { product: "Pasta", currentQuantityKg: 19, reorderThresholdKg: 12, expectedUsageKg: 22, orderQuantityKg: 0, estimatedCostUsd: 0, deliveryDay: "Tuesday", plannedDishes: ["Pasta verde", "Pasta pomodoro"], expectedQuantityToSell: 96 },
  { product: "Bread", currentQuantityKg: 12, reorderThresholdKg: 14, expectedUsageKg: 18, orderQuantityKg: 0, estimatedCostUsd: 0, deliveryDay: "Monday", plannedDishes: ["Chicken Milanese", "Bread pudding"], expectedQuantityToSell: 108 },
];

const staffShifts: StaffShift[] = [
  { shiftId: "s-1", employeeName: "Juan Pedro", role: "waiter", day: "Monday", startTime: "10:00 AM", endTime: "3:00 PM" },
  { shiftId: "s-2", employeeName: "Jose", role: "waiter", day: "Monday", startTime: "3:00 PM", endTime: "10:00 PM" },
  { shiftId: "s-3", employeeName: "Lucia Mendes", role: "cook", day: "Monday", startTime: "9:00 AM", endTime: "4:00 PM" },
  { shiftId: "s-4", employeeName: "Mateo Silva", role: "cook", day: "Monday", startTime: "2:00 PM", endTime: "10:30 PM" },
  { shiftId: "s-5", employeeName: "Camila Ortiz", role: "waiter", day: "Tuesday", startTime: "10:00 AM", endTime: "4:00 PM" },
  { shiftId: "s-6", employeeName: "Jose", role: "waiter", day: "Tuesday", startTime: "4:00 PM", endTime: "10:00 PM" },
  { shiftId: "s-7", employeeName: "Rafael Vega", role: "cook", day: "Tuesday", startTime: "9:00 AM", endTime: "5:00 PM" },
  { shiftId: "s-8", employeeName: "Lucia Mendes", role: "cook", day: "Tuesday", startTime: "3:00 PM", endTime: "11:00 PM" },
  { shiftId: "s-9", employeeName: "Juan Pedro", role: "waiter", day: "Wednesday", startTime: "11:00 AM", endTime: "5:00 PM" },
  { shiftId: "s-10", employeeName: "Nora Castillo", role: "waiter", day: "Wednesday", startTime: "4:00 PM", endTime: "10:30 PM" },
  { shiftId: "s-11", employeeName: "Mateo Silva", role: "cook", day: "Wednesday", startTime: "10:00 AM", endTime: "6:00 PM" },
  { shiftId: "s-12", employeeName: "Rafael Vega", role: "cook", day: "Thursday", startTime: "9:00 AM", endTime: "5:00 PM" },
  { shiftId: "s-13", employeeName: "Sofia Lima", role: "waiter", day: "Thursday", startTime: "3:00 PM", endTime: "10:00 PM" },
  { shiftId: "s-14", employeeName: "Jose", role: "waiter", day: "Friday", startTime: "3:00 PM", endTime: "11:00 PM" },
  { shiftId: "s-15", employeeName: "Nora Castillo", role: "waiter", day: "Friday", startTime: "5:00 PM", endTime: "11:30 PM" },
  { shiftId: "s-16", employeeName: "Lucia Mendes", role: "cook", day: "Friday", startTime: "2:00 PM", endTime: "11:00 PM" },
  { shiftId: "s-17", employeeName: "Mateo Silva", role: "cook", day: "Saturday", startTime: "1:00 PM", endTime: "11:30 PM" },
  { shiftId: "s-18", employeeName: "Camila Ortiz", role: "waiter", day: "Saturday", startTime: "4:00 PM", endTime: "11:30 PM" },
  { shiftId: "s-19", employeeName: "Sofia Lima", role: "waiter", day: "Sunday", startTime: "10:00 AM", endTime: "4:00 PM" },
  { shiftId: "s-20", employeeName: "Rafael Vega", role: "cook", day: "Sunday", startTime: "9:00 AM", endTime: "4:00 PM" },
];

const reservationBlueprints = [
  ["cust-001", "Monday", "7:00 PM", 4, 0, "accepted", "Window 4", "Shellfish allergy", "Confirm seafood-free mise en place"],
  ["cust-002", "Tuesday", "6:30 PM", 2, 0, "accepted", "Bar 2", "Gluten-free pasta requested", "Prepare gluten-free pasta and red meat upsell"],
  ["cust-003", "Tuesday", "8:00 PM", 2, 1, "rejected", "Waitlist", "Dairy-free child menu", "Draft polite waitlist reply"],
  ["cust-004", "Wednesday", "12:30 PM", 3, 0, "accepted", "Patio 1", "Nut allergy", "Offer 50% discount until Saturday"],
  ["cust-005", "Thursday", "7:30 PM", 5, 0, "accepted", "Chef counter", "No restrictions", "Offer private wine pairing"],
  ["cust-006", "Friday", "5:45 PM", 2, 2, "accepted", "Family 3", "High chair", "Stage family bundle and high chair"],
  ["cust-007", "Friday", "8:30 PM", 6, 0, "accepted", "Main 8", "Birthday note", "Draft birthday dessert approval"],
  ["cust-008", "Saturday", "4:30 PM", 2, 0, "accepted", "Patio 2", "Shellfish and dairy-free", "Offer double points on salmon bowls from 4-6 PM"],
  ["cust-009", "Saturday", "7:45 PM", 4, 1, "accepted", "Main 5", "Gluten-free", "Confirm gluten-free bread"],
  ["cust-010", "Sunday", "1:00 PM", 2, 0, "accepted", "Window 1", "Nut allergy", "Offer first visit appetizer"],
  ["cust-011", "Sunday", "7:00 PM", 6, 0, "accepted", "Private room", "Dairy-free VIP tasting", "Ask manager to approve chef table note"],
  ["cust-012", "Thursday", "6:00 PM", 3, 0, "rejected", "Waitlist", "Birthday note", "Send alternative time options"],
];

function makeReservations(offset: number) {
  return reservationBlueprints.map((item, index) => {
    const customer = baseCustomers.find((profile) => profile.customerId === item[0])!;
    const adults = Number(item[3]) + ((index + offset) % 3 === 0 ? 1 : 0);
    const children = Number(item[4]);
    const accepted = item[5] === "accepted";
    return {
      reservationId: `res-${offset}-${index + 1}`,
      customerId: customer.customerId,
      customerName: customer.name,
      day: String(item[1]),
      time: String(item[2]),
      adults,
      children,
      status: accepted ? "accepted" as const : "rejected" as const,
      tableArea: String(item[6]),
      allergiesOrSpecialRequirements: String(item[7]),
      crmStatus: customer.crmStatus,
      isReturning: customer.crmStatus !== "new",
      averagePreviousSpend: customer.averagePreviousSpend,
      promotionStatus: index % 4 === 0 ? "50% discount until Saturday" : customer.promotionEligibility,
      loyaltyTier: customer.loyaltyTier,
      pointsBalance: customer.pointsBalance + offset * 80,
      recommendedAction: String(item[8]),
    };
  });
}

function makeInventory(offset: number): InventoryItem[] {
  const costs: Record<string, number> = {
    Beef: 18,
    Chicken: 8,
    Lettuce: 3,
    Cheese: 7,
    "Ice cream": 5,
    Fruit: 4,
    Salmon: 16,
    Avocado: 6,
    Rice: 2,
    Tomatoes: 3,
    Pasta: 2.5,
    Bread: 2,
  };
  return inventoryProducts.map((item, index) => {
    const expectedUsageKg = item.expectedUsageKg + ((index + offset) % 4) * 1.5;
    const currentQuantityKg = Math.max(4, item.currentQuantityKg - offset + (index % 2));
    const orderQuantityKg = Math.max(0, Math.ceil(expectedUsageKg + item.reorderThresholdKg * 0.35 - currentQuantityKg));
    return {
      ...item,
      currentQuantityKg,
      expectedUsageKg,
      orderQuantityKg,
      estimatedCostUsd: Math.round(orderQuantityKg * (costs[item.product] ?? 4)),
      expectedQuantityToSell: item.expectedQuantityToSell + offset * 4 + (index % 3) * 2,
    };
  });
}

export function makeRestaurantDataSet(weekLabel: string, weekStart: string, offset = 0): RestaurantDataSet {
  return {
    restaurantName: "OyeChef Bistro",
    weekLabel,
    weekStart,
    capacityPerService: 190,
    customers: baseCustomers,
    reservations: makeReservations(offset),
    inventory: makeInventory(offset),
    staffShifts: staffShifts.map((shift, index) => ({ ...shift, shiftId: `${shift.shiftId}-${offset}-${index}` })),
    menuItems,
    posOrders: [
      { orderId: `po-${offset}-1`, day: "Monday", customerId: "cust-001", items: [{ menuItemId: "m-3", quantity: 4 }], total: 116 },
      { orderId: `po-${offset}-2`, day: "Tuesday", customerId: "cust-002", items: [{ menuItemId: "m-1", quantity: 2 }, { menuItemId: "m-5", quantity: 1 }], total: 92 },
      { orderId: `po-${offset}-3`, day: "Friday", customerId: "cust-007", items: [{ menuItemId: "m-6", quantity: 6 }], total: 78 },
      { orderId: `po-${offset}-4`, day: "Saturday", customerId: "cust-008", items: [{ menuItemId: "m-3", quantity: 2 }], total: 58 },
    ],
    loyaltyTransactions: [
      { transactionId: `lt-${offset}-1`, customerId: "cust-001", day: "Monday", points: 180, reason: "VIP reservation spend" },
      { transactionId: `lt-${offset}-2`, customerId: "cust-008", day: "Saturday", points: 220, reason: "Salmon bowl promotion" },
      { transactionId: `lt-${offset}-3`, customerId: "cust-007", day: "Friday", points: 300, reason: "Birthday bonus" },
    ],
  };
}

export const seededReportInputs = [
  makeRestaurantDataSet("Week of June 8", "2026-06-08", 1),
  makeRestaurantDataSet("Week of June 15", "2026-06-15", 2),
  makeRestaurantDataSet("Week of June 22", "2026-06-22", 3),
  makeRestaurantDataSet("Week of June 29", "2026-06-29", 4),
];

export function getCurrentDemoDataSet() {
  return makeRestaurantDataSet("Week of June 29", "2026-06-29", 4);
}

export function cloneWeeklyPlan(plan: WeeklyPlan): WeeklyPlan {
  return JSON.parse(JSON.stringify(plan)) as WeeklyPlan;
}
