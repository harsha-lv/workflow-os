"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Attention = {
  items: Array<{ title: string; href: string }>;
  running: Array<{ id: string }>;
};

export function SystemStatus() {
  const [data, setData] = useState<Attention | null>(null);
  useEffect(() => {
    void fetch("/api/ops/attention")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setData(json as Attention | null));
  }, []);
  if (!data) return null;
  const attention = data.items.length;
  const running = data.running.length;
  const ok = attention === 0;
  return (
    <Link
      href={ok ? "/dashboard" : data.items[0]?.href ?? "/runs"}
      className="hidden items-center gap-1.5 text-[11px] text-muted hover:text-text lg:flex"
    >
      <span className={cn("size-1.5 rounded-full", ok ? "bg-success" : "bg-warning", running ? "status-dot is-running bg-info" : "")} />
      {running ? `${running} running` : ok ? "All systems operational" : `${attention} need attention`}
    </Link>
  );
}
