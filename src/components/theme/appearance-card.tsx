"use client";

import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "./theme-provider";

export function AppearanceCard() {
  const { preference, resolved } = useTheme();
  return (
    <section className="mt-5">
      <h2 className="section-label">Appearance</h2>
      <div className="panel mt-2 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm">Theme</p>
            <p className="mt-1 text-sm text-muted">
              {preference === "system"
                ? `Following the system, currently ${resolved}.`
                : `Using ${preference} mode.`}
            </p>
          </div>
          <ThemeToggle compact={false} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="overflow-hidden rounded-md border border-border">
            <div className="bg-[#f4f2ee] px-3 py-2">
              <div className="h-1.5 w-10 rounded bg-[#e2dcd3]" />
              <div className="mt-2 h-8 rounded bg-white shadow-[0_1px_0_rgb(40_32_24/0.06)]" />
            </div>
            <p className="bg-bg-sunken px-3 py-1.5 text-[11px] text-muted">Light</p>
          </div>
          <div className="overflow-hidden rounded-md border border-border">
            <div className="bg-[#121214] px-3 py-2">
              <div className="h-1.5 w-10 rounded bg-[#2c2c32]" />
              <div className="mt-2 h-8 rounded bg-[#1c1c20] shadow-[0_8px_16px_rgb(0_0_0/0.35)]" />
            </div>
            <p className="bg-bg-sunken px-3 py-1.5 text-[11px] text-muted">Dark</p>
          </div>
        </div>
      </div>
    </section>
  );
}
