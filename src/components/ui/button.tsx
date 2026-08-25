import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium select-none transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "btn-primary-sheen bg-accent text-accent-fg hover:bg-accent-hover",
        secondary: "bg-surface text-text border border-border hover:bg-surface-hover hover:border-border-strong",
        ghost: "text-muted hover:text-text hover:bg-surface-hover",
        danger: "bg-danger text-white hover:opacity-90",
        outline: "border border-border text-text hover:bg-surface-hover hover:border-border-strong",
      },
      size: {
        sm: "h-7 px-2.5 text-[13px]",
        md: "h-8 px-3 text-[13px]",
        lg: "h-9 px-3.5",
        icon: "size-7",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  loading,
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          <span className={cn("inline-flex items-center gap-1.5", loading && "opacity-0")}>{children}</span>
          {loading ? (
            <LoaderCircle className="absolute size-4 animate-spin" aria-hidden />
          ) : null}
        </>
      )}
    </Comp>
  );
}
