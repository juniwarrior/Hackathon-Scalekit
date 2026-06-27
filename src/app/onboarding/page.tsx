"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Store } from "lucide-react";
import { Button, Card, Input, SectionHeader } from "@/components/oyechef/ui";

const fields = [
  ["Restaurant name", "restaurantName", "OyeChef Bistro"],
  ["Location name", "locationName", "Downtown"],
  ["Cuisine type", "cuisineType", "Modern Latin Bistro"],
  ["Average weekly covers", "covers", "420"],
  ["Number of staff", "staff", "14"],
  ["Preferred planning day", "planningDay", "Monday"],
  ["Currency", "currency", "USD"],
  ["Timezone", "timezone", "America/Los_Angeles"],
];

export default function OnboardingPage() {
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.currentTarget).entries());
    window.localStorage.setItem("oyechef-onboarding", JSON.stringify({ complete: true, ...formData }));
    router.push("/permissions");
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          eyebrow="Onboarding"
          title="Set up your restaurant workspace"
          description="These details shape weekly planning defaults, mock report assumptions, and future Scalekit connection mapping."
        />
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-xl font-semibold">OyeChef planning profile</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">The MVP stores onboarding locally and sends the manager to permissions. Later this becomes organization setup in Scalekit SaaS Auth.</p>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3"><MapPin className="h-4 w-4 text-muted-foreground" /> Multi-location ready</div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3"><CalendarDays className="h-4 w-4 text-muted-foreground" /> Weekly planning cadence</div>
            </div>
          </Card>
          <Card className="p-6">
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              {fields.map(([label, name, value]) => (
                <label key={name} className="block">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <Input name={name} defaultValue={value} className="mt-2 h-11" />
                </label>
              ))}
              <div className="sm:col-span-2">
                <Button type="submit" className="h-11 w-full sm:w-auto">Continue to permissions</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
