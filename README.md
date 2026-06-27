# OyeChef Ops Agent

An AI restaurant operations planner. OyeChef plans the week before service starts — it analyzes inventory, reservations, staff, CRM, demand, and allergies, then drafts the actions (purchase orders, staff emails, promotions) and holds the sensitive ones for manager approval.

Built for the **Scalekit AgentKit** hackathon. The agent connects to real tools through Scalekit, uses **GPT‑5.5** (Azure AI Foundry) as its core model with a multi‑agent weekly report, and stores memory in **Actian VectorAI**.

---

## Highlights

- **Chat‑first agent** — a centered, locked‑bottom composer; ask anything and the agent answers with markdown + inline tool **cards** (reservations, inventory, staff, clients, purchase orders, promotions, allergens). Clicking a sidebar section drops that section's card into the chat.
- **Autonomous "Plan the Week"** — the agent runs a sequence of tool calls through Scalekit (recall memory → read Sheets/Gmail/Calendar/CRM → draft writes), shows the activity feed, and posts the full report as cards.
- **Multi‑agent weekly report** — four specialist agents (Demand, Inventory, Staffing, CRM) run in parallel on GPT‑5.5, and a lead agent synthesizes the summary.
- **Live tool connections via Scalekit** — Gmail, Google Sheets, Google Calendar, and Airtable. Connect each via OAuth, then the agent reads/writes the real apps. Falls back to mock data until connected, so the demo never breaks.
- **Approvals** — a sidebar panel lists every drafted write with Approve / Reject, plus an "auto‑send staff emails" toggle so shift reminders go out without approval.
- **Agent memory (Actian VectorAI)** — recalls preferences, allergies, past weekly summaries, and what worked; live data still comes from the source tools.
- **Staff shift reminders** — an email is scheduled to each employee 10 minutes before their shift; click an employee to see their full history (shifts + emails sent).

---

## Tech stack

- **Next.js (App Router) + React + TypeScript + Tailwind CSS v4** — shadcn‑style UI.
- **Scalekit AgentKit** (`@scalekit-sdk/node`) — tool connections, OAuth, and `executeTool`.
- **GPT‑5.5** via Azure AI Foundry (OpenAI‑compatible Responses API) — deterministic fallback when no key.
- **Actian VectorAI DB** — agent memory (mock fallback when offline).
- Deterministic planner first — the app works fully with **no API keys**.

---

## Architecture

```
src/
  app/
    landing/ login/ onboarding/ permissions/   # flow
    api/
      plan-week/        # autonomous plan + multi-agent report
      agent/            # chat: routes a question -> GPT-5.5 answer + card
      connectors/       # live connector + model + memory status
      scalekit/connect/ # OAuth authorization links
      scalekit/seed/    # push demo data into the connected apps
  components/oyechef/    # dashboard (chat, cards, sidebar, approvals)
  lib/
    oyechef-agent/       # OyeChef's OWN orchestration (no third-party agent code)
      agent.ts           # tools + routing + cards
      orchestrator.ts    # autonomous plan-the-week through the Scalekit gateway
      multi-agent.ts     # specialist agents + lead synthesis (GPT-5.5)
      model.ts           # model client (Responses API, optional)
      planner.ts mock-data.ts types.ts memory.ts
    scalekit/
      live.ts            # real SDK client (status, auth links, executeTool)
      gateway.ts         # tool-call audit trail
      connectors.ts client.ts mock-connectors.ts types.ts
    memory/              # Actian adapter + mock fallback
```

The orchestration layer is **OyeChef's own** — it does not reuse any third‑party agent/orchestration code.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in keys (all optional — app runs on mock data without them)
npm run dev
```

Open http://localhost:3000 → Landing → Login → Onboarding → Permissions → Home. Click **Plan the Week**.

### Environment variables (`.env.local`, git‑ignored)

```bash
# Core model — GPT-5.5 (Azure AI Foundry, OpenAI-compatible Responses API)
OYECHEF_MODEL_URL=
OYECHEF_MODEL_KEY=
OYECHEF_MODEL_NAME=gpt-5.5

# Scalekit AgentKit
SCALEKIT_ENVIRONMENT_URL=
SCALEKIT_CLIENT_ID=
SCALEKIT_CLIENT_SECRET=
SCALEKIT_IDENTIFIER=oyechef-demo
SCALEKIT_CONN_GOOGLE_SHEETS=
SCALEKIT_CONN_GOOGLE_CALENDAR=
SCALEKIT_CONN_GMAIL=
SCALEKIT_CONN_AIRTABLE=

# Actian VectorAI (agent memory)
ACTIAN_VECTOR_URL=
ACTIAN_VECTOR_API_KEY=
```

---

## Connecting live tools

1. Go to **Permissions** → click **Connect (authorize)** on each tool → complete the Scalekit OAuth.
2. Hit **Refresh** — connected tools flip to ✅.
3. Click **Seed demo data** — the agent pushes the demo data into the real apps:
   - **Google Sheets** — a new "OyeChef — Inventory" spreadsheet with inventory rows.
   - **Google Calendar** — one event per reservation for the planned week.
   - **Airtable** — client CRM records into the *Clientes* table.
   - **Gmail** — staff shift‑reminder drafts.

Sensitive writes still require manager approval (see the Approvals panel).

---

## Acceptance

- Runs locally with no TypeScript errors; `npm run build` compiles all routes.
- Works fully on mock data with zero keys; flips each tool/model/memory from `mock` to `live` automatically when keys/connections are added.

Built with Scalekit AgentKit, GPT‑5.5, and Actian VectorAI.
