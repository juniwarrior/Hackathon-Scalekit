import { NextResponse } from "next/server";
import { executeTool, getConnectedConnectorIds, isScalekitLive } from "@/lib/scalekit/live";
import { createWeeklyPlan } from "@/lib/oyechef-agent/planner";
import { getCurrentDemoDataSet } from "@/lib/oyechef-agent/mock-data";
import type { ConnectorId } from "@/lib/oyechef-agent/types";

const DAY_DATES: Record<string, string> = {
  Monday: "2026-06-29",
  Tuesday: "2026-06-30",
  Wednesday: "2026-07-01",
  Thursday: "2026-07-02",
  Friday: "2026-07-03",
  Saturday: "2026-07-04",
  Sunday: "2026-07-05",
};

function to24(time: string): string {
  const m = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return "12:00:00";
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return `${String(h).padStart(2, "0")}:${m[2]}:00`;
}

function firstSheetTitle(result: unknown): string {
  try {
    const text = JSON.stringify(result);
    const matches = [...text.matchAll(/"title":"([^"]+)"/g)].map((x) => x[1]);
    // The spreadsheet title comes first; the tab title is usually the 2nd.
    return matches[1] ?? matches[0] ?? "Sheet1";
  } catch {
    return "Sheet1";
  }
}

function spreadsheetId(result: unknown): string | null {
  const text = JSON.stringify(result ?? {});
  const m = text.match(/"spreadsheet_?[iI]d":"([^"]+)"/);
  return m ? m[1] : null;
}

/** Push the demo data into the connected real apps so the agent reads from there. */
export async function POST() {
  if (!isScalekitLive()) {
    return NextResponse.json({ error: "Scalekit is not configured." }, { status: 400 });
  }
  const connected = new Set(await getConnectedConnectorIds());
  const plan = createWeeklyPlan(getCurrentDemoDataSet());
  const results: Array<{ connector: ConnectorId; ok: boolean; detail: string }> = [];

  // --- Google Sheets: create spreadsheet + append inventory ---
  if (connected.has("google_sheets")) {
    const created = await executeTool("google_sheets", "googlesheets_create_spreadsheet", {
      title: `OyeChef — Inventory (${plan.weekLabel})`,
    });
    const sheetId = spreadsheetId(created);
    if (sheetId) {
      const tab = firstSheetTitle(created);
      const values = [
        ["Product", "Current kg", "Order kg", "Cost USD", "Delivery", "Planned dishes", "Expected sell"],
        ...plan.inventory.map((i) => [
          i.product, i.currentQuantityKg, i.orderQuantityKg, i.estimatedCostUsd, i.deliveryDay,
          i.plannedDishes.join(", "), i.expectedQuantityToSell,
        ]),
      ];
      const appended = await executeTool("google_sheets", "googlesheets_append_values", {
        spreadsheet_id: sheetId,
        range: `'${tab}'!A1`,
        value_input_option: "USER_ENTERED",
        values,
      });
      results.push({ connector: "google_sheets", ok: appended !== null, detail: appended !== null ? `${values.length} rows in a new sheet` : "append failed" });
    } else {
      results.push({ connector: "google_sheets", ok: false, detail: "could not create spreadsheet" });
    }
  } else {
    results.push({ connector: "google_sheets", ok: false, detail: "not connected" });
  }

  // --- Google Calendar: one event per reservation ---
  if (connected.has("google_calendar")) {
    let ok = 0;
    for (const r of plan.reservations) {
      const date = DAY_DATES[r.day];
      if (!date) continue;
      const out = await executeTool("google_calendar", "googlecalendar_create_event", {
        summary: `Reservation — ${r.customerName} (${r.adults + r.children})`,
        start_datetime: `${date}T${to24(r.time)}-07:00`,
        event_duration_minutes: 90,
        description: `${r.status} · ${r.tableArea} · ${r.crmStatus} · ${r.allergiesOrSpecialRequirements}`,
        send_updates: "none",
      });
      if (out !== null) ok += 1;
    }
    results.push({ connector: "google_calendar", ok: ok > 0, detail: `${ok} reservation events` });
  } else {
    results.push({ connector: "google_calendar", ok: false, detail: "not connected" });
  }

  // --- Airtable: client CRM records into the Clientes table ---
  if (connected.has("crm")) {
    const seen = new Set<string>();
    const records = plan.clients
      .filter((c) => (seen.has(c.customerName) ? false : (seen.add(c.customerName), true)))
      .map((c) => ({
        fields: {
          Nombre: c.customerName,
          "Notas Internas": `${c.crmStatus} · ${c.loyaltyTier} · ${c.pointsBalance} pts · gasto medio $${c.averagePreviousSpend}`,
          Alergias:
            c.allergiesOrSpecialRequirements && c.allergiesOrSpecialRequirements.toLowerCase() !== "no restrictions"
              ? c.allergiesOrSpecialRequirements
              : "",
          "Tipo de Cliente": c.crmStatus === "VIP" ? "VIP" : c.isReturning ? "Recurrente" : "Nuevo",
        },
      }));
    const out = await executeTool("crm", "airtable_create_records", {
      base_id: process.env.SCALEKIT_AIRTABLE_BASE_ID || "app16GbpVxwWBSRCp",
      table_id_or_name: process.env.SCALEKIT_AIRTABLE_TABLE || "Clientes",
      records,
      typecast: true,
    });
    results.push({ connector: "crm", ok: out !== null, detail: out !== null ? `${records.length} client records` : "create failed" });
  } else {
    results.push({ connector: "crm", ok: false, detail: "not connected" });
  }

  const seeded = results.filter((r) => r.ok).length;
  return NextResponse.json({ seeded, total: results.length, results });
}
