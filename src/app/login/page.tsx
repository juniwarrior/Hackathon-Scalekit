"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, Search, Utensils } from "lucide-react";
import { Button, Card } from "@/components/oyechef/ui";

export default function LoginPage() {
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem("oyechef-session", JSON.stringify({ authenticated: true, email: new FormData(event.currentTarget).get("email") }));
    router.push("/onboarding");
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_0.9fr]">
      <section className="hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <Link href="/landing" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Utensils className="h-4 w-4" />
          </span>
          OyeChef Ops Agent
        </Link>
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-primary">Restaurant manager login</p>
          <h1 className="mt-4 max-w-xl font-serif text-5xl tracking-tight">Forecast demand, staff the week, and approve the plan before service.</h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-sidebar-foreground/70">Mock login keeps the hackathon demo moving while the auth layer is ready for Scalekit SaaS Auth.</p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">Sensitive writes stay gated behind manager approval.</p>
      </section>

      <section className="flex items-center justify-center p-5">
        <Card className="w-full max-w-md p-6">
          <div className="mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-foreground text-background">
              <Utensils className="h-5 w-5" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Log in to your restaurant</h1>
            <p className="mt-2 text-sm text-muted-foreground">For the MVP, any email and password continue to onboarding.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground">Email</span>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-input bg-card px-3 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input name="email" type="email" required defaultValue="manager@oyechef.demo" className="h-11 w-full bg-transparent text-sm outline-none" />
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Password</span>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-input bg-card px-3 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
                <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                <input name="password" type="password" required defaultValue="demo-password" className="h-11 w-full bg-transparent text-sm outline-none" />
              </div>
            </label>
            <Button type="submit" className="h-11 w-full">Log in</Button>
            <Button type="button" variant="secondary" className="h-11 w-full" onClick={() => router.push("/onboarding")}>
              <Search className="h-4 w-4" />
              Continue with Google
            </Button>
          </form>
          <div className="mt-6 flex items-center justify-between text-sm">
            <Link href="/onboarding" className="font-medium text-primary hover:underline">Create restaurant account</Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground">Forgot password?</Link>
          </div>
        </Card>
      </section>
    </main>
  );
}
