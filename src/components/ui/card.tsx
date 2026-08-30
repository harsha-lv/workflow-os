import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-border bg-surface",
        interactive && "card-interactive",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-desc">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--radius)] border border-border bg-surface/80 px-6 py-10">
      <div className="flex items-center gap-1.5" aria-hidden>
        <span className="size-2.5 rounded-[3px] border border-border bg-bg-elevated" />
        <span className="h-px w-4 bg-border" />
        <span className="size-2.5 rounded-[3px] border border-accent/50 bg-accent/15" />
        <span className="h-px w-4 bg-border" />
        <span className="size-2.5 rounded-[3px] border border-border bg-bg-elevated" />
      </div>
      <h2 className="text-base font-medium">{title}</h2>
      <p className="max-w-lg text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}
