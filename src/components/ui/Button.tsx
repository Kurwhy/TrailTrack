import { Loader2 } from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-moss-500 text-bone font-semibold hover:bg-moss-600 active:bg-moss-700 disabled:bg-moss-100 disabled:text-moss-400",
  secondary:
    "bg-paper text-ink border border-line hover:border-line-strong hover:bg-moss/[0.06] active:bg-moss/[0.09] disabled:text-muted/60",
  ghost:
    "bg-transparent text-muted hover:text-ink hover:bg-moss/[0.06] active:bg-moss/[0.10] disabled:text-muted/50",
  danger:
    "bg-coral text-bone font-semibold hover:bg-coral/90 active:bg-coral/80 disabled:bg-coral/20 disabled:text-coraltext/70",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function buttonStyles(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center rounded-control whitespace-nowrap font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal disabled:cursor-not-allowed disabled:opacity-90",
    variants[variant],
    sizes[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading, className, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={buttonStyles(variant, size, className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
