import { NextResponse } from "next/server";
import { connectorDefinitions } from "@/lib/scalekit/connectors";
import { getConnectedConnectorIds, isScalekitLive, connectionNames } from "@/lib/scalekit/live";
import type { ConnectorStatus } from "@/lib/scalekit/types";
import { getModelStatus } from "@/lib/oyechef-agent/model";
import { createOyeChefMemory } from "@/lib/oyechef-agent/memory";

export async function GET() {
  const live = isScalekitLive();
  let connectors: ConnectorStatus[] = connectorDefinitions;

  if (live) {
    const connected = new Set(await getConnectedConnectorIds());
    connectors = connectorDefinitions.map((connector) => {
      // Only the Scalekit-backed connectors flip to real mode; Actian is its own service.
      if (!(connector.id in connectionNames)) return connector;
      return { ...connector, mode: "real", connected: connected.has(connector.id) };
    });
  }

  const memory = createOyeChefMemory();
  return NextResponse.json({
    connectors,
    mode: live ? "real" : "mock",
    model: getModelStatus(),
    memory: { provider: "actian-vectorai", mode: memory.mode },
  });
}
