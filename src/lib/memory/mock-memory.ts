import type { AgentMemory, MemoryRecord, MemorySearchQuery } from "./types";

const records: MemoryRecord[] = [
  {
    id: "mem-1",
    kind: "allergy",
    restaurantId: "rest-demo",
    customerId: "cust-001",
    text: "Maria Alvarez has a shellfish allergy and prefers salmon alternatives prepared away from shellfish.",
    createdAt: "2026-06-01T12:00:00.000Z",
  },
  {
    id: "mem-2",
    kind: "promotion_result",
    restaurantId: "rest-demo",
    text: "50% discount until Saturday moved 68% of dessert overstock in the prior weekly report.",
    createdAt: "2026-06-15T12:00:00.000Z",
  },
  {
    id: "mem-3",
    kind: "manager_approval_preference",
    restaurantId: "rest-demo",
    text: "Manager prefers email over Slack for staff shift reminders, and may auto-send them without approval.",
    createdAt: "2026-06-20T12:00:00.000Z",
  },
  {
    id: "mem-4",
    kind: "weekly_report_summary",
    restaurantId: "rest-demo",
    text: "Week of June 22: 12 reservations, $1,901 expected revenue, red meat order approved on time.",
    createdAt: "2026-06-22T12:00:00.000Z",
  },
  {
    id: "mem-5",
    kind: "customer_preference",
    restaurantId: "rest-demo",
    customerId: "cust-004",
    text: "Derek Lee always requests gluten-free pasta and prefers Bar 2 seating.",
    createdAt: "2026-06-10T12:00:00.000Z",
  },
  {
    id: "mem-6",
    kind: "loyalty_behavior",
    restaurantId: "rest-demo",
    text: "Double points on salmon bowls 4-6 PM drove a 22% lift with returning seafood guests.",
    createdAt: "2026-06-18T12:00:00.000Z",
  },
  {
    id: "mem-7",
    kind: "planning_note",
    restaurantId: "rest-demo",
    text: "Friday and Saturday peak after 7 PM — schedule extra front-of-house coverage.",
    createdAt: "2026-06-24T12:00:00.000Z",
  },
];

export function createMockMemory(): AgentMemory {
  return {
    mode: "mock",
    async store(record) {
      const created: MemoryRecord = {
        ...record,
        id: `mem-${records.length + 1}`,
        createdAt: new Date().toISOString(),
      };
      records.unshift(created);
      return created;
    },
    async search(query: MemorySearchQuery) {
      const text = query.query.toLowerCase();
      return records
        .filter((record) => record.restaurantId === query.restaurantId)
        .filter((record) => !query.kinds?.length || query.kinds.includes(record.kind))
        .filter((record) => record.text.toLowerCase().includes(text) || record.kind.includes(text))
        .slice(0, query.limit ?? 10);
    },
  };
}
