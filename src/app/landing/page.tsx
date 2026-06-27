import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Database,
  LockKeyhole,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  TableProperties,
  Users,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, Button, Card, SectionHeader } from "@/components/oyechef/ui";

const features = [
  "Weekly planning",
  "Inventory forecasting",
  "Staff scheduling",
  "Reservation intelligence",
  "CRM loyalty points",
  "Promotions for unsold food",
  "Purchase order drafting",
  "Approval gates",
  "Audit trail",
];

const tools: Array<{ name: string; description: string; icon: LucideIcon }> = [
  { name: "Google Sheets", description: "Inventory, POS sales, and staff schedules", icon: TableProperties },
  { name: "Gmail", description: "Vendor, reservation, and promotion emails", icon: Mail },
  { name: "Google Calendar", description: "Reservations and catering events", icon: CalendarCheck },
  { name: "Slack", description: "Staff messages and shift instructions", icon: MessageSquare },
  { name: "Airtable", description: "CRM, loyalty points, customer promotions", icon: Users },
  { name: "Actian VectorAI DB", description: "Agent memory and planning notes", icon: Database },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/landing" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
              <Utensils className="h-4 w-4" />
            </span>
            OyeChef Ops Agent
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#preview" className="transition-colors hover:text-foreground">Preview</a>
            <a href="#tools" className="transition-colors hover:text-foreground">Tools</a>
            <a href="#security" className="transition-colors hover:text-foreground">Security</a>
          </div>
          <Link href="/login">
            <Button>Plan My Restaurant Week</Button>
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-12 pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pt-20">
        <div>
          <Badge tone="red">AI restaurant manager for weekly service</Badge>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[1.1] tracking-tight md:text-6xl">
            OyeChef plans your restaurant week before service starts.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Connect inventory, reservations, staff schedules, CRM, email, and Slack. OyeChef forecasts demand, recommends promotions, drafts purchase orders, and asks for approval before taking action.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login">
              <Button size="lg">
                Plan My Restaurant Week <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="secondary" size="lg">View Demo</Button>
            </Link>
          </div>
        </div>

        <Card id="preview" className="overflow-hidden border-transparent bg-sidebar p-3 text-sidebar-foreground shadow-lg">
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-4">
            <div className="flex items-center justify-between border-b border-sidebar-border pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Weekly plan</p>
                <h2 className="mt-1 text-xl font-semibold">Week of June 29</h2>
              </div>
              <Badge tone="success">Manager review ready</Badge>
            </div>
            <div className="grid gap-3 py-4 sm:grid-cols-3">
              {[
                ["Reservations", "12"],
                ["Expected guests", "45"],
                ["Revenue", "$2.1k"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
                  <p className="text-xs text-sidebar-foreground/60">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr]">
              <div className="rounded-lg bg-card p-4 text-card-foreground">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Purchase planning</p>
                  <Badge tone="warning">Approval required</Badge>
                </div>
                <div className="space-y-3">
                  {["Beef 25 kg, Tuesday delivery", "Salmon 18 kg, Wednesday delivery", "Avocado 14 kg, Monday delivery"].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-4">
                <p className="text-sm font-semibold">AI recommendations</p>
                <div className="mt-3 space-y-3 text-sm leading-6 text-sidebar-foreground/80">
                  <p>Double points on salmon bowls from 4-6 PM.</p>
                  <p>Confirm nut, shellfish, gluten-free, and birthday notes.</p>
                  <p>Draft Slack instructions for Friday peak shift.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="border-y border-border bg-card py-14">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-3">
          {["Analyze the week", "Recommend actions", "Ask for approval"].map((title, index) => (
            <Card key={title} className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary">{index + 1}</div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {index === 0 && "OyeChef reads inventory, reservations, schedules, CRM, POS orders, allergies, and loyalty points."}
                {index === 1 && "It forecasts demand, drafts purchase orders, flags allergen risks, and suggests promotions for unsold food."}
                {index === 2 && "Sensitive writes stay as drafts until a manager approves messages, CRM updates, replies, or purchase orders."}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section id="tools" className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeader
          eyebrow="Connected tools"
          title="Built for Scalekit-connected restaurant operations"
          description="The MVP uses demo adapters when credentials are missing, while the architecture shows exactly where real tool permissions connect later."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map(({ name, description, icon: Icon }) => (
            <Card key={name} className="p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-sidebar py-16 text-sidebar-foreground">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <Badge tone="brand">Key features</Badge>
            <h2 className="mt-4 font-serif text-3xl tracking-tight">Operational planning, not a generic chat screen.</h2>
            <p className="mt-4 text-sm leading-6 text-sidebar-foreground/70">
              OyeChef turns weekly restaurant data into tables, approval queues, audit events, and actionable recommendations.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="mx-auto grid max-w-7xl gap-6 px-5 py-16 md:grid-cols-3">
        <Card className="p-6 md:col-span-2">
          <LockKeyhole className="h-5 w-5 text-primary" />
          <h2 className="mt-4 text-2xl font-semibold">Security and permissions</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            OyeChef only accesses tools you connect. Sensitive actions like sending messages, approving reservations, updating CRM records, and creating purchase orders require manager approval.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {["Staff messages require approval", "Promotions require approval", "Reservation replies require approval", "Purchase orders require approval"].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <Star className="h-5 w-5 text-amber-500" />
          <h2 className="mt-4 text-2xl font-semibold">CRM loyalty points</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Segment new, returning, and VIP guests with points balances, favorite dishes, allergies, and promotion eligibility.
          </p>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16">
        <div className="rounded-2xl bg-primary px-6 py-10 text-primary-foreground md:px-10">
          <Sparkles className="h-6 w-6" />
          <h2 className="mt-4 max-w-3xl font-serif text-3xl">Plan the week from demo data now, then connect restaurant tools when ready.</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login">
              <Button variant="secondary">Plan My Restaurant Week</Button>
            </Link>
            <Link href="/">
              <Button className="bg-foreground text-background hover:bg-foreground/90">View Demo</Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
