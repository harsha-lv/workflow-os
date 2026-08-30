import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center rounded-full px-1.5 py-px text-[11px] font-medium tracking-[0.02em] capitalize",
  {
    variants: {
      tone: {
        neutral: "bg-surface-hover text-muted",
        accent: "bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-accent",
        success: "bg-[var(--success-bg)] text-success",
        warning: "bg-[var(--warning-bg)] text-warning",
        danger: "bg-[var(--danger-bg)] text-danger",
        info: "bg-[var(--info-bg)] text-info",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "success" || status === "published" || status === "approved" || status === "connected" || status === "confirmed"
      ? "success"
      : status === "failed" || status === "rejected" || status === "error"
        ? "danger"
        : status === "running" || status === "queued" || status === "demo"
          ? "info"
          : status === "waiting" || status === "draft" || status === "warning" || status === "pending" || status === "mocked"
            ? "warning"
            : "neutral";
  const live = status === "running" || status === "queued" || status === "waiting";
  return (
    <Badge
      tone={tone}
      className={cn(live && "status-live", status === "running" || status === "queued" ? "is-running" : status === "waiting" ? "is-waiting" : undefined)}
    >
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
