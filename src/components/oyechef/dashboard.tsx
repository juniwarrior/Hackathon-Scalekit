"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Database,
  Home,
  Loader2,
  Mail,
  Plus,
  Sparkles,
  TableProperties,
  User,
  Users,
  Utensils,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { analysisSteps, seedWeeklyReports } from "@/lib/oyechef-agent/planner";
import {
  routeAgentMessage,
  runAgentTool,
  runEmployeeHistory,
  sectionPrompt,
  sectionToTool,
} from "@/lib/oyechef-agent/agent";
import type { AgentCard, AgentToolId, EmployeeHistory } from "@/lib/oyechef-agent/agent";
import { planWeekAutonomously } from "@/lib/oyechef-agent/orchestrator";
import type { WeeklyReportNarrative } from "@/lib/oyechef-agent/multi-agent";
import type { ToolInvocation } from "@/lib/scalekit/gateway";
import { getCurrentDemoDataSet } from "@/lib/oyechef-agent/mock-data";
import type { InventoryItem, PlanningSection, PurchaseOrder, Reservation, StaffShift, WeeklyPlan } from "@/lib/oyechef-agent/types";
import type { ConnectorStatus } from "@/lib/scalekit/types";
import { connectorDefinitions } from "@/lib/scalekit/connectors";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, NewlyPlannedHighlight, SectionHeader, TableShell } from "./ui";
import { ConnectedToolsPanel, getStoredConnectorStatuses } from "./connected-tools-panel";

type PlanStatus = "idle" | "analyzing" | "complete";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  card?: AgentCard;
  activity?: ToolInvocation[];
  narrative?: WeeklyReportNarrative;
};

/** Lets cards deep in the tree trigger agent actions (e.g. open an employee). */
const AgentActionsContext = createContext<{ onEmployee?: (name: string) => void }>({});

let messageCounter = 0;
function nextMessageId() {
  messageCounter += 1;
  return `msg-${messageCounter}`;
}

const reportSectionTools: AgentToolId[] = [
  "reservations",
  "clients",
  "inventory",
  "staff",
  "purchase_order",
  "promotions",
  "allergens",
];

/** Build the full weekly report as a stack of chat cards. */
function buildReportCards(plan: WeeklyPlan): ChatMessage[] {
  return reportSectionTools
    .map((tool) => runAgentTool(plan, tool))
    .filter((response) => Boolean(response.card))
    .map((response) => ({
      id: nextMessageId(),
      role: "assistant" as const,
      content: "",
      card: response.card,
    }));
}

const navigation: Array<{ id: PlanningSection; label: string; href: string; icon: LucideIcon }> = [
  { id: "home", label: "Home", href: "/", icon: Home },
  { id: "clients", label: "Clients", href: "/clients", icon: Users },
  { id: "inventory", label: "Inventory", href: "/inventory", icon: TableProperties },
  { id: "reservations", label: "Reservations", href: "/reservations", icon: CalendarDays },
  { id: "staff", label: "Staff", href: "/staff", icon: ChefHat },
];

const suggestedQuestions = [
  "Which waiters do I have this week?",
  "Show me the red meat purchase order.",
  "How many reservations do I have on Tuesday?",
  "Are there any allergens?",
];

const tdClass = "px-4 py-3 text-sm text-foreground";

export function OyeChefDashboard({ initialSection = "home" }: { initialSection?: PlanningSection }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<PlanningSection>(initialSection);
  const [planStatus, setPlanStatus] = useState<PlanStatus>("idle");
  const [weeklyReports, setWeeklyReports] = useState<WeeklyPlan[]>([]);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [asking, setAsking] = useState(false);
  const [invocations, setInvocations] = useState<ToolInvocation[]>([]);
  const [approvalDecisions, setApprovalDecisions] = useState<Record<string, "approved" | "rejected" | "sent">>({});
  const [autoSendEmails, setAutoSendEmails] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [connectors, setConnectors] = useState<ConnectorStatus[]>(connectorDefinitions);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      // Report history persists (for the + week picker), but each page load
      // starts a fresh session at "idle" so the manager can plan the week again.
      const storedReports = window.localStorage.getItem("oyechef-weekly-reports");
      const reports = storedReports ? (JSON.parse(storedReports) as WeeklyPlan[]) : seedWeeklyReports();
      setWeeklyReports(reports);
      setCurrentReportId(null);
      setPlanStatus("idle");
      setMessages([]);
      setInvocations([]);
      setApprovalDecisions({});
      setAutoSendEmails(window.localStorage.getItem("oyechef-auto-send-emails") === "true");
      setConnectors(getStoredConnectorStatuses());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("oyechef-weekly-reports", JSON.stringify(weeklyReports));
  }, [weeklyReports, hydrated]);

  const currentReport = useMemo(() => {
    if (!weeklyReports.length) return null;
    return weeklyReports.find((report) => report.reportId === currentReportId) ?? weeklyReports[weeklyReports.length - 1];
  }, [weeklyReports, currentReportId]);

  function navigate(section: PlanningSection, href: string) {
    if (section === "home") {
      setActiveSection("home");
      router.push("/");
      return;
    }
    const tool = sectionToTool[section];
    // When a plan is loaded, a sidebar click drops the section's card into the
    // chat (Jefri-style) instead of leaving the conversation.
    if (currentReport && tool) {
      setActiveSection("home");
      router.push("/");
      runToolIntoChat(tool);
      return;
    }
    setActiveSection(section);
    router.push(href);
  }

  function runToolIntoChat(tool: AgentToolId) {
    // Route through the same server path as typed questions so the card is
    // backed by a live read from the connected app when available.
    void ask(sectionPrompt[tool]);
  }

  function startPlanning() {
    setMessages([]);
    setAsking(false);
    setInvocations([]);
    setApprovalDecisions({});
    setPlanStatus("analyzing");
    setActiveSection("home");
    router.push("/");
  }

  function decideApproval(id: string, decision: "approved" | "rejected" | "sent") {
    setApprovalDecisions((prev) => ({ ...prev, [id]: decision }));
  }

  function toggleAutoSend() {
    setAutoSendEmails((prev) => {
      const next = !prev;
      window.localStorage.setItem("oyechef-auto-send-emails", String(next));
      return next;
    });
  }

  function completePlanning() {
    const run = planWeekAutonomously(getCurrentDemoDataSet());
    const { plan } = run;
    setWeeklyReports((reports) => {
      const withoutDuplicate = reports.filter((report) => report.reportId !== plan.reportId);
      return [...withoutDuplicate, plan];
    });
    setCurrentReportId(plan.reportId);
    setInvocations(run.invocations);
    setPlanStatus("complete");

    const summaryId = nextMessageId();
    const activityId = nextMessageId();
    setMessages([
      {
        id: summaryId,
        role: "assistant",
        content: `Done — I planned ${plan.weekLabel} autonomously through your connected tools. Here's the snapshot:`,
        card: runAgentTool(plan, "summary").card,
      },
      {
        id: activityId,
        role: "assistant",
        content: "",
        activity: run.invocations,
      },
      {
        id: nextMessageId(),
        role: "assistant",
        content: "And here's the full weekly report — reservations, clients, inventory, staff, purchase orders, promotions, and allergens:",
      },
      ...buildReportCards(plan),
    ]);

    // The server reads the live apps + runs the multi-agent report; when it
    // returns, update the snapshot + activity with live counts and append the
    // narrative. Never blocks the instant deterministic report.
    void fetchServerPlan(summaryId, activityId);
  }

  async function fetchServerPlan(summaryId: string, activityId: string) {
    try {
      const response = await fetch("/api/plan-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        plan?: WeeklyPlan;
        invocations?: ToolInvocation[];
        narrative?: WeeklyReportNarrative;
      };
      if (data.invocations) setInvocations(data.invocations);
      setMessages((prev) => {
        const updated = prev.map((m) => {
          if (m.id === summaryId && data.plan) return { ...m, card: runAgentTool(data.plan, "summary").card };
          if (m.id === activityId && data.invocations) return { ...m, activity: data.invocations };
          return m;
        });
        return data.narrative
          ? [...updated, { id: nextMessageId(), role: "assistant" as const, content: "", narrative: data.narrative }]
          : updated;
      });
    } catch {
      /* offline — deterministic report already shown */
    }
  }

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || !currentReport || asking) return;
    const plan = currentReport;
    setMessages((prev) => [...prev, { id: nextMessageId(), role: "user", content: trimmed }]);
    setAsking(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, plan }),
      });
      if (res.ok) {
        const data = (await res.json()) as { text: string; card?: AgentCard | null };
        setMessages((prev) => [
          ...prev,
          { id: nextMessageId(), role: "assistant", content: data.text, card: data.card ?? undefined },
        ]);
      } else {
        const fallback = routeAgentMessage(plan, trimmed);
        setMessages((prev) => [...prev, { id: nextMessageId(), role: "assistant", content: fallback.text, card: fallback.card }]);
      }
    } catch {
      const fallback = routeAgentMessage(plan, trimmed);
      setMessages((prev) => [...prev, { id: nextMessageId(), role: "assistant", content: fallback.text, card: fallback.card }]);
    } finally {
      setAsking(false);
    }
  }

  function showEmployeeHistory(name: string) {
    if (!currentReport || asking) return;
    const response = runEmployeeHistory(currentReport, name);
    setActiveSection("home");
    router.push("/");
    setMessages((prev) => [...prev, { id: nextMessageId(), role: "user", content: `Show me ${name}'s history.` }]);
    setAsking(true);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: nextMessageId(), role: "assistant", content: response.text, card: response.card },
      ]);
      setAsking(false);
    }, 400);
  }

  function loadReport(reportId: string) {
    const report = weeklyReports.find((r) => r.reportId === reportId) ?? null;
    setCurrentReportId(reportId);
    setPlanStatus("complete");
    setHistoryOpen(false);
    setInvocations([]);
    setAsking(false);
    if (report) {
      setMessages([
        {
          id: nextMessageId(),
          role: "assistant",
          content: `Loaded ${report.weekLabel}. Here's the full weekly report:`,
          card: runAgentTool(report, "summary").card,
        },
        ...buildReportCards(report),
      ]);
    } else {
      setMessages([]);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading OyeChef workspace...
      </div>
    );
  }

  const highlightNewPlan = planStatus === "complete" && Boolean(currentReport);

  return (
    <AgentActionsContext.Provider value={{ onEmployee: showEmployeeHistory }}>
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 bg-sidebar text-sidebar-foreground lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Utensils className="h-4.5 w-4.5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">OyeChef</p>
              <p className="text-xs text-sidebar-foreground/60">Ops Agent</p>
            </div>
          </div>
          <nav className="oc-scroll min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
            <p className="px-3 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
              Workspace
            </p>
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id, item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                  {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-sidebar-border p-4">
            <ApprovalsPanel
              invocations={invocations}
              decisions={approvalDecisions}
              autoSendEmails={autoSendEmails}
              onDecide={decideApproval}
              onToggleAutoSend={toggleAutoSend}
            />
          </div>
          <div className="border-t border-sidebar-border p-4">
            <ConnectedToolsPanel statuses={connectors} compact />
          </div>
        </div>
      </aside>

      <div className="flex h-screen min-w-0 flex-1 flex-col lg:pl-64">
        <header className="shrink-0 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Restaurant operations planner</p>
              <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">{currentReport?.weekLabel ?? "Plan the week"}</h1>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Badge tone={planStatus === "complete" ? "success" : planStatus === "analyzing" ? "warning" : "neutral"}>
                {planStatus === "complete" ? "Weekly report loaded" : planStatus === "analyzing" ? "Analyzing" : "No active plan"}
              </Badge>
              <Button variant="secondary" size="sm" onClick={() => navigate("home", "/")}>
                <Home className="h-4 w-4" /> Home
              </Button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:px-6 lg:hidden">
            {navigation.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id, item.href)}
                className={cn(
                  "shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  activeSection === item.id
                    ? "border-transparent bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          {activeSection === "home" ? (
            <HomePlanner
              planStatus={planStatus}
              report={currentReport}
              reports={weeklyReports}
              messages={messages}
              asking={asking}
              historyOpen={historyOpen}
              setHistoryOpen={setHistoryOpen}
              onPlan={startPlanning}
              onAnalysisComplete={completePlanning}
              onAsk={ask}
              onLoadReport={loadReport}
            />
          ) : (
            <div className="oc-scroll h-full overflow-y-auto p-4 md:p-6">
              {activeSection === "clients" && currentReport ? <ClientsSection report={currentReport} highlight={highlightNewPlan} /> : null}
              {activeSection === "inventory" && currentReport ? <InventorySection report={currentReport} highlight={highlightNewPlan} /> : null}
              {activeSection === "reservations" && currentReport ? <ReservationsSection report={currentReport} highlight={highlightNewPlan} /> : null}
              {activeSection === "staff" && currentReport ? <StaffSection report={currentReport} highlight={highlightNewPlan} /> : null}
              {!currentReport ? <EmptyPlan onPlan={startPlanning} /> : null}
            </div>
          )}
        </main>
      </div>
    </div>
    </AgentActionsContext.Provider>
  );
}

function HomePlanner({
  planStatus,
  report,
  reports,
  messages,
  asking,
  historyOpen,
  setHistoryOpen,
  onPlan,
  onAnalysisComplete,
  onAsk,
  onLoadReport,
}: {
  planStatus: PlanStatus;
  report: WeeklyPlan | null;
  reports: WeeklyPlan[];
  messages: ChatMessage[];
  asking: boolean;
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  onPlan: () => void;
  onAnalysisComplete: () => void;
  onAsk: (question: string) => void;
  onLoadReport: (reportId: string) => void;
}) {
  if (planStatus === "analyzing") {
    return (
      <div className="oc-scroll h-full overflow-y-auto p-4 md:p-6">
        <AnalysisProgress onComplete={onAnalysisComplete} />
      </div>
    );
  }

  const hasPlan = planStatus === "complete" && Boolean(report);

  return (
    <div className="flex h-full flex-col">
      {/* Scrolling conversation */}
      <div className="oc-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <AgentConversation
            hasPlan={hasPlan}
            report={report}
            messages={messages}
            asking={asking}
            onPlan={onPlan}
            onAsk={onAsk}
          />
        </div>
      </div>

      {/* Composer locked to the bottom */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3 md:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <Composer
            disabled={asking}
            historyOpen={historyOpen}
            setHistoryOpen={setHistoryOpen}
            reports={reports}
            currentReportId={report?.reportId}
            onLoadReport={onLoadReport}
            onAsk={onAsk}
          />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            OyeChef runs autonomously through Scalekit-connected tools · sensitive actions need manager approval.
          </p>
        </div>
      </div>
    </div>
  );
}

function AgentConversation({
  hasPlan,
  report,
  messages,
  asking,
  onPlan,
  onAsk,
}: {
  hasPlan: boolean;
  report: WeeklyPlan | null;
  messages: ChatMessage[];
  asking: boolean;
  onPlan: () => void;
  onAsk: (question: string) => void;
}) {
  const hasConversation = messages.length > 0 || asking;
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, asking]);

  /* Empty state — centered hero. Shows the big Plan the Week CTA before a plan
     exists, or the greeting + suggested prompts once a plan is ready. */
  if (!hasConversation) {
    return (
      <div className="flex flex-col items-center px-4 py-12 text-center">
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-7 w-7" />
        </span>
        {!hasPlan ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Plan this restaurant week</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              OyeChef analyzes inventory, reservations, staff, CRM promotions, purchase orders, demand, and allergies, then holds sensitive actions for manager approval.
            </p>
            <Button onClick={onPlan} size="lg" className="mt-6 h-12 px-7 text-base">
              <Sparkles className="h-5 w-5" />
              Plan the Week
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Or ask a question below — OyeChef can already read the current week.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Ask OyeChef about {report?.weekLabel}</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              The weekly plan is ready. Pick a prompt or click a section in the sidebar — answers appear here as cards.
            </p>
          </>
        )}
        <div className="mt-6 flex w-full max-w-xl flex-wrap justify-center gap-2">
          {suggestedQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onAsk(question)}
              className="rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* Active conversation — stacked message bubbles and tool cards */
  return (
    <div className="space-y-6 px-1 py-4">
      {!hasPlan ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm text-muted-foreground">Generate the full weekly plan for purchase orders, approvals, and the dashboard.</p>
          <Button onClick={onPlan} size="sm" className="shrink-0">
            <Sparkles className="h-4 w-4" /> Plan the Week
          </Button>
        </div>
      ) : null}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {asking ? <TypingBubble /> : null}
      <div ref={endRef} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lightweight markdown renderer for model answers (bold, italic, code, */
/* lists, headings, links) — no external dependency.                    */
/* ------------------------------------------------------------------ */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[2] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-${key++}`}>{match[2]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-${key++}`}>{match[4]}</em>);
    } else if (match[6] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-${key++}`}>{match[6]}</em>);
    } else if (match[8] !== undefined) {
      nodes.push(
        <code key={`${keyPrefix}-${key++}`} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
          {match[8]}
        </code>,
      );
    } else if (match[10] !== undefined && match[11] !== undefined) {
      nodes.push(
        <a key={`${keyPrefix}-${key++}`} href={match[11]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
          {match[10]}
        </a>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function Markdown({ children }: { children: string }) {
  const lines = children.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: Array<{ ordered: boolean; text: string }> = [];
  let key = 0;

  const flushList = () => {
    if (!listItems.length) return;
    const ordered = listItems[0].ordered;
    const items = listItems.map((item, idx) => (
      <li key={idx}>{renderInline(item.text, `li-${key}-${idx}`)}</li>
    ));
    blocks.push(
      ordered ? (
        <ol key={`b-${key++}`} className="list-decimal space-y-1 pl-5">{items}</ol>
      ) : (
        <ul key={`b-${key++}`} className="list-disc space-y-1 pl-5">{items}</ul>
      ),
    );
    listItems = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    const ulMatch = line.match(/^[-*]\s+(.*)/);
    const olMatch = line.match(/^\d+\.\s+(.*)/);
    const hMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (ulMatch) {
      listItems.push({ ordered: false, text: ulMatch[1] });
      continue;
    }
    if (olMatch) {
      listItems.push({ ordered: true, text: olMatch[1] });
      continue;
    }
    flushList();
    if (hMatch) {
      blocks.push(
        <p key={`b-${key++}`} className="font-semibold text-foreground">{renderInline(hMatch[2], `h-${key}`)}</p>,
      );
    } else {
      blocks.push(<p key={`b-${key++}`}>{renderInline(line, `p-${key}`)}</p>);
    }
  }
  flushList();

  return <div className="space-y-2">{blocks}</div>;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const wide = !isUser && Boolean(message.card || message.activity || message.narrative);
  return (
    <div className={cn("oc-fade-in flex gap-3", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-foreground text-background" : "bg-primary text-primary-foreground",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </span>
      <div className={cn("flex min-w-0 flex-col gap-3", wide ? "w-full" : "max-w-[85%]", isUser && "items-end")}>
        {message.content ? (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm leading-7",
              isUser
                ? "whitespace-pre-line bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground shadow-sm",
            )}
          >
            {isUser ? message.content : <Markdown>{message.content}</Markdown>}
          </div>
        ) : null}
        {message.card ? <AgentCardView card={message.card} /> : null}
        {message.activity ? <AgentActivityCard invocations={message.activity} /> : null}
        {message.narrative ? <AgentNarrativeCard narrative={message.narrative} /> : null}
      </div>
    </div>
  );
}

function AgentNarrativeCard({ narrative }: { narrative: WeeklyReportNarrative }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-primary/15 bg-primary/10 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Multi-agent weekly report</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{narrative.sections.length} specialist agents · lead synthesis</p>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
            narrative.mode === "real"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-border bg-muted/60 text-muted-foreground",
          )}
        >
          <Sparkles className="h-3 w-3" />
          {narrative.model}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Lead summary</p>
          <div className="mt-1 text-sm leading-6 text-foreground">
            <Markdown>{narrative.summary}</Markdown>
          </div>
        </div>
        {narrative.sections.map((section) => (
          <div key={section.agent} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold text-foreground">{section.agent} agent</p>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">
              <Markdown>{section.text}</Markdown>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AgentActivityCard({ invocations }: { invocations: ToolInvocation[] }) {
  const [expanded, setExpanded] = useState(false);
  const writes = invocations.filter((i) => i.direction === "write").length;
  const shown = expanded ? invocations : invocations.slice(0, DEFAULT_CARD_ROWS);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Autonomous agent activity</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {invocations.length} tool calls through Scalekit · {writes} writes held for approval
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          {invocations[0]?.mode === "real" ? "live" : "mock"}
        </span>
      </div>
      <div className="space-y-2 p-4">
        {shown.map((inv) => (
          <div key={inv.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <span
              className={cn(
                "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                inv.direction === "write" ? "bg-amber-500" : "bg-emerald-500",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {inv.actorName} · <span className="font-normal text-muted-foreground">{inv.action}</span>
                </p>
                <span className="shrink-0 text-[11px] text-muted-foreground">{inv.timestamp}</span>
              </div>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{inv.summary}</p>
              {inv.direction === "write" ? (
                <Badge tone="warning" className="mt-1.5">
                  {inv.status === "drafted" ? "drafted" : "needs approval"}
                </Badge>
              ) : null}
            </div>
          </div>
        ))}
        <ExpandToggle expanded={expanded} hidden={invocations.length - DEFAULT_CARD_ROWS} onToggle={() => setExpanded((v) => !v)} />
      </div>
    </Card>
  );
}

function AgentStatusBadge({ status }: { status: string }) {
  const tone = status === "accepted" ? "success" : status === "rejected" ? "warning" : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}

function cardHeaderTone(tool: AgentToolId): string {
  switch (tool) {
    case "reservations":
      return "bg-blue-50 border-blue-100";
    case "clients":
      return "bg-emerald-50 border-emerald-100";
    case "inventory":
      return "bg-amber-50 border-amber-100";
    case "staff":
      return "bg-violet-50 border-violet-100";
    case "purchase_order":
      return "bg-orange-50 border-orange-100";
    case "promotions":
      return "bg-rose-50 border-rose-100";
    case "allergens":
      return "bg-red-50 border-red-100";
    case "revenue":
      return "bg-teal-50 border-teal-100";
    case "memory":
      return "bg-indigo-50 border-indigo-100";
    case "summary":
    default:
      return "bg-primary/10 border-primary/15";
  }
}

function AgentCardView({ card }: { card: AgentCard }) {
  return (
    <Card className="overflow-hidden">
      <div className={cn("flex items-start justify-between gap-3 border-b px-4 py-3", cardHeaderTone(card.tool))}>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
          {card.subtitle ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.subtitle}</p> : null}
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-white/70 px-2 py-0.5 text-[11px] font-medium text-foreground/70">
          <Database className="h-3 w-3" />
          {card.toolLabel}
        </span>
      </div>

      <div className="p-4">
        {card.kind === "reservations" && card.reservations ? (
          <AgentReservationList rows={card.reservations} />
        ) : null}
        {card.kind === "clients" && card.reservations ? (
          <AgentClientList rows={card.reservations} />
        ) : null}
        {card.kind === "inventory" && card.inventory ? (
          <AgentInventoryList rows={card.inventory} />
        ) : null}
        {card.kind === "staff" && card.staff ? <AgentStaffList rows={card.staff} /> : null}
        {card.kind === "employee" && card.employee ? <AgentEmployeeCard employee={card.employee} /> : null}
        {card.kind === "purchase_order" && card.purchaseOrder ? (
          <AgentPurchaseOrder order={card.purchaseOrder} />
        ) : null}
        {card.kind === "metrics" && card.metrics ? <AgentMetricGrid metrics={card.metrics} /> : null}
        {card.kind === "list" && card.items ? <AgentChipList items={card.items} /> : null}
      </div>

      {card.footnote ? (
        <div className="flex items-center gap-2 border-t border-border bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {card.footnote}
        </div>
      ) : null}
    </Card>
  );
}

function ExpandToggle({ expanded, hidden, onToggle }: { expanded: boolean; hidden: number; onToggle: () => void }) {
  if (hidden <= 0) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-center gap-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
    >
      {expanded ? (
        <>
          <ChevronUp className="h-3.5 w-3.5" /> Show less
        </>
      ) : (
        <>
          <ChevronDown className="h-3.5 w-3.5" /> Show all {hidden + DEFAULT_CARD_ROWS}
        </>
      )}
    </button>
  );
}

const DEFAULT_CARD_ROWS = 4;

function AgentReservationList({ rows }: { rows: Reservation[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, DEFAULT_CARD_ROWS);
  return (
    <div className="space-y-2">
      {shown.map((r) => (
        <div key={r.reservationId} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{r.customerName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {r.day} · {r.time} · {r.adults + r.children} guests · {r.tableArea}
              {r.allergiesOrSpecialRequirements && r.allergiesOrSpecialRequirements.toLowerCase() !== "no restrictions"
                ? ` · ${r.allergiesOrSpecialRequirements}`
                : ""}
            </p>
          </div>
          <AgentStatusBadge status={r.status} />
        </div>
      ))}
      <ExpandToggle expanded={expanded} hidden={rows.length - DEFAULT_CARD_ROWS} onToggle={() => setExpanded((v) => !v)} />
    </div>
  );
}

function AgentClientList({ rows }: { rows: Reservation[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, DEFAULT_CARD_ROWS);
  return (
    <div className="space-y-2">
      {shown.map((r) => (
        <div key={r.reservationId} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{r.customerName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {r.loyaltyTier} · {r.pointsBalance.toLocaleString()} pts · avg ${r.averagePreviousSpend}
            </p>
          </div>
          <Badge tone={r.crmStatus === "VIP" ? "brand" : r.isReturning ? "success" : "neutral"}>
            {r.crmStatus === "VIP" ? "VIP" : r.isReturning ? "Returning" : "New"}
          </Badge>
        </div>
      ))}
      <ExpandToggle expanded={expanded} hidden={rows.length - DEFAULT_CARD_ROWS} onToggle={() => setExpanded((v) => !v)} />
    </div>
  );
}

function AgentInventoryList({ rows }: { rows: InventoryItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, DEFAULT_CARD_ROWS);
  return (
    <div className="space-y-2">
      {shown.map((item) => (
        <div key={item.product} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{item.product}</p>
            <p className="truncate text-xs text-muted-foreground">
              {item.currentQuantityKg.toFixed(1)} kg in stock · {item.deliveryDay} delivery
            </p>
          </div>
          <div className="shrink-0 text-right">
            {item.orderQuantityKg > 0 ? (
              <p className="text-sm font-semibold text-primary">+{item.orderQuantityKg} kg</p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">stocked</p>
            )}
            <p className="text-xs text-muted-foreground">${item.estimatedCostUsd}</p>
          </div>
        </div>
      ))}
      <ExpandToggle expanded={expanded} hidden={rows.length - DEFAULT_CARD_ROWS} onToggle={() => setExpanded((v) => !v)} />
    </div>
  );
}

function AgentStaffList({ rows }: { rows: StaffShift[] }) {
  const { onEmployee } = useContext(AgentActionsContext);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, DEFAULT_CARD_ROWS);
  return (
    <div className="space-y-2">
      {shown.map((shift) => (
        <button
          key={shift.shiftId}
          type="button"
          onClick={() => onEmployee?.(shift.employeeName)}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{shift.employeeName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {shift.day} · {shift.startTime}–{shift.endTime}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={shift.role === "cook" ? "warning" : "neutral"}>{shift.role}</Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>
      ))}
      <ExpandToggle expanded={expanded} hidden={rows.length - DEFAULT_CARD_ROWS} onToggle={() => setExpanded((v) => !v)} />
    </div>
  );
}

function AgentEmployeeCard({ employee }: { employee: EmployeeHistory }) {
  const [emailsOpen, setEmailsOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{employee.to}</span>
        </div>
        <Badge tone={employee.role === "cook" ? "warning" : "neutral"}>{employee.role}</Badge>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Shifts worked this week
        </p>
        <div className="space-y-2">
          {employee.shifts.map((shift) => (
            <div key={shift.shiftId} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <span className="text-sm font-medium text-foreground">{shift.day}</span>
              <span className="text-xs text-muted-foreground">{shift.startTime} – {shift.endTime}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Reminder emails sent ({employee.emails.length})
        </p>
        <div className="space-y-2">
          {(emailsOpen ? employee.emails : employee.emails.slice(0, DEFAULT_CARD_ROWS)).map((email) => (
            <div key={email.id} className="rounded-lg border border-border bg-card px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {email.subject}
                </p>
                <Badge tone="success">{email.sentAt}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                To {email.to} · sent 10 min before the {email.day} shift ({email.shiftTime})
              </p>
            </div>
          ))}
          <ExpandToggle
            expanded={emailsOpen}
            hidden={employee.emails.length - DEFAULT_CARD_ROWS}
            onToggle={() => setEmailsOpen((v) => !v)}
          />
        </div>
      </div>
    </div>
  );
}

function AgentPurchaseOrder({ order }: { order: PurchaseOrder }) {
  const facts: Array<[string, string]> = [
    ["Quantity", `${order.quantityKg} kg`],
    ["Estimated cost", `$${order.estimatedCostUsd.toLocaleString()}`],
    ["Vendor", order.vendor],
    ["Delivery", order.deliveryDay],
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Planned dishes</p>
        <p className="mt-1 text-sm text-foreground">{order.plannedDishes.join(", ")}</p>
      </div>
    </div>
  );
}

function AgentMetricGrid({ metrics }: { metrics: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">{metric.label}</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">{metric.value}</p>
        </div>
      ))}
    </div>
  );
}

function AgentChipList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Nothing flagged for this week.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground">
          {item}
        </span>
      ))}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function Composer({
  disabled,
  historyOpen,
  setHistoryOpen,
  reports,
  currentReportId,
  onLoadReport,
  onAsk,
}: {
  disabled: boolean;
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  reports: WeeklyPlan[];
  currentReportId?: string;
  onLoadReport: (reportId: string) => void;
  onAsk: (question: string) => void;
}) {
  const [value, setValue] = useState("");
  const canSend = Boolean(value.trim()) && !disabled;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;
    onAsk(value);
    setValue("");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        onAsk(value);
        setValue("");
      }
    }
  }

  return (
    <div className="relative">
      <form
        onSubmit={submit}
        className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm transition-all focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20"
      >
        <button
          type="button"
          aria-label="Choose weekly report"
          onClick={() => setHistoryOpen(!historyOpen)}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
            historyOpen
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Plus className="h-5 w-5" />
        </button>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ask about clients, inventory, staff, purchase orders, allergens, promotions..."
          disabled={disabled}
          className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:text-muted-foreground/60"
        />
        <Button type="submit" disabled={!canSend} size="icon" className="rounded-xl" aria-label="Send question">
          <ArrowUp className="h-4 w-4" />
        </Button>
      </form>

      {historyOpen ? (
        <>
          <button
            type="button"
            aria-label="Close report list"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setHistoryOpen(false)}
          />
          <Card className="absolute bottom-[3.75rem] left-0 z-20 w-full max-w-sm p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Choose a weekly report</p>
              <button type="button" onClick={() => setHistoryOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {[...reports].reverse().map((reportItem) => (
                <button
                  key={reportItem.reportId}
                  type="button"
                  onClick={() => onLoadReport(reportItem.reportId)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    reportItem.reportId === currentReportId
                      ? "border-primary/30 bg-primary/5 text-foreground"
                      : "border-border bg-card hover:bg-accent",
                  )}
                >
                  <span className="font-medium">{reportItem.weekLabel}</span>
                  <span className="text-xs text-muted-foreground">{reportItem.summary.reservationCount} reservations</span>
                </button>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function AnalysisProgress({ onComplete }: { onComplete: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= analysisSteps.length) {
      const timeout = window.setTimeout(onComplete, 500);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => setActiveIndex((index) => index + 1), 700);
    return () => window.clearTimeout(timeout);
  }, [activeIndex, onComplete]);

  const progress = Math.min(100, Math.round((activeIndex / analysisSteps.length) * 100));

  return (
    <Card className="mx-auto max-w-4xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge tone="warning">Analyzing</Badge>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">OyeChef is planning your restaurant week</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">The agent is reading demo restaurant data, calculating demand, and preparing actions that require manager approval.</p>
        </div>
        <Loader2 className="h-7 w-7 shrink-0 animate-spin text-primary" />
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-6 grid gap-3">
        {analysisSteps.map((step, index) => {
          const completed = index < activeIndex;
          const active = index === activeIndex;
          return (
            <div key={step.id} className={cn("flex items-start gap-3 rounded-lg border p-4 transition-colors", completed && "border-emerald-200 bg-emerald-50", active && "border-amber-200 bg-amber-50", !completed && !active && "border-border bg-muted/40")}>
              <div className="mt-0.5">
                {completed ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : active ? <Loader2 className="h-5 w-5 animate-spin text-amber-600" /> : <Clock className="h-5 w-5 text-muted-foreground/50" />}
              </div>
              <div>
                <p className="font-semibold">{step.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ClientsSection({ report, highlight }: { report: WeeklyPlan; highlight?: boolean }) {
  return (
    <NewlyPlannedHighlight active={highlight}>
      <Card className="overflow-hidden">
        <div className="p-5">
          <SectionHeader title="Clients" description="Reservation client context with CRM, loyalty points, allergies, promotion status, and acceptance state." />
        </div>
        <TableShell columns={["Day", "Time", "Adults", "Children", "Allergies / requirements", "Status", "Client", "Avg spend", "Promotion", "Loyalty"]}>
          {report.clients.map((client) => (
            <tr key={client.reservationId} className="transition-colors hover:bg-muted/40">
              <td className={cn(tdClass, "font-medium")}>{client.day}</td>
              <td className={tdClass}>{client.time}</td>
              <td className={tdClass}>{client.adults}</td>
              <td className={tdClass}>{client.children}</td>
              <td className={tdClass}>{client.allergiesOrSpecialRequirements}</td>
              <td className={tdClass}><Badge tone={client.status === "accepted" ? "success" : "warning"}>{client.status}</Badge></td>
              <td className={tdClass}>{client.isReturning ? "Returning" : "New"} {client.crmStatus === "VIP" ? "VIP" : ""}</td>
              <td className={tdClass}>${client.averagePreviousSpend}</td>
              <td className={tdClass}>{client.promotionStatus}</td>
              <td className={tdClass}>{client.loyaltyTier}, {client.pointsBalance.toLocaleString()} pts</td>
            </tr>
          ))}
        </TableShell>
      </Card>
    </NewlyPlannedHighlight>
  );
}

function InventorySection({ report, highlight }: { report: WeeklyPlan; highlight?: boolean }) {
  return (
    <NewlyPlannedHighlight active={highlight}>
      <Card className="overflow-hidden">
        <div className="p-5">
          <SectionHeader title="Inventory" description="Purchase planning with expected weekly usage, cost, delivery timing, planned dishes, and promotion logic for overstock or expiring items." />
        </div>
        <TableShell columns={["Product", "Current kg", "Order kg", "Cost", "Delivery", "Planned dishes", "Expected sell", "Promotion logic"]}>
          {report.inventory.map((item) => (
            <tr key={item.product} className="transition-colors hover:bg-muted/40">
              <td className={cn(tdClass, "font-medium")}>{item.product}</td>
              <td className={tdClass}>{item.currentQuantityKg.toFixed(1)}</td>
              <td className={tdClass}>{item.orderQuantityKg}</td>
              <td className={tdClass}>${item.estimatedCostUsd}</td>
              <td className={tdClass}>{item.deliveryDay}</td>
              <td className={tdClass}>{item.plannedDishes.join(", ")}</td>
              <td className={tdClass}>{item.expectedQuantityToSell}</td>
              <td className={tdClass}>{item.promotionRecommendation ?? (item.orderQuantityKg > 0 ? "No promo; reorder needed" : "Monitor sell-through")}</td>
            </tr>
          ))}
        </TableShell>
      </Card>
    </NewlyPlannedHighlight>
  );
}

function ReservationsSection({ report, highlight }: { report: WeeklyPlan; highlight?: boolean }) {
  return (
    <NewlyPlannedHighlight active={highlight}>
      <Card className="overflow-hidden">
        <div className="p-5">
          <SectionHeader title="Reservations" description="Operational weekly reservation view for tables, areas, customer status, special requirements, and recommended action." />
        </div>
        <TableShell columns={["Customer", "Day", "Time", "Party", "Adults", "Children", "Status", "Table / area", "Allergy / requirement", "CRM", "Recommended action"]}>
          {report.reservations.map((reservation) => (
            <tr key={reservation.reservationId} className="transition-colors hover:bg-muted/40">
              <td className={cn(tdClass, "font-medium")}>{reservation.customerName}</td>
              <td className={tdClass}>{reservation.day}</td>
              <td className={tdClass}>{reservation.time}</td>
              <td className={tdClass}>{reservation.adults + reservation.children}</td>
              <td className={tdClass}>{reservation.adults}</td>
              <td className={tdClass}>{reservation.children}</td>
              <td className={tdClass}><Badge tone={reservation.status === "accepted" ? "success" : "warning"}>{reservation.status}</Badge></td>
              <td className={tdClass}>{reservation.tableArea}</td>
              <td className={tdClass}>{reservation.allergiesOrSpecialRequirements}</td>
              <td className={tdClass}>{reservation.crmStatus}</td>
              <td className={tdClass}>{reservation.recommendedAction}</td>
            </tr>
          ))}
        </TableShell>
      </Card>
    </NewlyPlannedHighlight>
  );
}

function StaffSection({ report, highlight }: { report: WeeklyPlan; highlight?: boolean }) {
  const { onEmployee } = useContext(AgentActionsContext);
  return (
    <NewlyPlannedHighlight active={highlight}>
      <Card className="overflow-hidden">
        <div className="p-5">
          <SectionHeader title="Staff" description="Weekly schedule showing cooks and waiters by day and shift window. Click a name to see their history and the reminder emails sent." />
        </div>
        <TableShell columns={["Employee name", "Role", "Day", "Start time", "End time"]}>
          {report.staffShifts.map((shift) => (
            <tr key={shift.shiftId} className="transition-colors hover:bg-muted/40">
              <td className={tdClass}>
                <button
                  type="button"
                  onClick={() => onEmployee?.(shift.employeeName)}
                  className="flex items-center gap-1 font-medium text-foreground hover:text-primary hover:underline"
                >
                  {shift.employeeName}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </td>
              <td className={tdClass}><Badge tone={shift.role === "cook" ? "warning" : "neutral"}>{shift.role}</Badge></td>
              <td className={tdClass}>{shift.day}</td>
              <td className={tdClass}>{shift.startTime}</td>
              <td className={tdClass}>{shift.endTime}</td>
            </tr>
          ))}
        </TableShell>
      </Card>
    </NewlyPlannedHighlight>
  );
}

const writeLabels: Record<string, string> = {
  draftPurchaseOrders: "Purchase orders",
  scheduleShiftReminders: "Staff shift emails",
  draftReservationReplies: "Reservation replies",
  draftPromotion: "Salmon points promo",
};

function ApprovalsPanel({
  invocations,
  decisions,
  autoSendEmails,
  onDecide,
  onToggleAutoSend,
}: {
  invocations: ToolInvocation[];
  decisions: Record<string, "approved" | "rejected" | "sent">;
  autoSendEmails: boolean;
  onDecide: (id: string, decision: "approved" | "rejected" | "sent") => void;
  onToggleAutoSend: () => void;
}) {
  const writes = invocations.filter((i) => i.direction === "write");

  function effectiveStatus(inv: ToolInvocation): "pending" | "approved" | "rejected" | "sent" {
    if (inv.action === "scheduleShiftReminders" && autoSendEmails && !decisions[inv.id]) return "sent";
    return decisions[inv.id] ?? "pending";
  }

  const pending = writes.filter((w) => effectiveStatus(w) === "pending").length;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/80">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          Approvals
        </h3>
        {pending > 0 ? (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">{pending} pending</span>
        ) : (
          <span className="text-[10px] font-medium text-sidebar-foreground/40">all clear</span>
        )}
      </div>

      {/* Auto-send staff emails toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={autoSendEmails}
        onClick={onToggleAutoSend}
        className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent"
      >
        <span className="flex items-center gap-2 text-[11px] text-sidebar-foreground/80">
          <Mail className="h-3.5 w-3.5" />
          Auto-send staff emails
        </span>
        <span className={cn("relative h-4 w-7 shrink-0 rounded-full transition-colors", autoSendEmails ? "bg-emerald-500" : "bg-sidebar-foreground/25")}>
          <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform", autoSendEmails ? "translate-x-[0.875rem]" : "translate-x-0.5")} />
        </span>
      </button>

      {writes.length === 0 ? (
        <p className="mt-3 text-[11px] leading-5 text-sidebar-foreground/40">
          Plan the week to see actions the agent drafted for your approval.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {writes.map((inv) => {
            const status = effectiveStatus(inv);
            const isEmail = inv.action === "scheduleShiftReminders";
            const label = writeLabels[inv.action] ?? inv.action;
            return (
              <div key={inv.id} className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-medium text-sidebar-foreground/90">{label}</span>
                  {status !== "pending" ? (
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        status === "rejected"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-emerald-500/20 text-emerald-300",
                      )}
                    >
                      {status === "sent" ? "sent" : status}
                    </span>
                  ) : null}
                </div>
                {status === "pending" ? (
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onDecide(inv.id, isEmail ? "sent" : "approved")}
                      className="flex-1 rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
                    >
                      {isEmail ? "Send" : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecide(inv.id, "rejected")}
                      className="rounded-md bg-sidebar-foreground/10 px-2 py-1 text-[11px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-foreground/20"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyPlan({ onPlan }: { onPlan: () => void }) {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-2xl font-semibold">No weekly plan is loaded yet.</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Generate the weekly report from Home before opening operational sections.</p>
      <Button onClick={onPlan} className="mt-6">
        <Sparkles className="h-4 w-4" /> Plan the Week
      </Button>
    </Card>
  );
}
