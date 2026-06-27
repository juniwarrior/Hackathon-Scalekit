export type MemoryKind =
  | "customer_preference"
  | "allergy"
  | "favorite_dish"
  | "loyalty_behavior"
  | "promotion_result"
  | "manager_approval_preference"
  | "planning_note"
  | "weekly_report_summary";

export interface MemoryRecord {
  id: string;
  kind: MemoryKind;
  restaurantId: string;
  customerId?: string;
  text: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface MemorySearchQuery {
  restaurantId: string;
  query: string;
  kinds?: MemoryKind[];
  limit?: number;
}

export interface AgentMemory {
  mode: "actian" | "mock";
  store(record: Omit<MemoryRecord, "id" | "createdAt">): Promise<MemoryRecord>;
  search(query: MemorySearchQuery): Promise<MemoryRecord[]>;
}
