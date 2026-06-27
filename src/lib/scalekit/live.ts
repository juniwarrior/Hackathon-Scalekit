/**
 * Live Scalekit AgentKit client (server-only).
 *
 * Authenticates with the workspace client credentials and exposes the three
 * operations OyeChef needs: connected-account status, OAuth authorization links
 * (so the manager can connect Google/Airtable), and tool execution. Every call
 * is best-effort — if Scalekit is not configured or a connected account doesn't
 * exist yet, callers fall back to mock data so the demo always works.
 */

import { ScalekitClient } from "@scalekit-sdk/node";
import type { ConnectorId } from "@/lib/oyechef-agent/types";

const url = process.env.SCALEKIT_ENVIRONMENT_URL;
const clientId = process.env.SCALEKIT_CLIENT_ID;
const clientSecret = process.env.SCALEKIT_CLIENT_SECRET;

export const SCALEKIT_IDENTIFIER = process.env.SCALEKIT_IDENTIFIER || "oyechef-demo";

/** Maps our connector ids to the connection names in the Scalekit workspace. */
export const connectionNames: Partial<Record<ConnectorId, string>> = {
  google_sheets: process.env.SCALEKIT_CONN_GOOGLE_SHEETS || "",
  google_calendar: process.env.SCALEKIT_CONN_GOOGLE_CALENDAR || "",
  gmail: process.env.SCALEKIT_CONN_GMAIL || "",
  crm: process.env.SCALEKIT_CONN_AIRTABLE || "",
};

export function isScalekitLive(): boolean {
  return Boolean(url && clientId && clientSecret);
}

let cached: ScalekitClient | null = null;
function client(): ScalekitClient | null {
  if (!isScalekitLive()) return null;
  if (!cached) cached = new ScalekitClient(url as string, clientId as string, clientSecret as string);
  return cached;
}

interface ConnectedAccountRow {
  id?: string;
  identifier?: string;
  provider?: string;
  status?: number;
}

/** Scalekit ConnectedAccountStatus.ACTIVE */
const STATUS_ACTIVE = 1;

/** Scalekit provider name -> our connector id. */
const providerToConnector: Record<string, ConnectorId> = {
  GMAIL: "gmail",
  GOOGLESHEETS: "google_sheets",
  GOOGLECALENDAR: "google_calendar",
  AIRTABLE: "crm",
};

async function listAccounts(): Promise<ConnectedAccountRow[]> {
  const c = client();
  if (!c) return [];
  try {
    const res = (await c.actions.listConnectedAccounts({})) as { connectedAccounts?: ConnectedAccountRow[] };
    return res.connectedAccounts ?? [];
  } catch {
    return [];
  }
}

/** Connector ids that have an ACTIVE connected account (authorized via OAuth). */
export async function getConnectedConnectorIds(): Promise<ConnectorId[]> {
  const accounts = await listAccounts();
  const ids = new Set<ConnectorId>();
  for (const account of accounts) {
    if (account.status !== STATUS_ACTIVE || !account.provider) continue;
    const connector = providerToConnector[account.provider.toUpperCase()];
    if (connector) ids.add(connector);
  }
  return [...ids];
}

/** The active connected account for a connector, if any. */
async function accountFor(connectorId: ConnectorId): Promise<ConnectedAccountRow | null> {
  const accounts = await listAccounts();
  return (
    accounts.find(
      (a) =>
        a.status === STATUS_ACTIVE &&
        a.provider &&
        providerToConnector[a.provider.toUpperCase()] === connectorId,
    ) ?? null
  );
}

/** OAuth magic link for the manager to authorize a connector. */
export async function getAuthLink(connectorId: ConnectorId): Promise<string | null> {
  const c = client();
  const conn = connectionNames[connectorId];
  if (!c || !conn) return null;
  try {
    const res = (await c.actions.getAuthorizationLink({
      connectionName: conn,
      identifier: SCALEKIT_IDENTIFIER,
    })) as { link?: string; magicLink?: string };
    return res.link ?? res.magicLink ?? null;
  } catch {
    return null;
  }
}

interface ScopedTool {
  id?: string;
  definition?: { name?: string };
}

/** Tool names available for a connector's active connected account. */
export async function listToolNames(connectorId: ConnectorId): Promise<string[]> {
  const c = client();
  const account = await accountFor(connectorId);
  if (!c || !account?.id) return [];
  try {
    const res = (await c.tools.listTools({
      filter: { connectedAccountId: account.id },
      pageSize: 100,
    })) as { tools?: ScopedTool[] };
    return (res.tools ?? [])
      .map((t) => t.definition?.name ?? t.id ?? "")
      .filter((name): name is string => Boolean(name));
  } catch {
    return [];
  }
}

/** Pick the first available tool whose name matches the keywords. */
export async function findTool(connectorId: ConnectorId, keywords: string[]): Promise<string | null> {
  const names = await listToolNames(connectorId);
  const lower = keywords.map((k) => k.toLowerCase());
  return (
    names.find((name) => lower.every((k) => name.toLowerCase().includes(k))) ??
    names.find((name) => lower.some((k) => name.toLowerCase().includes(k))) ??
    null
  );
}

/** Execute a tool action on the connector's active connected account. Null on failure. */
export async function executeTool(
  connectorId: ConnectorId,
  toolName: string,
  params: Record<string, unknown>,
): Promise<unknown | null> {
  const c = client();
  const account = await accountFor(connectorId);
  if (!c || !account?.id) return null;
  try {
    return await c.tools.executeTool({ toolName, params, connectedAccountId: account.id });
  } catch {
    return null;
  }
}
