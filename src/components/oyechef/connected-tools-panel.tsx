"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Link2, PlugZap, Sparkles } from "lucide-react";
import Link from "next/link";
import { connectorDefinitions } from "@/lib/scalekit/connectors";
import type { ConnectorStatus } from "@/lib/scalekit/types";
import { Button, Card, Badge } from "./ui";

/** Model status is server-only; fetch it so the sidebar reflects the real key. */
function useModelStatus() {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/connectors")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.model) setConnected(Boolean(data.model.connected));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return connected;
}

export function getStoredConnectorStatuses(): ConnectorStatus[] {
  if (typeof window === "undefined") return connectorDefinitions;
  const stored = window.localStorage.getItem("oyechef-connectors");
  if (!stored) return connectorDefinitions;
  try {
    return JSON.parse(stored) as ConnectorStatus[];
  } catch {
    return connectorDefinitions;
  }
}

export function persistConnectorStatuses(statuses: ConnectorStatus[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("oyechef-connectors", JSON.stringify(statuses));
  }
}

export function ConnectedToolsPanel({
  statuses = connectorDefinitions,
  compact = false,
}: {
  statuses?: ConnectorStatus[];
  compact?: boolean;
}) {
  const missingRequired = statuses.some((status) => status.required && !status.connected);
  const actian = statuses.find((status) => status.id === "actian");
  const modelConnected = useModelStatus();

  /* Compact variant lives inside the dark charcoal sidebar */
  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/80">Connected Tools</h3>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {statuses.map((status) => (
            <div key={status.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 text-sidebar-foreground/70">
                {status.id === "actian" ? <Database className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                {status.name}
              </span>
              {status.connected ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              )}
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 text-sidebar-foreground/70">
              <Sparkles className="h-3.5 w-3.5" />
              GPT-5.5 model
            </span>
            {modelConnected ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <span className="text-[10px] font-medium text-sidebar-foreground/50">mock</span>
            )}
          </div>
        </div>
        <Link href="/permissions" className="mt-3 block">
          <span className="flex w-full items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent/50 px-3 py-1.5 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent">
            Manage permissions
          </span>
        </Link>
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Connected Tools</h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {missingRequired ? "Some permissions are missing. You can use demo data or connect tools." : "Core permissions are available for the demo workspace."}
          </p>
        </div>
        <Badge tone={missingRequired ? "warning" : "success"}>{missingRequired ? "Needs review" : "Ready"}</Badge>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {statuses.map((status) => (
          <div key={status.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2">
              {status.id === "actian" ? <Database className="h-4 w-4 text-muted-foreground" /> : <Link2 className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-medium text-foreground">{status.name}</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              {status.connected ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
              {status.id === "actian" && actian?.mode === "mock" ? "mock mode" : status.connected ? "connected" : "not connected"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/permissions">
          <Button variant="secondary" size="sm">Connect tools</Button>
        </Link>
        <Button variant="ghost" size="sm">Use demo data</Button>
      </div>
    </Card>
  );
}
