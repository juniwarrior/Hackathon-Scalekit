import type { ConnectorId } from "@/lib/oyechef-agent/types";
import { connectorDefinitions } from "./connectors";
import type { ConnectorStatus, ScalekitClient } from "./types";

let statuses = connectorDefinitions.map((connector) => ({ ...connector }));

export function createMockScalekitClient(): ScalekitClient {
  return {
    mode: "mock",
    async listConnectors() {
      return statuses;
    },
    async connect(connectorId: ConnectorId) {
      statuses = statuses.map((connector) => connector.id === connectorId ? { ...connector, connected: true } : connector);
      return statuses.find((connector) => connector.id === connectorId) as ConnectorStatus;
    },
    async disconnect(connectorId: ConnectorId) {
      statuses = statuses.map((connector) => connector.id === connectorId ? { ...connector, connected: false } : connector);
      return statuses.find((connector) => connector.id === connectorId) as ConnectorStatus;
    },
  };
}
