"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const payload = Object.fromEntries(formData.entries());
    const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string; redirect?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Nothing was changed.");
      return;
    }
    router.push(data.redirect ?? "/dashboard");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="mt-8 grid gap-4">
      {mode === "signup" ? (
        <>
          <Field label="Your name">
            <Input name="name" required autoComplete="name" placeholder="Maya Chen" />
          </Field>
          <Field label="Workspace name">
            <Input name="organization" required placeholder="Northstar Labs" />
          </Field>
        </>
      ) : null}
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
      </Field>
      <Field label="Password" hint={mode === "signup" ? "At least 10 characters." : undefined}>
        <Input name="password" type="password" required autoComplete={mode === "login" ? "current-password" : "new-password"} />
      </Field>
      {error ? (
        <p className="rounded-md border border-danger/40 bg-[var(--danger-bg)] px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={pending}>
        {mode === "login" ? "Sign in" : "Create workspace"}
      </Button>
    </form>
  );
}
