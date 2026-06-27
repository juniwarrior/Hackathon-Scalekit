import type { ConnectorId } from "@/lib/oyechef-agent/types";

export interface ConnectorPermission {
  label: string;
  description: string;
}

export interface ConnectorStatus {
  id: ConnectorId;
  name: string;
  connected: boolean;
  mode: "real" | "mock";
  required: boolean;
  read: ConnectorPermission[];
  write: ConnectorPermission[];
  /** OAuth authorization link when the connector is live but not yet connected. */
  authLink?: string;
}

export interface ScalekitClientConfig {
  clientId?: string;
  clientSecret?: string;
  environmentUrl?: string;
}

export interface ScalekitClient {
  mode: "real" | "mock";
  listConnectors(): Promise<ConnectorStatus[]>;
  connect(connectorId: ConnectorId): Promise<ConnectorStatus>;
  disconnect(connectorId: ConnectorId): Promise<ConnectorStatus>;
}
