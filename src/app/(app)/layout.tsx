import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getContext } from "@/server/context";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  return (
    <AppShell orgName={ctx.org.name} userName={ctx.user.name} role={ctx.role}>
      {children}
    </AppShell>
  );
}
