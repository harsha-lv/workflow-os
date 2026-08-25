import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getContext } from "@/server/context";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/server/seed";

export default async function LoginPage() {
  const ctx = await getContext();
  if (ctx) redirect("/dashboard");
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Workflow OS</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-muted">
        Run, inspect, and approve automations across your workspace.
      </p>
      <AuthForm mode="login" />
      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link className="text-text underline-offset-4 hover:underline" href="/signup">
          Create a workspace
        </Link>
      </p>
      <p className="mt-8 rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-xs text-muted">
        Demo workspace: <span className="font-mono text-text">{DEMO_EMAIL}</span>
        <br />
        Password: <span className="font-mono text-text">{DEMO_PASSWORD}</span>
      </p>
    </main>
  );
}
