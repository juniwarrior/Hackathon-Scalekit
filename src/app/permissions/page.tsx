"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Database, RefreshCw, ShieldCheck } from "lucide-react";
import { connectorDefinitions } from "@/lib/scalekit/connectors";
import type { ConnectorStatus } from "@/lib/scalekit/types";
import { Button, Card, Badge, SectionHeader } from "@/components/oyechef/ui";
import { persistConnectorStatuses } from "@/components/oyechef/connected-tools-panel";

interface ConnectorsPayload {
  connectors: ConnectorStatus[];
  mode: "real" | "mock";
}

export default function PermissionsPage() {
  const [statuses, setStatuses] = useState<ConnectorStatus[]>(connectorDefinitions);
  const [mode, setMode] = useState<"real" | "mock">("mock");
  const [busy, setBusy] = useState<string | null>(null);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/connectors");
      if (!res.ok) return;
      const data = (await res.json()) as ConnectorsPayload;
      setStatuses(data.connectors);
      setMode(data.mode);
      persistConnectorStatuses(data.connectors);
    } catch {
      /* keep current */
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function connect(id: ConnectorStatus["id"]) {
    if (mode !== "real") {
      // Demo mode — connect locally.
      const next = statuses.map((s) => (s.id === id ? { ...s, connected: true } : s));
      setStatuses(next);
      persistConnectorStatuses(next);
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/scalekit/connect?connector=${id}`);
      const data = (await res.json()) as { link?: string; error?: string };
      if (data.link) window.open(data.link, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(null);
    }
  }

  async function seedDemoData() {
    setBusy("seed");
    setSeedResult(null);
    try {
      const res = await fetch("/api/scalekit/seed", { method: "POST" });
      const data = (await res.json()) as { seeded?: number; total?: number; error?: string };
      setSeedResult(data.error ? data.error : `Seeded ${data.seeded ?? 0} of ${data.total ?? 0} connected apps.`);
    } catch {
      setSeedResult("Seeding failed — check the connections.");
    } finally {
      setBusy(null);
    }
  }

  function useDemoData() {
    persistConnectorStatuses(statuses);
    window.localStorage.setItem("oyechef-permissions", JSON.stringify({ complete: true, demo: true }));
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Permissions"
          title="Connect tools through Scalekit"
          description="Authorize Gmail, Google Sheets, Google Calendar, and Airtable so OyeChef retrieves live data. Actian VectorAI stores agent memory. Until you connect, the demo runs on mock data."
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={refresh}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
              <Link href="/" onClick={useDemoData}>
                <Button>
                  Use demo data <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          }
        />

        <Card className="mt-6 border-emerald-200 bg-emerald-50 p-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <p className="text-sm leading-6 text-emerald-900">
              {mode === "real"
                ? "Scalekit is live. Click Connect on each tool to authorize it (OAuth). Sensitive writes still require manager approval."
                : "Scalekit credentials are configured per environment. Sensitive actions like sending messages, updating CRM records, and creating purchase orders require manager approval."}
            </p>
          </div>
        </Card>

        {mode === "real" ? (
          <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <p className="text-sm text-foreground">Push the demo data into your connected apps so the agent reads it from there.</p>
            </div>
            <div className="flex items-center gap-3">
              {seedResult ? <span className="text-xs text-muted-foreground">{seedResult}</span> : null}
              <Button size="sm" onClick={seedDemoData} disabled={busy === "seed"}>
                {busy === "seed" ? "Seeding…" : "Seed demo data"}
              </Button>
            </div>
          </Card>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {statuses.map((status) => (
            <Card key={status.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{status.name}</h2>
                    <Badge tone={status.connected ? "success" : "warning"}>{status.connected ? "Connected" : "Not connected"}</Badge>
                    <Badge tone={status.required ? "danger" : "neutral"}>{status.required ? "Required" : "Optional"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {status.id === "actian"
                      ? "Agent memory via Actian VectorAI."
                      : status.mode === "real"
                        ? status.connected
                          ? "Live — OyeChef reads and writes through Scalekit."
                          : "Live connector — authorize it to go live."
                        : "Mock fallback until Scalekit env vars are configured."}
                  </p>
                </div>
                {status.connected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : null}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">What OyeChef will read</h3>
                  <div className="mt-2 space-y-2">
                    {status.read.map((permission) => (
                      <div key={permission.label} className="rounded-lg bg-muted/50 p-3">
                        <p className="text-sm font-medium">{permission.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{permission.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">What OyeChef can write</h3>
                  <div className="mt-2 space-y-2">
                    {status.write.map((permission) => (
                      <div key={permission.label} className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                        <p className="text-sm font-medium">{permission.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{permission.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {status.id === "actian" ? (
                  <Badge tone="neutral">Configured via ACTIAN env</Badge>
                ) : status.connected ? (
                  <Badge tone="success">Authorized</Badge>
                ) : (
                  <Button type="button" size="sm" onClick={() => connect(status.id)} disabled={busy === status.id}>
                    {busy === status.id ? "Opening…" : mode === "real" ? "Connect (authorize)" : "Connect"}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Link href="/" onClick={useDemoData}>
            <Button className="h-11">Continue to Home Dashboard</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
