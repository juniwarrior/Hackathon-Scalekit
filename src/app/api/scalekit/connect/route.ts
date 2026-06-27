import { NextResponse } from "next/server";
import { getAuthLink, isScalekitLive } from "@/lib/scalekit/live";
import type { ConnectorId } from "@/lib/oyechef-agent/types";

/** Returns the Scalekit OAuth magic link for the manager to authorize a connector. */
export async function GET(request: Request) {
  if (!isScalekitLive()) {
    return NextResponse.json({ error: "Scalekit is not configured." }, { status: 400 });
  }
  const connector = new URL(request.url).searchParams.get("connector") as ConnectorId | null;
  if (!connector) {
    return NextResponse.json({ error: "connector is required" }, { status: 400 });
  }
  const link = await getAuthLink(connector);
  if (!link) {
    return NextResponse.json({ error: "Could not generate an authorization link." }, { status: 502 });
  }
  return NextResponse.json({ link });
}
