import { cn } from "@/lib/utils";

export function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-border bg-surface px-1 font-mono text-[10px] font-medium leading-none text-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
