"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Blocks,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Menu,
  PanelLeft,
  Plug,
  Search,
  Settings,
  Workflow,
} from "lucide-react";
import { useCallback, useState } from "react";
import { CommandPalette, type SearchHit } from "@/components/search/command-palette";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import { PageEnter } from "@/components/layout/page-enter";
import { SystemStatus } from "@/components/layout/system-status";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { SIDEBAR_STORAGE_KEY } from "@/lib/theme";
import { BrandMark } from "@/components/layout/brand-mark";

const NAV = [
  {
    label: "Build",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/workflows", label: "Workflows", icon: Workflow },
      { href: "/templates", label: "Templates", icon: Blocks },
    ],
  },
  {
    label: "Operate",
    items: [
      { href: "/runs", label: "Runs", icon: Activity },
      { href: "/approvals", label: "Approvals", icon: CheckSquare },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AppShell({
  orgName,
  userName,
  role,
  children,
}: {
  orgName: string;
  userName: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  });
  const [hits, setHits] = useState<SearchHit[]>([]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const onSearch = useCallback(async (q: string) => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { hits: SearchHit[] };
    setHits(data.hits);
  }, []);

  const editor = pathname.startsWith("/workflows/") && pathname !== "/workflows/new" && pathname !== "/workflows";

  return (
    <div className="min-h-screen bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen">
        {menu ? (
          <button
            type="button"
            className="command-overlay fixed inset-0 z-30 md:hidden"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          />
        ) : null}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex-col border-r border-border bg-bg-elevated/80 px-2.5 py-4 backdrop-blur-xl md:static md:flex",
            collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar)]",
            "transition-[width,transform] duration-[var(--duration)] ease-[var(--ease)]",
            menu ? "flex" : "hidden md:flex",
          )}
          suppressHydrationWarning
        >
          <div className={cn("flex h-9 items-center", collapsed ? "justify-center" : "justify-between px-1.5")}>
            <Link
              href="/dashboard"
              className={cn("flex items-center gap-2 truncate text-[13px] font-medium tracking-tight", collapsed && "justify-center")}
            >
              <BrandMark className="size-4 shrink-0 text-accent" />
              {collapsed ? <span className="sr-only">FlowForge</span> : "FlowForge"}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={collapsed}
            >
              <PanelLeft className={cn("size-3.5 transition-transform duration-[var(--duration)]", collapsed && "rotate-180")} />
            </Button>
          </div>
          {collapsed ? null : (
            <p className="mt-0.5 truncate px-1.5 text-[11px] text-faint">{orgName}</p>
          )}
          <nav className="mt-4">
            {NAV.map((group) => (
              <div key={group.label} className={cn("mb-3", collapsed && "mb-2")}>
                {collapsed ? null : <p className="section-label mb-1 px-1.5">{group.label}</p>}
                <div className="grid gap-px">
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    const link = (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenu(false)}
                        aria-current={active ? "page" : undefined}
                        aria-label={item.label}
                        className={cn("nav-item", collapsed && "justify-center px-0")}
                      >
                        <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
                        {collapsed ? null : item.label}
                      </Link>
                    );
                    return collapsed ? (
                      <Tooltip key={item.href} content={item.label}>
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-auto space-y-2 pt-4">
            <div className={cn("flex", collapsed ? "justify-center" : "px-1")}>
              <ThemeToggle />
            </div>
            <div className={cn("flex items-center gap-2 rounded-md py-1.5", collapsed ? "justify-center px-0" : "px-1.5")}>
              <div className="flex size-7 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-medium text-text">
                {initials(userName)}
              </div>
              {collapsed ? null : (
                <div className="min-w-0">
                  <p className="truncate text-[13px] leading-tight">{userName}</p>
                  <p className="truncate text-[11px] capitalize text-faint">{role}</p>
                </div>
              )}
            </div>
            {collapsed ? null : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  router.push("/login");
                }}
              >
                Sign out
              </Button>
            )}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-bg/55 px-3 backdrop-blur-xl md:px-6">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenu((v) => !v)} aria-label="Open navigation">
              <Menu className="size-4" />
            </Button>
            <button type="button" onClick={() => setOpen(true)} className="search-trigger md:max-w-xl" aria-label="Search or jump to">
              <Search className="size-3.5" strokeWidth={1.75} />
              <span className="truncate">Search or jump to…</span>
              <span className="ml-auto hidden items-center gap-1 sm:inline-flex">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
            <div className="ml-auto flex items-center gap-3">
              <SystemStatus />
              <div className="hidden sm:block md:hidden">
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main id="main" className={cn("flex-1", editor ? "" : "px-4 py-5 md:px-6")}>
            {editor ? children : <PageEnter>{children}</PageEnter>}
          </main>
        </div>
      </div>
      <CommandPalette open={open} onOpenChange={setOpen} hits={hits} onQuery={onSearch} />
    </div>
  );
}
