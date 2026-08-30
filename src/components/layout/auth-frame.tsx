import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/layout/brand-mark";

export function AuthFrame({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-stage">
      <section className="auth-visual">
        <div className="relative max-w-md">
          <p className="flex items-center gap-2 text-[13px] font-medium tracking-tight text-text">
            <BrandMark className="size-4 text-accent" />
            FlowForge
          </p>
          <h2 className="mt-8 text-4xl font-medium tracking-[-0.05em] text-text">
            Infrastructure for intelligent workflows.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Design, run, and verify automations with a human in the loop. PostgreSQL holds the record. Blockchain, when
            enabled, holds only the proof.
          </p>
        </div>
      </section>
      <main className="relative flex min-h-screen flex-col justify-center px-6 py-16 sm:px-10">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="mx-auto w-full max-w-md">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">{kicker}</p>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.04em]">{title}</h1>
          <p className="mt-2 text-sm text-muted">{description}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
